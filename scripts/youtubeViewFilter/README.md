# YouTube View Filter 🎯

Filter out YouTube videos that fall below a configurable view count threshold, helping you focus on more established content.

## ✨ Features

- **Configurable view threshold** - Set your minimum view count (default: 1000)
- **Channel whitelist** - Never filter videos from your favorite creators
- **Works across YouTube** - Filters on home page, search results, and recommendations
- **Real-time filtering** - Automatically processes new videos as they load
- **Debug logging** - Optional console logging to see what's being filtered
- **Performance optimized** - Efficient DOM monitoring and processing

## 📦 Installation

### Quick Install

1. Make sure you have [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) installed
2. Click here to install: [youtubeViewFilter.user.js](https://raw.githubusercontent.com/trungung/userscripts/main/scripts/youtubeViewFilter/youtubeViewFilter.user.js)
3. Click "Install" when your userscript manager opens
4. Refresh any open YouTube pages

### Manual Install

1. Copy the contents of `youtubeViewFilter.user.js`
2. Open your userscript manager dashboard
3. Create a new script
4. Paste the code and save
5. Refresh YouTube

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

The script:

1. Monitors YouTube pages for video elements
2. Extracts view counts from video metadata
3. Compares against your threshold
4. Hides videos below the threshold (unless whitelisted)
5. Continues monitoring as new content loads

## 🐛 Troubleshooting

### Videos aren't being filtered

1. Check that the script is enabled in your userscript manager
2. Try refreshing the page (Ctrl/Cmd + R)
3. Enable logging and check the browser console (F12) for debug info
4. Make sure your threshold isn't set to 0

### Script not working after YouTube update

YouTube frequently changes their layout. If the script stops working:

1. Check for updates to this script
2. Open an [issue](https://github.com/trungung/userscripts/issues) with details
3. Include console errors if any (F12 → Console tab)

### Whitelisted channels still being filtered

- Channel names are case-insensitive but must match partially
- Try using just part of the channel name
- Check spelling and whitespace

## 📝 Console Logging

When `enableLogging` is enabled, you'll see:

- `✅ Loaded` - Script initialized successfully
- `🔍 Processing` - Each video being checked
- `🗑️ Removed` - Videos that were filtered (title, channel, view count)
- `ℹ️ Info` - General status messages
- `⚠️ Warnings` - Potential issues

## 🔧 Technical Details

**Supported YouTube layouts:**

- Home page feed
- Search results
- Shorts feed
- Watch page recommendations
- Channel pages

**View count parsing:**

- Handles "1.2K", "500K", "2M" formats
- Handles "1,234 views" format
- Handles international number formats

## 📄 License

MIT License - See [LICENSE](../../LICENSE) for details

## 🤝 Contributing

Found a bug or have a suggestion? Please [open an issue](https://github.com/trungung/userscripts/issues)!

---

**Note:** This script modifies your YouTube browsing experience. Videos are hidden from view but not permanently deleted.
