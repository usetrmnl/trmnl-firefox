# TRMNL Firefox Extension

A Firefox extension that displays images from TRMNL's API in your new tab page with automatic refresh functionality. **Note**: requires a TRMNL account with a physical device or [BYOD](https://shop.usetrmnl.com/products/byod) license.

## Features

- Displays TRMNL images in new tab pages
- Automatic image refresh with configurable intervals
- Device selection for users with multiple TRMNL devices
- Automatic login flow - no manual API key entry required
- Developer tools panel for environment switching
- Offline-friendly caching
- Logout & reset functionality to clear all extension data

## Installation

### From Source (Development)

1. Clone this repository:
   ```bash
   git clone git@github.com:usetrmnl/trmnl-firefox.git
   ```
   
2. Open Firefox and navigate to `about:debugging`

3. Click "This Firefox" in the left sidebar

4. Click "Load Temporary Add-on..." and select the `manifest.json` file from the `trmnl-firefox/code` directory

### Production Installation

This extension is designed for Firefox and uses Firefox-specific APIs. For production use, the extension would need to be signed by Mozilla and distributed through Firefox Add-ons.

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

The extension is built specifically for Firefox using:
- Vanilla JavaScript with Firefox WebExtensions APIs
- HTML/CSS for UI components
- Native Firefox storage and messaging APIs
- TRMNL API integration

### Key Files

- `manifest.json` - Firefox extension configuration (Manifest V2)
- `newtab.js/.html` - New tab page implementation
- `popup.js/.html` - Settings popup accessible from toolbar
- `background.js` - Background script for API calls, login flow, and data management
- `dashboard-content.js` - Content script for TRMNL website integration and login detection
- `devtools.js/.html` - Developer tools panel integration
- `panel.js/.html` - Developer tools panel implementation
- `styles.css` - Styling for new tab and popup interfaces

### Firefox-Specific Features

- Uses `browser.*` APIs natively (no polyfill required)
- Leverages Firefox's `chrome_url_overrides` for new tab functionality
- Integrated with Firefox Developer Tools
- Uses Firefox's persistent background script model
- Native Firefox storage management with automatic logout detection
- Automatic login detection via content scripts across TRMNL domains

### Login Flow Implementation

- **Automatic Device Fetching**: Connects to `https://usetrmnl.com/devices.json` to retrieve user devices and API keys
- **Login Detection**: Content script monitors TRMNL website for successful authentication
- **Seamless Integration**: No manual API key copying required
- **Fallback Support**: Manual API key entry still available for advanced users
- **Cross-Domain Support**: Works with all TRMNL subdomains and development environments

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please ensure all changes maintain Firefox compatibility and follow Firefox extension best practices.

## License

[MIT](https://choosealicense.com/licenses/mit/)