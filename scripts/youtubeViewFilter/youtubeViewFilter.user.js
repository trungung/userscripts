// ==UserScript==
// @name        YouTube View Filter
// @description Remove YouTube videos below view threshold
// @version     2.4.0
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
}

const HIDDEN_CLASS = "yt-view-filter-hidden";

const SELECTORS = {
  videoCards: [
    "ytd-rich-item-renderer",        // Home feed
    "ytd-grid-video-renderer",       // Channel videos
    "ytd-compact-video-renderer",    // Sidebar
    "ytd-video-renderer",            // Search results
    "ytd-reel-item-renderer",        // Shorts shelf / reels
    "ytm-shorts-lockup-view-model",  // Mobile shorts
    "yt-lockup-view-model",          // New YouTube UI
  ].join(","),

  metadataText: [
    ".ytContentMetadataViewModelMetadataText", // New UI: visible "42K", aria-label "42 thousand views"
    "#metadata-line span",                     // Older UI
    ".ytd-video-meta-block span",
    ".ytd-grid-video-renderer #metadata-line span",
    ".ytd-compact-video-renderer #metadata-line span",
  ].join(","),

  title: [
    "a.ytLockupMetadataViewModelTitle",
    ".ytLockupMetadataViewModelTitle",
    "#video-title",
    "#video-title-link",
    ".yt-lockup-metadata-view-model__title",
    ".shortsLockupViewModelHostMetadataTitle",
    "h3",
  ].join(","),

  channel: [
    ".ytd-channel-name a",
    "a[href^='/@']",
    ".yt-core-attributed-string__link",
    ".ytAttributedStringLink[href^='/@']",
  ].join(","),
};

const logger = {
  log: (msg, ...args) => {
    if (CONFIG.enableLogging) {
      console.log(`[YT-FILTER] ${msg}`, ...args);
    }
  },
};

function ensureStyle() {
  if (document.getElementById("yt-view-filter-style")) return;

  const style = document.createElement("style");
  style.id = "yt-view-filter-style";
  style.textContent = `
    .${HIDDEN_CLASS} {
      display: none !important;
    }
  `;

  document.documentElement.appendChild(style);
}

function normalizeText(text) {
  return (text || "")
    .replace(/\u00a0/g, " ")
    .replace(/,/g, "")
    .trim()
    .toLowerCase();
}

function parseViewCount(text, options = {}) {
  const { allowBare = false, allowLiveState = false } = options;
  const clean = normalizeText(text);
  if (!clean) return null;

  // Livestream / premiere metadata usually uses "watching", "waiting", or "premiere".
  // Do NOT treat the word "live" alone as livestream, because the new UI may show
  // a channel-avatar LIVE badge even on normal videos.
  if (
    allowLiveState &&
    /\b(watching|watching now|waiting|premiere|premieres|premiered)\b/.test(clean)
  ) {
    return -1;
  }

  if (/\bno views?\b/.test(clean)) return 0;

  // Handles:
  // "50 views"
  // "42K views"
  // "5.6 thousand views"
  // "158 thousand views"
  // "1.2 million views"
  let match = clean.match(
    /(\d+(?:\.\d+)?)\s*(k|m|b|thousand|million|billion)?\s*views?\b/
  );

  // New UI fallback: visible metadata span may be just "42K" or "50".
  // Only use this for known metadata nodes, never for the whole card text.
  if (!match && allowBare) {
    match =
      clean.match(/^(\d+(?:\.\d+)?)\s*(k|m|b)$/) ||
      clean.match(/^(\d+)$/);
  }

  if (!match) return null;

  let number = parseFloat(match[1]);
  const multiplier = match[2];

  if (multiplier === "k" || multiplier === "thousand") {
    number *= 1_000;
  } else if (multiplier === "m" || multiplier === "million") {
    number *= 1_000_000;
  } else if (multiplier === "b" || multiplier === "billion") {
    number *= 1_000_000_000;
  }

  return Math.floor(number);
}

function getViewCount(node) {
  const candidates = [];

  // Best source for the new UI:
  // .ytContentMetadataViewModelMetadataText with aria-label="42 thousand views"
  for (const el of node.querySelectorAll(SELECTORS.metadataText)) {
    const aria = el.getAttribute("aria-label");
    const text = el.textContent;

    if (aria) {
      candidates.push({
        text: aria,
        allowBare: false,
        allowLiveState: true,
      });
    }

    if (text) {
      candidates.push({
        text,
        allowBare: true,
        allowLiveState: true,
      });
    }
  }

  // Generic aria-label fallback.
  // This catches new UI elements where the visible text is compact but aria-label
  // contains "thousand views", "million views", etc.
  for (const el of node.querySelectorAll("[aria-label]")) {
    const label = el.getAttribute("aria-label") || "";
    const clean = normalizeText(label);

    if (
      clean.includes("view") ||
      clean.includes("watching") ||
      clean.includes("waiting") ||
      clean.includes("premiere")
    ) {
      candidates.push({
        text: label,
        allowBare: false,
        allowLiveState: true,
      });
    }
  }

  // Old UI fallback.
  // Do not allow bare numbers here, otherwise titles/durations can be misread.
  candidates.push({
    text: node.innerText || node.textContent || "",
    allowBare: false,
    allowLiveState: false,
  });

  for (const candidate of candidates) {
    const parsed = parseViewCount(candidate.text, {
      allowBare: candidate.allowBare,
      allowLiveState: candidate.allowLiveState,
    });

    if (parsed !== null) return parsed;
  }

  return null;
}

function getChannelName(node) {
  const el = node.querySelector(SELECTORS.channel);
  if (el && el.textContent.trim()) {
    return el.textContent.trim();
  }

  // New avatar label examples:
  // "Go to channel BWF TV"
  // "Tap to watch live, Viva La Dirt League channel"
  const labelEl = [...node.querySelectorAll("[aria-label]")].find((candidate) => {
    const label = candidate.getAttribute("aria-label") || "";
    return /go to channel|channel$/i.test(label);
  });

  if (labelEl) {
    const label = labelEl.getAttribute("aria-label") || "";

    return label
      .replace(/^go to channel\s+/i, "")
      .replace(/^tap to watch live,\s*/i, "")
      .replace(/\s+channel$/i, "")
      .trim();
  }

  return "Unknown Channel";
}

function getVideoTitle(node) {
  const el = node.querySelector(SELECTORS.title);
  return el ? el.title || el.textContent.trim() : "Unknown Title";
}

function getVideoUrl(node) {
  const el = node.querySelector(
    [
      "a[href*='/watch']",
      "a[href*='/shorts/']",
      "a#thumbnail",
      "a.ytd-thumbnail",
      "a.ytLockupViewModelContentImage",
      "a.ytLockupMetadataViewModelTitle",
    ].join(",")
  );

  if (!el) return "unknown";

  try {
    const url = new URL(el.href, location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return el.href || "unknown";
  }
}

function getContainer(node) {
  return (
    node.closest("ytd-rich-item-renderer") ||
    node.closest("ytd-video-renderer") ||
    node.closest("ytd-compact-video-renderer") ||
    node.closest("ytd-grid-video-renderer") ||
    node.closest("ytd-reel-item-renderer") ||
    node.closest("ytm-shorts-lockup-view-model") ||
    node.closest("yt-lockup-view-model") ||
    node
  );
}

function isWhitelisted(channelName) {
  const normalized = channelName.toLowerCase();

  return CONFIG.whitelistedChannels.some((channel) =>
    normalized.includes(channel.toLowerCase())
  );
}

function processVideo(node) {
  if (!node || !node.isConnected) return;

  const container = getContainer(node);
  if (!container) return;

  const viewCount = getViewCount(container);

  // Text may not be loaded yet.
  if (viewCount === null) return;

  const videoUrl = getVideoUrl(container);
  const stateSignature = `${videoUrl}-${viewCount}-${CONFIG.viewThreshold}`;

  if (container.dataset.ytFilterState === stateSignature) return;
  container.dataset.ytFilterState = stateSignature;

  if (viewCount === -1) {
    container.classList.remove(HIDDEN_CLASS);
    logger.log(`Ignored live/premiere: ${getVideoTitle(container)}`);
    return;
  }

  const channelName = getChannelName(container);

  if (isWhitelisted(channelName)) {
    container.classList.remove(HIDDEN_CLASS);
    return;
  }

  if (viewCount < CONFIG.viewThreshold) {
    const videoTitle = getVideoTitle(container);
    container.classList.add(HIDDEN_CLASS);
    logger.log(`Removed: ${viewCount} | "${videoTitle}" | ${channelName}`);
  } else {
    container.classList.remove(HIDDEN_CLASS);
  }
}

let scanScheduled = false;

function scheduleScan() {
  if (scanScheduled) return;

  scanScheduled = true;

  requestAnimationFrame(() => {
    scanScheduled = false;
    scan();
  });
}

function scan() {
  ensureStyle();

  const nodes = document.querySelectorAll(SELECTORS.videoCards);
  nodes.forEach(processVideo);
}

function clearStates() {
  document
    .querySelectorAll("[data-yt-filter-state]")
    .forEach((node) => delete node.dataset.ytFilterState);
}

function init() {
  ensureStyle();
  logger.log("Started");

  const observer = new MutationObserver(scheduleScan);

  const startObserving = () => {
    if (!document.body) {
      requestAnimationFrame(startObserving);
      return;
    }

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    scan();

    // Fallback for slow metadata/sidebar loads.
    setInterval(scan, 2000);
  };

  startObserving();
}

window.addEventListener("yt-navigate-finish", () => {
  clearStates();
  scan();
});

window.addEventListener("yt-page-data-updated", () => {
  clearStates();
  scan();
});

window.addEventListener("popstate", () => {
  clearStates();
  scan();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}