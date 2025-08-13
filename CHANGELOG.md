# Changelog

Last updated: 2025-08-13

All notable changes to X-Proxy Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Future improvements planned:
- Enhanced error handling and user feedback
- Support for additional proxy types
- Performance optimizations
- UI/UX improvements

## [1.0.0] - 2025-08-13

### Added
- Simple and reliable proxy switching
- Support for HTTP/HTTPS and SOCKS5 proxies
- Basic profile management (create, edit, duplicate, delete)
- Clean, intuitive user interface
- Chrome Manifest V3 compliance
- TypeScript implementation with strict type checking
- Comprehensive test suite with 48+ test cases covering:
  - Unit tests for proxy configurations
  - Integration tests for Chrome API interactions  
  - End-to-end tests for complete user workflows
  - Bug regression prevention tests
- Production build process with Vite
- Proper error handling and validation
- Real-time proxy status indication

### Fixed
- UI consistency issues (Edit buttons now use text instead of icons)
- Add Profile button styling (+ icon color matches text)
- Stale active profile reference cleanup
- RangeError handling for invalid date values
- Popup data synchronization improvements

### Technical
- Removed deprecated PAC script functionality
- Simplified codebase to focus on core proxy switching
- Updated all documentation to reflect actual functionality
- Comprehensive test coverage for all implemented features
- Clean project structure with proper TypeScript configuration

---

## Version Guidelines

### Version Numbers
- **Major (X.0.0)**: Breaking changes, major feature additions, significant UI overhauls
- **Minor (0.X.0)**: New features, significant improvements, non-breaking changes
- **Patch (0.0.X)**: Bug fixes, small improvements, security patches

## How to Update

### For Developers
1. Pull latest changes from main branch
2. Run `npm install` to update dependencies
3. Run `npm run build` to create new build
4. Test thoroughly before release

## Reporting Issues

Found a bug or have a feature request? Please open an issue on our [GitHub repository](https://github.com/helebest/x-proxy/issues).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
