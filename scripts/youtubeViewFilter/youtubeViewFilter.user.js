// ==UserScript==
// @name        YouTube View Filter
// @description Remove YouTube videos below view threshold
// @version     2.2.0
// @author      trungung
// @match       *://www.youtube.com/*
// @grant       none
// @run-at      document-start
// @namespace   https://github.com/trungung/userscripts
// @homepage    https://github.com/trungung/userscripts/tree/main/scripts/youtubeViewFilter
// @noframes
// @license MIT
// ==/UserScript==

const CONFIG = {
  viewThreshold: 1000, // Minimum view count threshold
  enableLogging: false, // Set to true to enable console logs
  whitelistedChannels: [
    // Add channel names here that should never be filtered
    // Example: "PewDiePie", "MrBeast", "Kurzgesagt"
  ],
};

const logger = {
  log: (msg, ...args) => {
    if (CONFIG.enableLogging) {
      console.log(`[YT-FILTER] ${msg}`, ...args);
    }
  },
};

// --- 1. Parsing Logic ---

function parseViewCount(text) {
  if (!text) return null;
  const clean = text.toLowerCase().replace(/,/g, "");

  // Return -1 to signal Livestreams/Premieres (do not filter)
  if (
    clean.includes("watching") ||
    clean.includes("premiere") ||
    clean.includes("live") ||
    clean.includes("waiting")
  ) {
    return -1;
  }

  if (clean.includes("no views")) return 0;

  // Match number followed strictly by "views"
  // Handles: "10K views", "1.5M views", "300 views"
  const match = clean.match(/(\d+(?:\.\d+)?)\s*([kmb])?\s*views?/);
  if (!match) return null;

  let number = parseFloat(match[1]);
  const multiplier = match[2];

  if (multiplier === "k") number *= 1000;
  else if (multiplier === "m") number *= 1000000;
  else if (multiplier === "b") number *= 1000000000;

  return Math.floor(number);
}

function getChannelName(node) {
  // Selectors for Home, Search, and Sidebar (Compact)
  const el = node.querySelector(
    '.ytd-channel-name a, .yt-core-attributed-string__link, a[href^="/@"], .ytd-compact-video-renderer .ytd-channel-name'
  );
  return el ? el.textContent.trim() : "Unknown Channel";
}

function getVideoTitle(node) {
  const selector =
    "#video-title, #video-title-link, .yt-lockup-metadata-view-model__title, .shortsLockupViewModelHostMetadataTitle, h3";
  const el = node.querySelector(selector);
  return el ? el.title || el.textContent.trim() : "Unknown Title";
}

// --- 2. Core Processing ---

function processVideo(node) {
  // If the node is hidden by YouTube or empty, skip
  if (node.offsetParent === null) return;

  const allText = node.innerText || "";
  const viewCount = parseViewCount(allText);

  // If null, text hasn't loaded yet or it's a Mix/Playlist; retry next cycle
  if (viewCount === null) return;

  // If -1, it's a livestream; ignore it
  if (viewCount === -1) {
    node.dataset.ytFilterState = "live-stream";
    return;
  }

  // Prevent reprocessing same state to save performance
  const videoUrl =
    node.querySelector("a#thumbnail, a.ytd-thumbnail")?.href || "unknown";
  const stateSignature = `${videoUrl}-${viewCount}`;

  if (node.dataset.ytFilterState === stateSignature) return;
  node.dataset.ytFilterState = stateSignature;

  // Check Whitelist
  const channelName = getChannelName(node);
  if (
    CONFIG.whitelistedChannels.some((c) =>
      channelName.toLowerCase().includes(c.toLowerCase())
    )
  ) {
    return;
  }

  // Determine container (Fix for Shorts and Sidebar Layouts)
  let container = node;

  // If it's a Short in a grid, find the renderer
  if (node.tagName.toLowerCase().includes("shorts")) {
    container = node.closest("ytd-rich-item-renderer") || node;
  }

  // Apply Filter
  if (viewCount < CONFIG.viewThreshold) {
    const videoTitle = getVideoTitle(node);
    container.style.display = "none";
    logger.log(`Removed: ${viewCount} | "${videoTitle}" | ${channelName}`);
  } else {
    // Ensure it is visible if it meets criteria (in case it was hidden previously)
    container.style.display = "";
  }
}

function scan() {
  const selector = [
    "ytd-rich-item-renderer", // Home Feed
    "ytd-grid-video-renderer", // Channel Videos
    "ytd-compact-video-renderer", // Sidebar (Classic)
    "ytd-video-renderer", // Search Results
    "ytm-shorts-lockup-view-model", // Shorts
    "yt-lockup-view-model", // New UI (Sidebar & Home Mixed)
  ].join(",");

  const nodes = document.querySelectorAll(selector);
  nodes.forEach(processVideo);
}

// --- 3. Initialization & Events ---

function init() {
  logger.log("Started");

  // Watch for new elements
  const observer = new MutationObserver(() => scan());
  observer.observe(document.body, { childList: true, subtree: true });

  // Fallback interval (helps with slow sidebar loads)
  setInterval(scan, 2000);
}

// Handle Single Page Navigation (SPA)
window.addEventListener("yt-navigate-finish", () => {
  // Clear states so we re-scan properly on new page
  const allNodes = document.querySelectorAll("[data-yt-filter-state]");
  allNodes.forEach((n) => delete n.dataset.ytFilterState);
  scan();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
