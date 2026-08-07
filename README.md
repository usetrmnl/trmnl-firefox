# TRMNL Firefox Extension

A Firefox browser extension that displays images from your TRMNL device in new tab pages with automatic refresh functionality.

Install from the official Add-ons library here:
[https://addons.mozilla.org/en-US/firefox/addon/trmnl-new-tab-display/](https://addons.mozilla.org/en-US/firefox/addon/trmnl-new-tab-display/)

## About

This extension brings TRMNL's calm, distraction-free environment directly to your Firefox new tab page. It connects to your TRMNL account and displays the current screen from your selected device, automatically refreshing at configurable intervals.

**Note**: This extension was originally designed for Chrome but adopts [these changes](https://github.com/usetrmnl/trmnl-chrome/pull/5) to work with Firefox-native APIs.

## Requirements

- Firefox browser
- TRMNL account with a physical device or [BYOD](https://shop.usetrmnl.com/products/byod) license

## Features

- 🖼️ Display TRMNL images in new tab pages
- 🔄 Automatic image refresh with configurable intervals
- 📱 Device selection for users with multiple TRMNL devices
- 🔑 Automatic login flow - no manual API key entry required
- 🛠️ Developer tools panel for environment switching
- 💾 Offline-friendly caching
- 🌙 Dark mode support
- 🚪 Logout & reset functionality to clear all extension data

## Installation

### Development Installation

1. Clone this repository:
   ```bash
   git clone git@github.com:usetrmnl/trmnl-firefox.git
   cd trmnl-firefox
   ```

2. Open Firefox and navigate to `about:debugging`

3. Click "This Firefox" in the left sidebar

4. Click "Load Temporary Add-on..." and select the `manifest.json` file from the repository root

   > **Note:** Temporary add-ons are removed when Firefox restarts. Reload from `about:debugging` after each restart while developing.

### Production Package

To create a packaged extension for distribution:

```bash
ruby pack.rb
```

This creates `trmnl-firefox.xpi`. Installing an unsigned `.xpi` in regular Firefox requires Mozilla signing — use the temporary load steps above for local testing instead.

### BYOS (Bring Your Own Server)

The extension ships pointed at [trmnl.com](https://trmnl.com). To use it with a self-hosted [BYOS](https://docs.usetrmnl.com/go/diy/byos) server (e.g. [Terminus](https://github.com/usetrmnl/byos_hanami)), replace the production host with your server URL and install your own build.

1. **Set your server URL** — replace `https://trmnl.com` with your BYOS server URL (no trailing slash) in:

   - `config.js` — `HOSTS.production`
   - `manifest.json` — replace `https://trmnl.com/*` with your server in `host_permissions` and `content_scripts[].matches`

   For example, if your server is `https://terminus.example.com`:

   ```js
   // config.js
   const HOSTS = {
     development: "http://localhost:3000",
     production: "https://terminus.example.com",
   };
   ```

   ```json
   // manifest.json
   "host_permissions": ["http://localhost:3000/*", "https://terminus.example.com/*"],
   "content_scripts": [
     {
       "matches": ["https://terminus.example.com/*", "http://localhost:3000/*"],
       "js": ["dashboard-content.js"]
     }
   ]
   ```

2. **Load the extension** — open `about:debugging`, click **This Firefox**, then **Load Temporary Add-on…** and select `manifest.json` from the repository root.

3. **Log in** — open a new tab and complete login on your BYOS server. The extension will use it for device listing and screen images by default.

   > **Note:** The Mozilla Add-ons listing always points at trmnl.com. BYOS requires a custom build loaded as a temporary add-on (or a signed `.xpi` from Mozilla's developer hub). If you previously used the official build, use **Logout & Reset** before switching to your BYOS build. You'll need to reload the temporary add-on after restarting Firefox.

## Setup

1. After installation, open a new tab or click the TRMNL extension icon
2. Click "Login to TRMNL" to open the TRMNL website in a new tab
3. Complete your login on the TRMNL website
4. The extension will automatically detect your login and fetch your devices
5. Your TRMNL device screen will appear in new tabs automatically

## Usage

### First Time Setup
1. **Login**: Click "Login to TRMNL" when prompted
2. **Authenticate**: Complete login on the TRMNL website
3. **Automatic Setup**: Extension automatically fetches your devices and API keys

### Daily Use
- **New Tab**: Open a new tab to see the current TRMNL image
- **Settings**: Click the TRMNL toolbar icon to access device settings and refresh options
- **Device Selection**: Choose between multiple devices if you have them
- **Manual Refresh**: Use the "Refresh Now" button in settings or on the new tab page

### Advanced Options
- **Manual API Key**: Advanced users can still enter API keys manually via the settings
- **Logout**: Clear all extension data and reset to initial state:
  - Click the TRMNL toolbar icon and use the "Logout & Reset" button, or
  - Use the "Logout" button in the bottom overlay of any new tab page
- **Developer Mode**: Use the Firefox Developer Tools to access the TRMNL panel for environment switching

## Development

The extension uses:
- Firefox WebExtensions APIs (Manifest V3)
- Vanilla JavaScript
- Native Firefox storage and messaging APIs
- CSS with dark mode support

Server URLs are centralized in `config.js`.

## Contributing

Pull requests are welcome. Please ensure all changes maintain Firefox compatibility and follow Firefox extension best practices.

## License

[MIT](https://choosealicense.com/licenses/mit/)
