# X-Proxy Icon Assets

## Overview

This directory contains all the visual assets for the X-Proxy Chrome extension. The icons follow Apple's design principles with a clean, minimalist aesthetic that provides clear visual feedback for different proxy states.

## Icon Design Philosophy

- **Minimalist**: Simple geometric shapes with clear meaning
- **Consistent**: Unified visual language across all states
- **Accessible**: High contrast for visibility at all sizes
- **Professional**: Modern gradient design with attention to detail

## Icon States

### Active State (`icon-active-*.png`)
- **Color**: Blue gradient (#007AFF to #0051D5)
- **Usage**: When proxy is connected and working
- **Visual**: Full opacity connections with bright nodes

### Inactive State (`icon-inactive-*.png`)
- **Color**: Gray gradient (#8E8E93 to #636366)
- **Usage**: When proxy is disconnected or disabled
- **Visual**: Reduced opacity connections with muted colors

### Error State (`icon-error-*.png`)
- **Color**: Red gradient (#FF453A to #FF3B30)
- **Usage**: When there's a connection error or authentication failure
- **Visual**: Broken connections with error indicator

## Available Sizes

All icons are available in the following sizes required by Chrome:
- **16x16**: Toolbar icon (small)
- **32x32**: Toolbar icon (2x for high DPI)
- **48x48**: Extensions page
- **128x128**: Chrome Web Store and installation dialog

## File Structure

```
icons/
├── SVG Sources (Scalable)
│   ├── proxy-icon-active.svg    # Active state master
│   ├── proxy-icon-inactive.svg  # Inactive state master
│   └── proxy-icon-error.svg     # Error state master
│
├── PNG Exports (Chrome Extension)
│   ├── icon-16.png              # Default icon 16x16
│   ├── icon-32.png              # Default icon 32x32
│   ├── icon-48.png              # Default icon 48x48
│   ├── icon-128.png             # Default icon 128x128
│   │
│   ├── icon-active-16.png       # Active state 16x16
│   ├── icon-active-32.png       # Active state 32x32
│   ├── icon-active-48.png       # Active state 48x48
│   ├── icon-active-128.png      # Active state 128x128
│   │
│   ├── icon-inactive-16.png     # Inactive state 16x16
│   ├── icon-inactive-32.png     # Inactive state 32x32
│   ├── icon-inactive-48.png     # Inactive state 48x48
│   ├── icon-inactive-128.png    # Inactive state 128x128
│   │
│   ├── icon-error-16.png        # Error state 16x16
│   ├── icon-error-32.png        # Error state 32x32
│   ├── icon-error-48.png        # Error state 48x48
│   └── icon-error-128.png       # Error state 128x128
│
└── README.md                     # This file
```

## Generating Icons

Icons are generated from SVG sources using the Sharp library. To regenerate all PNG exports:

```bash
npm run generate-icons
```

This will:
1. Read all SVG source files
2. Generate PNG exports in all required sizes
3. Create default icons for the Chrome manifest

## Usage in Extension

### In Manifest (manifest.json)
```json
{
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

### Dynamic Icon Updates (background.js)
```javascript
// Set active state
chrome.action.setIcon({
  path: {
    "16": "icons/icon-active-16.png",
    "32": "icons/icon-active-32.png",
    "48": "icons/icon-active-48.png",
    "128": "icons/icon-active-128.png"
  }
});

// Set inactive state
chrome.action.setIcon({
  path: {
    "16": "icons/icon-inactive-16.png",
    "32": "icons/icon-inactive-32.png",
    "48": "icons/icon-inactive-48.png",
    "128": "icons/icon-inactive-128.png"
  }
});

// Set error state
chrome.action.setIcon({
  path: {
    "16": "icons/icon-error-16.png",
    "32": "icons/icon-error-32.png",
    "48": "icons/icon-error-48.png",
    "128": "icons/icon-error-128.png"
  }
});
```

## Design Guidelines

When modifying or creating new icons:

1. **Maintain Consistency**: Use the same visual language and style
2. **Test at All Sizes**: Ensure icons are clear at 16x16 and detailed at 128x128
3. **Consider Dark Mode**: Icons should work on both light and dark backgrounds
4. **Use Standard Colors**: 
   - Active: #007AFF (Apple Blue)
   - Inactive: #8E8E93 (System Gray)
   - Error: #FF3B30 (Apple Red)
   - Success: #34C759 (Apple Green)

## License

These icons are part of the X-Proxy Chrome extension and follow the project's MIT license.
