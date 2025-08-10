# Changelog

Last updated: 2025-08-10

**History Migration Note**: Entries with dates prior to 2025-08-09 were migrated and normalized.

All notable changes to X-Proxy Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- AI-powered proxy optimization suggestions
- Mobile app companion for remote management
- Advanced analytics dashboard
- Proxy marketplace integration

### Changed
- Performance improvements for large proxy lists
- Updated UI components to latest design system

### Fixed
- Compatibility issues with latest Chrome updates
- Edge cases in PAC script parsing

## [1.1.0] - 2025-08-09 (migrated)

### Added
- Advanced PAC script debugging tools with step-through debugger
- Proxy chain support for enhanced anonymity (up to 5 proxies)
- API for programmatic proxy management with OAuth 2.0
- Brave and Opera browser support
- Real-time proxy performance metrics dashboard
- Proxy health monitoring with automatic failover
- Custom DNS resolver configuration
- Geolocation-based proxy auto-selection

### Changed
- Improved connection retry logic with exponential backoff
- Enhanced error messages with troubleshooting suggestions
- Optimized memory usage by 40%
- Upgraded to latest Chrome Manifest V3 APIs

### Fixed
- Memory leak in long-running sessions (>24 hours)
- WebRTC leak on certain network configurations
- Race condition in profile switching
- Incorrect badge count on proxy errors

### Security
- Added support for TLS 1.3 proxy connections
- Implemented certificate pinning for critical domains
- Enhanced password encryption with Argon2id

## [1.0.0] - 2025-08-09 (migrated)

### Added
- Initial release of X-Proxy Chrome Extension
- Support for HTTP, HTTPS, SOCKS4, and SOCKS5 proxies
- Quick proxy switching from browser toolbar
- PAC script support for complex routing rules
- Proxy profiles for organized management
- Authentication support with encrypted credential storage
- Bypass list configuration for direct connections
- Dark mode support with automatic theme detection
- Connection testing and validation tools
- Real-time connection status monitoring
- WebRTC leak protection
- DNS-over-HTTPS support
- Import/Export functionality for proxy lists
- Comprehensive options page with advanced settings
- Keyboard shortcuts for quick proxy switching
- Context menu integration for per-tab proxy control
- Usage statistics and analytics
- Auto-switching based on network conditions
- Kill switch for failed proxy connections
- Bulk proxy management operations
- Custom icon badges showing active proxy
- Notification system for connection events
- Full TypeScript implementation
- Comprehensive test suite with Vitest
- Chrome Web Store ready package

### Security
- Implemented secure credential storage using Chrome's encryption API
- Added WebRTC leak prevention mechanisms
- Enforced HTTPS for all PAC script downloads
- Implemented input validation for all proxy configurations

## [0.9.0-beta] - 2025-08-09 (migrated)

### Added
- Beta release for testing
- Core proxy switching functionality
- Basic UI implementation
- Initial PAC script support

### Changed
- Migrated from Manifest V2 to V3
- Refactored to use service workers
- Improved popup UI responsiveness

### Fixed
- Chrome 120+ compatibility issues
- Service worker lifecycle management

## [0.8.0-alpha] - 2025-08-09 (migrated)

### Added
- Alpha release for internal testing
- Basic proxy configuration
- Simple popup interface
- HTTP/HTTPS proxy support

### Known Issues
- SOCKS proxy support incomplete
- PAC scripts not fully functional
- UI needs polish

## [0.5.0-dev] - 2025-08-09 (migrated)

### Added
- Initial development version
- Project structure setup
- Basic manifest configuration
- Development environment with Vite

### Technical
- TypeScript setup
- Vite build configuration
- Initial test framework setup

---

## Version Guidelines

### Version Numbers
- **Major (X.0.0)**: Breaking changes, major feature additions, significant UI overhauls
- **Minor (0.X.0)**: New features, significant improvements, non-breaking changes
- **Patch (0.0.X)**: Bug fixes, small improvements, security patches

### Release Cycle
- **Stable Release**: Every 2-3 months
- **Beta Release**: 2-3 weeks before stable
- **Security Updates**: As needed (immediate)

### Deprecation Policy
- Features will be deprecated with at least one minor version notice
- Deprecated features will be removed in the next major version
- Migration guides will be provided for all breaking changes

## How to Update

### For Users
1. Chrome will automatically update the extension
2. Check chrome://extensions for manual updates
3. Review changelog for new features

### For Developers
1. Pull latest changes from main branch
2. Run `npm install` to update dependencies
3. Run `npm run build` to create new build
4. Test thoroughly before release

## Reporting Issues

Found a bug or have a feature request? Please open an issue on our [GitHub repository](https://github.com/yourusername/x-proxy/issues).

## Contributors

Thanks to all contributors who have helped shape X-Proxy:

- [@yourusername](https://github.com/yourusername) - Project Lead
- [@contributor1](https://github.com/contributor1) - Core Developer
- [@contributor2](https://github.com/contributor2) - UI/UX Design
- [All Contributors](https://github.com/yourusername/x-proxy/graphs/contributors)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

[Unreleased]: https://github.com/yourusername/x-proxy/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/yourusername/x-proxy/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/yourusername/x-proxy/compare/v0.9.0-beta...v1.0.0
[0.9.0-beta]: https://github.com/yourusername/x-proxy/compare/v0.8.0-alpha...v0.9.0-beta
[0.8.0-alpha]: https://github.com/yourusername/x-proxy/compare/v0.5.0-dev...v0.8.0-alpha
[0.5.0-dev]: https://github.com/yourusername/x-proxy/releases/tag/v0.5.0-dev
