# X-Proxy

<p align="center">
  <img src="docs/icons/icon-128.png" alt="X-Proxy Logo" width="128" height="128">
</p>

<h3 align="center">Simple, Fast, Privacy-Focused Proxy Switcher for Chrome</h3>

<p align="center">
  <a href="https://github.com/helebest/x-proxy/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://github.com/helebest/x-proxy/releases"><img src="https://img.shields.io/github/v/release/helebest/x-proxy" alt="Release"></a>
  <a href="https://github.com/helebest/x-proxy/stargazers"><img src="https://img.shields.io/github/stars/helebest/x-proxy?style=social" alt="Stars"></a>
  <a href="https://helebest.github.io/x-proxy/"><img src="https://img.shields.io/badge/website-online-brightgreen" alt="Website"></a>
</p>

<p align="center">
  <a href="https://helebest.github.io/x-proxy/">Website</a> •
  <a href="#-features">Features</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## 💡 Why X-Proxy?

Managing multiple proxy configurations shouldn't be complicated. X-Proxy makes it **simple**:

- ⚡ **One-Click Switching** - Switch proxies in < 100ms, no page reload needed
- 🔒 **Privacy First** - No tracking, no telemetry, all data stored locally
- 🎨 **Clean Interface** - Intuitive UI that gets out of your way
- 🚀 **Modern Stack** - Built with TypeScript, Vite, and Manifest V3
- 📦 **Lightweight** - < 10MB memory footprint
- 🆓 **Free & Open Source** - MIT licensed, use it however you want

## 🌟 Features

### Core Functionality
- **🔄 HTTP/HTTPS & SOCKS5**: Full support for common proxy protocols
- **📝 Unlimited Profiles**: Save and organize as many proxy configurations as you need
- **⚡ Instant Switching**: Activate profiles with a single click from toolbar
- **🔧 System Integration**: Seamless Chrome proxy API integration
- **💾 Local Storage**: All data stays on your device, no cloud sync

### Developer-Friendly
- **TypeScript** with strict mode for type safety
- **Manifest V3** compliant for future compatibility
- **Comprehensive tests** with 48+ test cases
- **Modern tooling** with Vite and Vitest
- **Clean codebase** that's easy to contribute to

## 📥 Installation

### Option 1: Chrome Web Store (Recommended)

<a href="https://chromewebstore.google.com/detail/x-proxy/efbckpjdlnojgnggdilgddeemgkoccaf" target="_blank">
  <img src="https://storage.googleapis.com/web-dev-uploads/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/iNEddTyWiMfLSwFD6qGq.png" alt="Available in the Chrome Web Store" height="60">
</a>

**Quick Install**: Visit the [Chrome Web Store](https://chromewebstore.google.com/detail/x-proxy/efbckpjdlnojgnggdilgddeemgkoccaf) and click "Add to Chrome"

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/helebest/x-proxy.git
cd x-proxy

# Install dependencies
npm install

# Build the extension
npm run build

# Load in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the `dist` folder
```

### Option 3: Download Release
Download the latest release from [GitHub Releases](https://github.com/helebest/x-proxy/releases) and load it in Chrome developer mode.

**Works on all Chromium browsers**: Chrome, Edge, Brave, Opera, and more!

## 🚀 Quick Start

### Basic Usage

1. **Click the X-Proxy icon** in your Chrome toolbar
2. **Add a profile** by clicking "➕ Add Profile"
3. **Configure your proxy**:
   ```
   Name: My Proxy
   Type: HTTP or SOCKS5
   Host: proxy.example.com
   Port: 8080
   ```
4. **Click Save** and then click the profile to activate
5. **Click "System"** to return to direct connection

### Example Configurations

**SOCKS5 Proxy**:
```
Type: SOCKS5
Host: 127.0.0.1
Port: 1080
```

**HTTP Proxy**:
```
Type: HTTP
Host: proxy.company.com
Port: 8080
```

## 🎯 Use Cases

- **Web Development**: Test apps behind different proxy configurations
- **Privacy**: Route traffic through privacy-focused proxies
- **Geo-Testing**: Access region-specific content during development
- **Corporate Networks**: Easily switch between work and personal proxies
- **Self-Hosted Proxies**: Manage multiple self-hosted proxy servers (Squid, Shadowsocks, V2Ray, etc.)

## 🏗️ Architecture

```
x-proxy/
├── background.js       # Service worker - proxy management logic
├── popup.js           # Popup UI - quick access interface
├── options.js         # Options page - full profile management
├── manifest.json      # Extension manifest (Manifest V3)
├── vite.config.*.ts  # Separate builds for each component
└── docs/              # GitHub Pages website
```

### Key Components

- **Background Service Worker**: Manages Chrome proxy API and profile state
- **Popup Interface**: Quick switching and status display
- **Options Page**: Full-featured profile management
- **Local Storage**: Chrome storage API for data persistence

See the codebase for detailed implementation. Key files: `background.js`, `popup.js`, `options.js`.

## 🛠️ Development

### Available Commands

```bash
# Development
npm run build              # Build all components
npm run watch              # Watch mode for development
npm run type-check         # TypeScript type checking
npm run lint               # Code quality checks

# Testing
npm test                   # Run all tests
npm run test:unit          # Unit tests only
npm run test:coverage      # Coverage report

# Utilities
npm run clean              # Clean build artifacts
npm run generate-icons     # Generate icon assets
```

### Tech Stack

- **Language**: TypeScript (strict mode)
- **Build Tool**: Vite
- **Testing**: Vitest + Testing Library
- **APIs**: Chrome Extension APIs (Manifest V3)
- **Storage**: Chrome Storage API (local)

## 🧪 Testing

X-Proxy has comprehensive test coverage:

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Test Coverage**:
- Unit tests for core logic
- Integration tests for Chrome APIs
- E2E tests for user workflows
- Bug regression tests

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### Good First Issues
- 🐛 Bug fixes
- 📝 Documentation improvements
- 🌐 Translations
- ✨ UI/UX enhancements

### Wanted Features
- PAC script support
- Auto-switch rules by domain/URL
- Import/export profiles
- Firefox port (WebExtensions)
- Dark mode theme

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📊 Performance Metrics

X-Proxy is designed to be lightweight and fast:

| Metric | Value |
|--------|-------|
| Startup Time | < 50ms |
| Proxy Switching | < 100ms |
| Memory Usage | < 10MB |
| CPU Usage | Minimal when idle |
| Extension Size | ~2MB installed |

## 🔒 Privacy & Security

Your privacy is important:

- ✅ **No Telemetry** - Zero data collection or tracking
- ✅ **Local Storage Only** - All data stays on your device
- ✅ **No External Requests** - Extension doesn't phone home
- ✅ **Open Source** - Audit the entire codebase
- ✅ **Minimal Permissions** - Only `proxy` and `storage` required

Read our [Privacy Policy](https://helebest.github.io/x-proxy/PRIVACY_POLICY/) for details.

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**TL;DR**: You can use, modify, and distribute this software freely, even for commercial purposes.

## 🌐 Links

- **Website**: https://helebest.github.io/x-proxy/
- **Issues**: https://github.com/helebest/x-proxy/issues
- **Discussions**: https://github.com/helebest/x-proxy/discussions
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)
- **Contributing Guide**: [CONTRIBUTING.md](CONTRIBUTING.md)

## 💖 Support

If you find X-Proxy useful, consider:

- ⭐ **Starring** the repository
- 🐛 **Reporting bugs** or suggesting features
- 🤝 **Contributing** code or documentation
- 💝 **Donating** via [PayPal](https://www.paypal.com/paypalme/lehe324)

## 📈 Roadmap

### v1.0.0 ✅ (Current - Extension Release)
- [x] Core proxy switching functionality
- [x] HTTP/HTTPS & SOCKS5 support
- [x] Profile management (create, edit, delete)
- [x] Clean, intuitive UI
- [x] TypeScript + Manifest V3
- [x] Comprehensive test suite
- [x] Chrome Web Store publication ✅

### v1.1.0 ✅ (GitHub Pages & SEO)
- [x] SEO optimization for GitHub Pages
- [x] Unified button styling
- [x] FAQ section with schema markup
- [x] Enhanced README and documentation

### v1.2.0 (Planned)
- [ ] PAC script support
- [ ] Auto-switch rules by domain
- [ ] Import/export profiles
- [ ] Profile import/export via JSON

### v2.0.0 (Future)
- [ ] Firefox support (WebExtensions)
- [ ] Advanced proxy features
- [ ] Statistics and analytics (local only)
- [ ] Custom themes

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## 🙏 Acknowledgments

Built with:
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Vitest](https://vitest.dev/)
- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/)

Inspired by projects like SwitchyOmega and FoxyProxy, but with a focus on simplicity and privacy.

## 📞 Contact

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and community chat
- **Email**: helebest@gmail.com

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/helebest">helebest</a>
</p>

<p align="center">
  <sub>Simple, reliable proxy switching for Chrome</sub>
</p>