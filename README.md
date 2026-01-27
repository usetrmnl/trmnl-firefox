# TRMNL Firefox Extension

A Firefox-only browser extension that displays images from your TRMNL device in new tab pages with automatic refresh functionality.

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

4. Click "Load Temporary Add-on..." and select the `manifest.json` file from the `code` directory

### Production Package

To create a packaged extension for distribution:

```bash
ruby pack.rb
```

This will create `trmnl-firefox.xpi` which can be installed in Firefox.

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

## Contributing

Pull requests are welcome. Please ensure all changes maintain Firefox compatibility and follow Firefox extension best practices.

## License

[MIT](https://choosealicense.com/licenses/mit/)
