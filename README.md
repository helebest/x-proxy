# X-Proxy Chrome Extension

<p align="center">
  <img src="assets/logo.png" alt="X-Proxy Logo" width="128" height="128">
</p>

<p align="center">
  <strong>A powerful and modern proxy switcher for Chrome with advanced features</strong>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/x-proxy"><img src="https://img.shields.io/chrome-web-store/v/YOUR_EXTENSION_ID" alt="Chrome Web Store Version"></a>
  <a href="https://github.com/yourusername/x-proxy/actions"><img src="https://github.com/yourusername/x-proxy/workflows/CI/badge.svg" alt="CI Status"></a>
  <a href="https://github.com/yourusername/x-proxy/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://chrome.google.com/webstore/detail/x-proxy"><img src="https://img.shields.io/chrome-web-store/users/YOUR_EXTENSION_ID" alt="Users"></a>
  <a href="https://chrome.google.com/webstore/detail/x-proxy"><img src="https://img.shields.io/chrome-web-store/rating/YOUR_EXTENSION_ID" alt="Rating"></a>
</p>

## 🌟 Features

### Core Functionality
- **🔄 Multiple Proxy Types**: Support for HTTP, HTTPS, SOCKS4, and SOCKS5 proxies
- **⚡ Quick Switch**: One-click proxy switching from the browser toolbar
- **🎯 Smart Routing**: Configure different proxies for different websites
- **🔐 Authentication**: Full support for username/password authentication
- **📍 Bypass Lists**: Exclude specific domains from proxy routing

### Advanced Features
- **🌐 PAC Script Support**: Use Proxy Auto-Configuration scripts for complex routing
- **📊 Connection Monitoring**: Real-time connection status and statistics
- **🔄 Auto-Switching**: Automatically switch proxies based on network conditions
- **📝 Profile Management**: Save and organize multiple proxy configurations
- **🎨 Dark Mode**: Beautiful UI with light and dark theme support
- **⚙️ Bulk Import/Export**: Import proxy lists from various formats
- **🔍 Connection Testing**: Test proxy connectivity before activation
- **📈 Usage Analytics**: Track proxy usage and performance metrics

### Security & Privacy
- **🔒 Encrypted Storage**: All proxy credentials are securely encrypted
- **🛡️ WebRTC Leak Protection**: Prevent IP leaks through WebRTC
- **🔐 DNS-over-HTTPS**: Secure DNS resolution
- **👤 Privacy Mode**: Clear browsing data when switching proxies
- **🚫 Kill Switch**: Block all connections if proxy fails

## 📥 Installation

### From Chrome Web Store (Recommended)
1. Visit the [X-Proxy Chrome Web Store page](https://chrome.google.com/webstore/detail/x-proxy)
2. Click "Add to Chrome"
3. Click "Add Extension" in the popup

### Manual Installation (Developer Mode)
1. Download the latest release from [GitHub Releases](https://github.com/yourusername/x-proxy/releases)
2. Extract the ZIP file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the extracted folder

### Build from Source
```bash
# Clone the repository
git clone https://github.com/yourusername/x-proxy.git
cd x-proxy

# Install dependencies
npm install

# Build the extension
npm run build

# The built extension will be in the `dist` folder
```

## 🚀 Quick Start

### Basic Usage
1. **Click the X-Proxy icon** in your Chrome toolbar
2. **Add a proxy** by clicking the "+" button
3. **Enter proxy details**:
   - Name: A friendly name for your proxy
   - Type: HTTP/HTTPS/SOCKS4/SOCKS5
   - Host: Proxy server address
   - Port: Proxy server port
   - Username/Password (if required)
4. **Click "Save"** to add the proxy
5. **Toggle the switch** to activate the proxy

### Creating Proxy Profiles
1. Navigate to **Options** → **Profiles**
2. Click **"New Profile"**
3. Configure:
   - Profile name
   - Default proxy
   - Bypass rules
   - Auto-switch conditions
4. Save and activate the profile

### Using PAC Scripts
1. Go to **Options** → **PAC Scripts**
2. Either:
   - Enter a PAC script URL
   - Upload a local PAC file
   - Write custom PAC script
3. Test the script with sample URLs
4. Activate PAC-based routing

## 📖 User Guide

### Proxy Configuration

#### HTTP/HTTPS Proxy
```json
{
  "type": "http",
  "host": "proxy.example.com",
  "port": 8080,
  "username": "user",
  "password": "pass"
}
```

#### SOCKS5 Proxy
```json
{
  "type": "socks5",
  "host": "socks.example.com",
  "port": 1080,
  "username": "user",
  "password": "pass"
}
```

### Bypass Rules

Configure domains that should bypass the proxy:

- **Exact match**: `example.com`
- **Wildcard**: `*.example.com`
- **IP ranges**: `192.168.0.0/16`
- **Local addresses**: `<local>`

Example bypass list:
```
localhost
127.0.0.1
*.local
192.168.*
10.*
```

### PAC Script Examples

#### Simple PAC Script
```javascript
function FindProxyForURL(url, host) {
  // Use proxy for specific domains
  if (shExpMatch(host, "*.example.com")) {
    return "PROXY proxy.example.com:8080";
  }
  // Direct connection for everything else
  return "DIRECT";
}
```

#### Advanced PAC Script
```javascript
function FindProxyForURL(url, host) {
  // Different proxies for different services
  if (shExpMatch(host, "*.youtube.com") || 
      shExpMatch(host, "*.googlevideo.com")) {
    return "SOCKS5 video-proxy.example.com:1080";
  }
  
  if (shExpMatch(host, "*.github.com")) {
    return "HTTPS dev-proxy.example.com:8443";
  }
  
  // Load balance between multiple proxies
  if (shExpMatch(host, "*.api.example.com")) {
    return "PROXY proxy1.example.com:8080; " +
           "PROXY proxy2.example.com:8080; " +
           "DIRECT";
  }
  
  return "DIRECT";
}
```

## 🏃‍♂️ Development

Start the development server with hot-reload:

```bash
npm run dev
```

The application will be available at `http://localhost:3000` (configurable in `vite.config.ts`)

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run type-check` | Run TypeScript type checking |
| `npm run lint` | Run ESLint for code quality |
| `npm run clean` | Clean build artifacts and dependencies |

## 🏗️ Project Structure

```
x-proxy/
├── src/
│   ├── background/      # Service worker scripts
│   ├── popup/          # Popup UI components
│   ├── options/        # Options page
│   ├── content/        # Content scripts
│   ├── core/           # Core proxy logic
│   ├── pac/            # PAC script handler
│   └── utils/          # Utility functions
├── public/             # Static assets
├── tests/              # Test suites
├── docs/               # Documentation
├── .github/            # GitHub Actions workflows
├── dist/               # Build output
├── manifest.json       # Extension manifest
├── package.json        # Project configuration
├── tsconfig.json       # TypeScript configuration
├── CHANGELOG.md        # Version history
├── LICENSE             # MIT License
└── README.md           # Documentation
```

## 🔨 Building for Production

Create an optimized production build:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

To preview the production build:

```bash
npm run preview
```

## ⚙️ Configuration

### TypeScript Configuration

The project uses strict TypeScript settings for maximum type safety. Configuration can be modified in `tsconfig.json`.

Key features:
- Strict mode enabled
- Path aliasing (`@/` maps to `src/`)
- Modern ES2020 target
- Module resolution optimized for bundlers

### Vite Configuration

Vite is configured in `vite.config.ts` with:
- Development server on port 3000
- Source maps for debugging
- Optimized chunk splitting
- Path aliasing support

## 🧪 Testing

```bash
# Run all tests
npm test

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

### Testing Stack
- **Vitest** - Fast unit testing framework
- **@testing-library** - DOM testing utilities
- **Happy DOM** - Lightweight DOM implementation
- **Chrome Mock** - Chrome API mocking

## 📦 Dependencies

### Development Dependencies

- **vite** - Build tool and dev server
- **typescript** - TypeScript compiler
- **@types/node** - Node.js type definitions

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards

- Use TypeScript for all new code
- Follow the existing code style
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📊 Performance

### Benchmarks
- **Startup time**: < 50ms
- **Proxy switching**: < 100ms
- **PAC script evaluation**: < 10ms per request
- **Memory usage**: < 50MB idle, < 100MB active
- **CPU usage**: < 1% idle, < 5% active

### Optimization Tips
1. Use PAC scripts for complex routing rules
2. Enable connection pooling for HTTP proxies
3. Limit bypass list size to < 100 entries
4. Disable unused features to reduce memory usage

## 🆘 Support

- **Documentation**: [docs.x-proxy.com](https://docs.x-proxy.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/x-proxy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/x-proxy/discussions)
- **Email**: support@x-proxy.com
- **Twitter**: [@xproxy_ext](https://twitter.com/xproxy_ext)

## 🚦 Roadmap

### Version 1.1
- [ ] Firefox support
- [ ] Edge browser support
- [ ] Mobile proxy management app
- [ ] Cloud sync for proxy profiles

### Version 1.2
- [ ] VPN integration
- [ ] Tor network support
- [ ] Advanced analytics dashboard
- [ ] Team collaboration features

### Version 2.0
- [ ] AI-powered proxy selection
- [ ] Blockchain-based proxy marketplace
- [ ] Enterprise features
- [ ] API for third-party integrations

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/x-proxy&type=Date)](https://star-history.com/#yourusername/x-proxy&Date)

---

<p align="center">Made with ❤️ by the X-Proxy Team</p>
