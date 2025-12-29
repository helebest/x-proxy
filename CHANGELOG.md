# Changelog

Last updated: 2025-12-29

All notable changes to X-Proxy Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Future improvements planned:
- Enhanced error handling and user feedback
- Support for additional proxy types
- Performance optimizations
- Blog content creation for SEO
- Multi-language support (Chinese, Japanese, Russian)
- Google Analytics integration

## [1.3.1] - 2025-12-29

### Fixed - Domain Validation Bug (Issue #9)
- **Enhanced `isValidDomain()` method**
  - Added IPv4 address support (e.g., `127.0.0.1`, `192.168.*`, `10.0.0.0/24`)
  - Added IPv6 address support (e.g., `::1`, `fe80::1`)
  - Added simple hostname support (e.g., `localhost`)
  - Added single-level wildcard support (e.g., `*.local`)
  - Fixed: blacklist domains like `localhost`, `127.0.0.1` can now be saved

### Credits
- Thanks to [@jasonliaotw](https://github.com/jasonliaotw) for reporting the issue and contributing the regex patterns

## [1.3.0] - 2025-12-27

### Added - Bypass List Feature (Issue #6)
- **Routing Mode Selection**
  - Added radio buttons for whitelist/blacklist mode selection
  - Whitelist mode: only listed domains use proxy (existing behavior)
  - Blacklist mode: listed domains bypass proxy, all others use proxy
  - Dynamic label and placeholder updates based on selected mode

- **User Interface Enhancements**
  - Clean radio button design with visual feedback
  - Mode-specific placeholder text with example domains
  - Help text for domain pattern syntax
  - Profile color now displayed in Popup (matches Options page)
  - Simplified "Add Profile" button text

### Changed
- **PAC Script Generation**
  - Enhanced `generatePAC()` to support both whitelist and blacklist modes
  - Blacklist mode reverses proxy logic (matched domains go direct)
  - Maintains backward compatibility with existing whitelist-only profiles

- **Data Model**
  - Extended `routingRules` with `mode` property ("whitelist" | "blacklist")
  - Default mode: `'whitelist'` for backward compatibility
  - Profile duplication now copies routing mode

### Technical
- New helper method: `updateDomainListLabel()`
- CSS styling for radio button components
- Updated profile normalization to include `mode` property

### Backward Compatibility
- Existing profiles without `mode` default to whitelist behavior
- No migration required for existing configurations

## [1.2.0] - 2025-10-25

### Added - Domain-Based Routing (Issue #5)
- **Profile-Level Routing Rules**
  - Added domain whitelist configuration for each proxy profile
  - Only specified domains use the proxy, all others go direct
  - Supports wildcard patterns (e.g., `*.google.com`, `*.youtube.com`)
  - Toggle switch to enable/disable routing rules per profile
  - Textarea input for domain list (one domain per line)

- **PAC Script Generation**
  - Automatic PAC (Proxy Auto-Configuration) script generation
  - Uses `shExpMatch()` for efficient wildcard domain matching
  - Seamless switching between PAC mode (with routing) and fixed_servers mode (all traffic)

- **User Interface**
  - Clean, intuitive routing rules section in profile editor
  - Polished toggle switch with proper sizing and shadow effects
  - Unified font styling across all input fields
  - Domain validation with clear error messages
  - Auto-clear domain list when routing toggle is disabled
  - English-only UI for simplicity

- **User Experience Improvements**
  - Auto-reactivate when editing currently active profile (changes apply immediately)
  - Copy routing rules when duplicating profiles
  - Visual feedback with status messages (success/warning/error)

### Changed
- **Proxy Activation Logic**
  - `activateProxy()` now detects routing rules and uses appropriate proxy mode
  - PAC mode when routing rules enabled, fixed_servers mode otherwise
  - Maintains backward compatibility with existing profiles
  - Improved data normalization for both old and new profile formats

### Technical
- Extended profile data model with `config.routingRules: { enabled, domains }`
- Added domain validation helper (`isValidDomain()`)
- Normalized profile data handling across options and popup
- Updated Chrome proxy API usage to support both PAC and fixed_servers modes

### Backward Compatibility
- Existing profiles without routing rules work unchanged
- Default routing rules: `{ enabled: false, domains: [] }`
- All existing functionality preserved

## [1.1.1] - 2025-10-01

### Enhanced - Privacy Policy Page SEO
- **Privacy Policy HTML Version**
  - Created SEO-optimized HTML version of privacy policy (`docs/PRIVACY_POLICY/index.html`)
  - Added comprehensive meta tags (title, description, Open Graph, Twitter Card)
  - Implemented consistent header/footer styling with main site
  - Added breadcrumb navigation for improved UX and SEO
  - Ensured mobile responsiveness and accessibility

- **Content Organization**
  - Preserved Markdown source as `policy.md` for easy maintenance
  - Applied highlight boxes for key privacy statements
  - Improved content hierarchy with proper heading structure
  - Enhanced link accessibility with rel="noopener" for external links

- **SEO Benefits**
  - Independent meta tag control for search engines
  - Unified design language across all GitHub Pages
  - Better discoverability through optimized meta descriptions
  - Improved user experience with consistent navigation

### Fixed
- **Privacy Policy List Alignment**
  - Corrected list items alignment from center to left for better readability
  - Updated `docs/PRIVACY_POLICY/index.html` inline styles
  - Updated `docs/assets/css/style.css` for consistent alignment

## [1.1.0] - 2025-09-30

### Added - GitHub Pages SEO & UI Optimization
- **SEO Enhancements**
  - Added comprehensive Schema.org structured data (SoftwareApplication)
  - Implemented FAQPage schema with 8 common questions
  - Enhanced meta tags for better search engine visibility
  - Added canonical URL and improved Open Graph tags
  - Created sitemap.xml for search engine indexing
  - Created robots.txt with crawler instructions
  - Added preload directives for critical resources

- **UI/UX Improvements**
  - Unified button system with consistent styling across all CTAs
  - Added SVG icons to primary action buttons (Install, GitHub, Donate)
  - Improved button hover effects with smooth transitions
  - Enhanced mobile responsive design for button layouts
  - Implemented fade-in animation for better page load experience

- **Performance Optimizations**
  - Extracted inline CSS to external stylesheet (docs/assets/css/style.css)
  - Implemented lazy loading support for images
  - Added Intersection Observer for efficient scroll animations
  - Optimized critical rendering path with minimal inline CSS
  - Added support for reduced motion preferences

- **Content Additions**
  - Added comprehensive FAQ section targeting user search intent
  - Improved keyword density and semantic content structure
  - Enhanced accessibility with proper ARIA labels and semantic HTML

- **Documentation**
  - Created SEO_OPTIMIZATION_GUIDE.md with detailed implementation roadmap
  - Documented button styling system and design patterns
  - Added validation checklist and next steps guide

### Changed
- **GitHub Pages Website**
  - Restructured index.html with better SEO optimization
  - Updated hero section buttons with unified design language
  - Improved content hierarchy and heading structure
  - Enhanced external link handling with rel="noopener"

### Technical
- **New Files**
  - `docs/assets/css/style.css` - Centralized stylesheet
  - `docs/sitemap.xml` - XML sitemap for search engines
  - `docs/robots.txt` - Search engine crawler rules
  - `docs/SEO_OPTIMIZATION_GUIDE.md` - Comprehensive SEO documentation

- **Modified Files**
  - `docs/index.html` - Complete SEO and UI overhaul
  - Button classes: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-donate`

### SEO Impact
- Target keywords: chrome proxy extension, proxy switcher, socks5 chrome
- Expected organic traffic: 100-200 visitors/month (3 months), 500-1000 visitors/month (6 months)
- Rich snippet opportunities via FAQ and Software Application schema

## [1.0.1] - 2025-09-20

### Added
- PayPal donate button on GitHub Pages site in Hero section
- Consistent styling with existing button components
- Responsive design support for mobile devices

### Technical
- Added `.btn-donate` CSS class with PayPal brand colors (#0070ba)
- Integrated existing PayPal link from extension popup
- Maintained design consistency across all buttons

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
