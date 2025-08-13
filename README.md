# X-Proxy Chrome Extension

Last updated: 2025-08-13

<p align="center">
  <strong>A simple and reliable proxy switcher for Chrome</strong>
</p>

## 🌟 Features

### Core Functionality
- **🔄 HTTP/HTTPS & SOCKS5 Support**: Support for the most common proxy types
- **⚡ Quick Switch**: One-click proxy switching from the browser toolbar  
- **📝 Profile Management**: Save and organize multiple proxy configurations
- **🎨 Clean Interface**: Simple, intuitive UI with consistent styling
- **🔧 System Integration**: Seamless Chrome proxy API integration

## 📥 Installation

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the project folder

### Build from Source
```bash
# Clone the repository
git clone https://github.com/helebest/x-proxy.git
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
2. **Add a proxy** by clicking the "➕ Add Profile" button
3. **Enter proxy details**:
   - Name: A friendly name for your proxy
   - Type: HTTP or SOCKS5
   - Host: Proxy server address
   - Port: Proxy server port
4. **Click "Save"** to add the proxy profile
5. **Click the profile** to activate it, or click "System Proxy" to deactivate

### Managing Proxy Profiles
- **Add Profile**: Create new proxy configurations
- **Edit Profile**: Modify existing proxy settings
- **Duplicate Profile**: Copy a profile as starting point for new one
- **Delete Profile**: Remove profiles you no longer need
- **System Proxy**: Return to direct connection (no proxy)

## 🏃‍♂️ Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build all extension components |
| `npm run build:all` | Type-check and build for production |
| `npm run type-check` | Run TypeScript type checking |
| `npm run lint` | Run ESLint for code quality |
| `npm run clean` | Clean build artifacts and dependencies |
| `npm run generate-icons` | Generate icon assets from SVG sources |
| `npm run watch` | Watch mode for background script development |

## 🏗️ Project Structure

```
x-proxy/
├── dist/               # Build output
├── tests/              # Test suites
├── docs/               # Documentation
├── store-assets/       # Chrome Web Store assets
├── manifest.json       # Extension manifest
├── popup.html          # Popup UI
├── popup.js            # Popup logic
├── options.html        # Options page
├── options.js          # Options logic
├── background.js       # Background service worker
├── package.json        # Project configuration
├── tsconfig.json       # TypeScript configuration
└── README.md           # Documentation
```

## 🔨 Building for Production

Create an optimized production build:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## ⚙️ Configuration

The project uses strict TypeScript settings for maximum type safety. The extension is built using Vite with separate configurations for different components (background, popup, options).

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

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📊 Performance

X-Proxy is designed to be lightweight and fast:
- **Startup time**: < 50ms
- **Proxy switching**: < 100ms
- **Memory usage**: < 10MB
- **CPU usage**: Minimal when idle

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/helebest/x-proxy/issues)
- **Documentation**: Check the docs/ folder for technical details

---

<p align="center">Simple, reliable proxy switching for Chrome</p>
