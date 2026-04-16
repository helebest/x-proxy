# Chrome Web Store Listing

## Extension Name
X-Proxy - Simple Proxy Switcher

## Short Description (132 characters max)
Simple and reliable proxy switcher for Chrome with HTTP/HTTPS, SOCKS5, and PAC file support. Easy profile management and quick switching.

## Detailed Description

### 🚀 Simple and Reliable Proxy Switching for Chrome

X-Proxy is a clean, lightweight proxy switcher that makes managing your proxy connections simple and straightforward. Perfect for users who need reliable proxy switching without complexity.

### ✨ Key Features

**🔄 Core Proxy Support**
• HTTP/HTTPS proxy support (combined as one type for simplicity)
• SOCKS5 proxy support
• PAC (Proxy Auto-Configuration) file support via URL or local file path
• System proxy mode (direct connection)

**⚡ Easy to Use**
• One-click proxy switching from toolbar
• Clean, intuitive interface
• Simple profile management
• Real-time connection status

**📝 Profile Management**
• Create and save proxy profiles
• Edit existing configurations
• Duplicate profiles for easy setup
• Delete unused profiles
• Color-coded organization

**🎯 Domain Routing (New in v1.2.0)**
• Configure specific domains to use proxy
• Whitelist mode - only listed sites use proxy
• Supports wildcard patterns (*.google.com)
• Automatically reactivates when editing active profiles
• Perfect for selective proxy usage

**🎨 Clean Interface**
• Simple, modern design
• Consistent styling throughout
• Easy-to-understand controls
• Clear status indicators

### 💡 Perfect For

• **Basic Proxy Needs**: Simple HTTP/SOCKS5 proxy switching or PAC file configuration
• **Developers**: Test applications with different proxy configurations
• **Privacy Users**: Route traffic through trusted proxies
• **Network Testing**: Quickly switch between different proxy servers

### 🛡️ Privacy First

X-Proxy respects your privacy:
• No data collection or tracking
• All settings stored locally on your device
• No external connections except through your configured proxies
• Minimal permissions requested

### 📱 How to Use

1. Click the X-Proxy icon in your toolbar
2. Click "Add Profile" to create a new proxy
3. Enter your proxy details (name, type, host, port)
4. Click "Save" to add the profile
5. Click any profile to activate it
6. Click "System Proxy" to disable proxy

### 🌟 Why Choose X-Proxy?

✅ **Simple**: Clean interface, no unnecessary complexity
✅ **Fast**: Quick switching with minimal overhead
✅ **Reliable**: Stable Chrome API integration
✅ **Lightweight**: Small footprint, fast loading
✅ **Free**: No subscriptions or hidden costs

### 📊 Technical Details

• Chrome Manifest V3 compliant
• Supports Chrome 88+
• Lightweight (< 1MB installed)
• TypeScript implementation
• Comprehensive testing

### 🔄 Current Version

**Version 1.5.1** - Visual Enhancements
• Dynamic toolbar icon color matching active profile
• Dark mode UI improvements
• Security upgrade (Vite v6.4.2)

**Previous Updates:**
• v1.5.0: PAC (Proxy Auto-Configuration) file support
• v1.4.2: Proxy authentication (username/password)
• v1.4.0: Import/Export profiles as JSON
• v1.3.1: Fixed domain validation for blacklist mode (IPv4/IPv6/localhost support)
• v1.3.0: Whitelist/Blacklist routing mode selection
• v1.2.0: Domain-based routing rules (whitelist mode)
• v1.0.0: Initial stable release with HTTP/HTTPS and SOCKS5 support

### 📝 Permissions Explained

X-Proxy requires minimal permissions to function:
• **proxy**: To configure browser proxy settings
• **storage**: To save your proxy profiles locally
• **webRequest**: To intercept proxy authentication challenges (HTTP 407) and provide credentials automatically
• **webRequestAuthProvider**: To respond to proxy server authentication requests using the username/password saved in your proxy profile
• **host_permissions (<all_urls>)**: Required by webRequest to handle proxy auth challenges on any URL, since proxy authentication can occur on any web request

All permissions are used solely for core functionality. No personal data is collected or transmitted. The webRequest and webRequestAuthProvider permissions are used exclusively for proxy authentication — the extension does not read, modify, or log any web request content.

### 🔒 Privacy Justification for webRequest & webRequestAuthProvider

**Why webRequest is needed:** X-Proxy uses `chrome.webRequest.onAuthRequired` to detect when a proxy server requests authentication (HTTP 407 response). Without this permission, users with password-protected proxies would see repeated authentication popups from Chrome.

**Why webRequestAuthProvider is needed:** This permission allows the extension to programmatically supply proxy credentials (username and password) that the user has configured in their proxy profile. The extension only responds to proxy authentication challenges (`details.isProxy === true`) and ignores all other authentication requests.

**What data is accessed:** Only the proxy authentication challenge event. The extension does not read, modify, redirect, or block any web request content. Credentials are stored locally via `chrome.storage.local` and are never transmitted to any external server.

### 🆘 Support

• GitHub Issues for bug reports and feature requests
• Comprehensive documentation included
• Regular updates and maintenance

---

**Need simple, reliable proxy switching?** Install X-Proxy for a clean, straightforward solution.

## Category
Productivity

## Primary Category
Developer Tools

## Language
English

## Screenshots Required
1. Main popup interface showing profile list (1280x800)
2. Options page with proxy profiles (1280x800)
3. Add/Edit profile form (1280x800)
4. Active proxy status display (1280x800)
5. About section (1280x800)

## Promotional Images
- Small tile (440x280): Simple logo with "X-Proxy" text
- Large tile (920x680): Clean interface screenshot with features
- Marquee (1400x560): Hero image showing proxy switching

## Support URL
https://github.com/helebest/x-proxy/issues

## Tags (5 maximum)
- proxy
- network
- developer-tools
- socks5
- productivity
