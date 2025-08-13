# X-Proxy Technical Documentation

## Overview
X-Proxy is a simple and reliable Chrome extension for proxy management. It provides basic proxy switching functionality with support for HTTP/HTTPS and SOCKS5 proxies.

## Architecture

### Core Components

1. **Background Service Worker** (`background.js`)
   - Handles proxy configuration via Chrome proxy API
   - Manages profile storage and retrieval
   - Provides communication interface for UI components

2. **Popup Interface** (`popup.html`, `popup.js`)
   - Quick access proxy switching
   - Profile activation/deactivation
   - Real-time status display

3. **Options Page** (`options.html`, `options.js`)
   - Full profile management (create, edit, duplicate, delete)
   - Comprehensive proxy configuration interface
   - About section with feature information

## Supported Proxy Types

- **HTTP/HTTPS**: Combined as single "http" type for simplicity
- **SOCKS5**: Standard SOCKS5 proxy support
- **System Proxy**: Direct connection (no proxy)

## Key Features

### Profile Management
- Create new proxy profiles with name, type, host, and port
- Edit existing profiles with real-time validation
- Duplicate profiles for easy configuration
- Delete unused profiles
- Color-coded profiles for easy identification

### Chrome Integration
- Chrome Manifest V3 compliance
- Seamless proxy API integration
- Real-time badge updates showing active status
- Proper error handling and user feedback

### Data Storage
- Local storage using `chrome.storage.local`
- Persistent profile data across browser sessions
- Automatic data migration and normalization
- Stale reference cleanup

## Technical Implementation

### Storage Structure
```javascript
{
  "x-proxy-data": {
    "version": 1,
    "profiles": [
      {
        "id": "unique-id",
        "name": "Profile Name",
        "color": "#007AFF",
        "config": {
          "type": "http", // or "socks5"
          "host": "proxy.example.com",
          "port": 8080
        },
        "createdAt": "2025-08-13T...",
        "updatedAt": "2025-08-13T..."
      }
    ],
    "activeProfileId": "unique-id" // or undefined
  }
}
```

### Chrome Proxy API Usage
```javascript
// HTTP proxy activation
chrome.proxy.settings.set({
  value: {
    mode: 'fixed_servers',
    rules: {
      singleProxy: {
        scheme: 'http',
        host: 'proxy.example.com',
        port: 8080
      }
    }
  }
});

// System proxy (deactivation)  
chrome.proxy.settings.set({
  value: {
    mode: 'system'
  }
});
```

## Build Process

The extension uses Vite for building with separate configurations:

1. **Background Script**: `npm run build:background`
2. **Popup**: `npm run build:popup` 
3. **Options**: `npm run build:options`
4. **All Components**: `npm run build`

## Testing

Comprehensive test suite with 48+ test cases covering:
- Unit tests for proxy configurations
- Integration tests for Chrome API interactions
- End-to-end tests for user workflows
- Bug regression prevention

## Manifest V3 Permissions

Required permissions:
- `proxy`: Configure browser proxy settings
- `storage`: Store profile data locally
- `action`: Update extension badge

## Deployment

1. Build production version: `npm run build`
2. Load `dist` folder in Chrome Developer Mode
3. Test all functionality
4. Package for distribution

## Performance Characteristics

- **Memory Usage**: < 10MB
- **CPU Usage**: Minimal when idle
- **Startup Time**: < 50ms
- **Proxy Switch Time**: < 100ms
