# YouTube View Filter 🎯

Filter out YouTube videos that fall below a configurable view count threshold, helping you focus on more established content.

> **Version:** 1.0.0  
> **Last Tested:** October 31, 2025  
> **Status:** ✅ Working  
> **Language Support:** 🇺🇸 English only (other languages coming soon)

## ✨ Features

- **Configurable view threshold** - Set your minimum view count (default: 1000)
- **Channel whitelist** - Never filter videos from your favorite creators
- **Works across YouTube** - Filters on home page, search results, and recommendations
- **Real-time filtering** - Automatically processes new videos as they load
- **Debug logging** - Optional console logging to see what's being filtered
- **Performance optimized** - Efficient DOM monitoring and processing

## ⚙️ Configuration

Edit the script in your userscript manager to customize these settings:

```javascript
const CONFIG = {
  viewThreshold: 1000, // Minimum view count (videos below this are hidden)
  enableLogging: true, // Show debug info in console (true/false)
  whitelistedChannels: [
    // Channels that should never be filtered
    // Add channel names here
    // Example: "PewDiePie", "MrBeast", "Kurzgesagt"
  ],
};
```

### Configuration Examples

**Only show videos with 10K+ views:**

```javascript
viewThreshold: 10000,
```

**Whitelist your favorite channels:**

```javascript
whitelistedChannels: [
  "Veritasium",
  "3Blue1Brown",
  "Kurzgesagt",
],
```

**Disable logging:**

```javascript
enableLogging: false,
```

## 🎬 How It Works

**Technical Overview:**

1. **Monitors the DOM** - Uses `MutationObserver` to watch for new video elements added to the page
2. **Targets video containers** - Looks for specific YouTube elements: `ytd-rich-item-renderer`, `ytd-video-renderer`, etc.
3. **Extracts view count** - Searches `aria-label` attributes for view count data (e.g., "Video Title - 70K views - Channel")
4. **Parses with regex** - Uses pattern matching to extract numbers like "70K", "1.2M", "169 watching" from aria-labels
5. **Compares to threshold** - If view count < your configured threshold, marks video for removal
6. **Checks whitelist** - Skips filtering if channel is in your whitelist
7. **Hides filtered videos** - Sets `display: none` on video elements that don't meet criteria
8. **Runs on navigation** - Re-processes videos when you navigate to new YouTube pages (it's a Single Page App)

**Result:** Low-view videos disappear from your feed in real-time as the page loads.

## 📝 Console Logging

When `enableLogging` is enabled, you'll see:

- `✅ Loaded` - Script initialized successfully
- `🔍 Processing` - Each video being checked
- `🗑️ Removed` - Videos that were filtered (title, channel, view count)
- `ℹ️ Info` - General status messages
- `⚠️ Warnings` - Potential issues

## 📄 License

MIT License - See [LICENSE](../../LICENSE) for details

## 🤝 Contributing

Found a bug or have a suggestion? Please [open an issue](https://github.com/trungung/userscripts/issues)!

---

**Note:** This script modifies your YouTube browsing experience. Videos are hidden from view but not permanently deleted.
