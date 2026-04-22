# Changelog

Last updated: 2026-04-22

All notable changes to X-Proxy Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Future improvements planned:
- Enhanced error handling and user feedback
- Performance optimizations
- Blog content creation for SEO
- Multi-language support (Chinese, Japanese, Russian)

## [1.6.1] - 2026-04-22

### Fixed
- **Toolbar icon now distinguishes Direct from System mode** ([#28](https://github.com/helebest/x-proxy/issues/28) tail). Previously both modes resolved to `icon-inactive-*.png` (gray) so there was no way to tell at a glance whether the extension was actively bypassing proxies or deferring to the OS. Direct mode now renders a new green arrow icon family (`icon-direct-{16,32,48,128}.png`); System mode keeps the gray inactive icon it had before.
- **Popup empty-state no longer shows three redundant "add profile" entry points** ([#36](https://github.com/helebest/x-proxy/issues/36)). The header "+" button is hidden while the profile list is empty — the big "Add your first profile" CTA is the single obvious action. The header "+" returns once profiles exist.

### Changed
- **Popup active-mode signaling reduced from 4 simultaneous indicators to 2** (per sergeevabc's feedback on #28). Removed the animated `.status-dot` in the top status chip and the right-edge `.action-check` ✓ on each card. The active card still communicates selection via its blue gradient background and white-inherited icon — enough signal without the visual noise.

### Added
- **`lib/icon-paths.js`**: pure helper `resolveIconPaths(profileColor, mode)` shared by the background worker and unit tests. Makes the three-way branch (profile / direct / system) testable without stubbing `chrome.action`.
- **Regression guards**:
  - `tests/update-icon.test.js` — pins down the path resolver contract (8 assertions incl. the direct-vs-system distinctness rule).
  - `e2e/popup-visual-simplicity.spec.ts` — asserts `.status-dot` / `.action-check` are removed from the DOM and `#addProfileBtn` toggles with the `state-empty` body class.
  - `e2e/icon-differentiation.spec.ts` — asserts Direct and System resolve to strictly different `chrome.action.setIcon` paths via a new `lastIconPaths` / `lastIconMode` field on `GET_STATE`.
  - `e2e/popup-visual.spec.ts` — screenshot baselines for empty / populated / direct-active / system-active / profile-active popup states.

### Credits
- Thanks again to [@sergeevabc](https://github.com/sergeevabc) for the detailed UX feedback on #28 and for filing #36. Your "count the signals" instinct was the right call.

## [1.6.0] - 2026-04-20

### Added
- **Direct Connection mode**: new top-level mode that bypasses **all** proxies (including the OS-level / IE proxy that `System` falls back to). Surfaces as a dedicated button in the popup next to `System`. Closes a gap where users on Windows couldn't escape an IE-wide proxy without leaving the extension. ([#28](https://github.com/helebest/x-proxy/issues/28))
- **Storage schema v2**: new top-level `mode: 'direct' | 'system' | 'profile'` field in `x-proxy-data`. Automatic one-way v1 → v2 migration infers `mode` from existing `activeProfileId`; stale ids are dropped safely. No user action required.
- **Regression guards**: new Vitest suite for migration edge cases (`tests/mode-migration.test.js`) and new Playwright spec for the Direct button (`e2e/direct-mode.spec.ts`).

### Fixed
- **Toolbar icon color was delayed after profile activation**. Activating a profile from the popup did not immediately repaint the toolbar icon; it stayed gray until the user interacted with the address bar. The real root cause was that the icon logic only painted the profile color when the current tab's URL started with `http(s)://` — on `chrome://newtab`, `about:blank`, or any extension page it fell through to the inactive gray icon even with a profile active. Fixed by showing the profile color unconditionally when no per-domain routing rules are enabled (the simple case); per-tab indication is preserved for profiles that DO have routing rules since that's where it carries real information. The popup-window tab-query path was also hardened via `chrome.windows.getLastFocused({windowTypes:['normal']})` as a belt-and-braces improvement.

### Changed
- **Visual polish pass** on the options page: added missing `--border-radius` / `--transition` design tokens (previously falling back to `0`, flattening inputs and killing hover transitions), added proper dark-mode support for the options page (previously hardcoded light), and aligned focus-ring and danger-hover colors with the iOS blue/red palette used throughout.

### Credits
- Thanks to [@sergeevabc](https://github.com/sergeevabc) for reporting issue #28.

## [1.5.2] - 2026-04-20

### Fixed
- **Performance**: Removed `backdrop-filter: blur()` from options modal, options header/sidebar, and popup header/footer. Fixes severe UI lag on low-end hardware without GPU acceleration (reported on Windows 7 without dedicated GPU, where switching between form fields in the Add Profile dialog could take several seconds). Modal overlay opacity bumped from `rgba(0,0,0,0.4)` to `rgba(0,0,0,0.55)` to preserve visual separation. ([#27](https://github.com/helebest/x-proxy/issues/27))

### Added
- **Regression guard**: New Playwright spec `e2e/no-blur.spec.ts` asserts `backdrop-filter: none` on all five previously-blurred surfaces, so nobody can quietly reintroduce blur.

### Credits
- Thanks to [@sergeevabc](https://github.com/sergeevabc) for reporting issue #27.

## [1.5.1] - 2026-04-16

### Added
- **Dynamic toolbar icon colors** — icon reflects the active profile's color (blue, green, red, orange, purple, teal, yellow, gray)
- **Dark mode improvements** — enhanced popup visuals with corrected CSS variables, better contrast and readability

### Fixed
- **Security**: Upgraded Vite to v6.4.2 (fixes GHSA-4w7w-66w2-5vf9, GHSA-p9ff-h696-f583)
- **CI**: Updated Node.js test matrix to 20/22, removed deprecated tsconfig `baseUrl`

### Credits
- Thanks to [@Schleuse](https://github.com/Schleuse) (René Schleusner) for contributing PR #21 (icon colors) and PR #22 (dark mode improvements)

## [1.5.0] - 2026-04-02

### Added - PAC File Support (Issue #19)
- **Custom PAC (Proxy Auto-Configuration) file support**
  - New `PAC (Auto-Config)` proxy type alongside HTTP/HTTPS and SOCKS5
  - Supports HTTP/HTTPS URLs (e.g., `http://example.com/proxy.pac`)
  - Supports local file paths (e.g., `C:\data\proxy.pac`, `/etc/proxy.pac`)
  - Supports `file://` URLs directly
  - Automatic conversion of local file paths to `file://` URLs
- **Options page UI updates**
  - PAC type option in proxy type dropdown
  - Dedicated PAC URL input field (shown when PAC type selected)
  - Host/port/auth/routing fields hidden for PAC profiles
- **Import/Export**: PAC profiles supported in JSON import/export
- **Unit Tests**: 28 new test cases for PAC URL conversion, normalization, and proxy config building (TDD)
  - New test file: `tests/pac-url.test.js` (18 tests)
  - Extended: `tests/pac.test.js` (+8 tests), `tests/normalize.test.js` (+10 tests)

## [1.4.2] - 2026-03-14

### Added - Proxy Authentication (Issue #17)
- **Username/Password authentication for proxy servers**
  - Optional username and password fields in profile configuration
  - Handled via `chrome.webRequest.onAuthRequired` (Manifest V3)
  - Works with both HTTP/HTTPS and SOCKS5 proxy types
  - Credentials stored locally, never transmitted externally
- **New permissions**: `webRequest`, `webRequestAuthProvider`
- **Unit Tests**: auth normalization tests + auth handler tests (TDD)

## [1.4.1] - 2026-03-09

### Fixed - Domain Routing Bug
- **Missing `mode` property in routingRules normalization**
  - `normalizeProfile()` in options.js and popup.js did not include `mode` in fallback defaults
  - `normalizeProfileForSave()` in options.js had the same issue
  - This caused PAC script generation to receive `mode: undefined`, breaking domain-based routing
  - Users reported: "Proxy doesn't work by domains although such settings exist"

### Added - Unit Tests
- **Profile normalization tests** (`tests/normalize.test.js`)
  - Tests for routingRules fallback defaults including `mode` property
  - Round-trip normalization tests (normalize → save → reload → normalize)
  - Tests for both options.js and popup.js normalization functions
- **PAC script generation tests** (`tests/pac.test.js`)
  - Whitelist mode: whitelisted domains use proxy, others go direct
  - Blacklist mode: blacklisted domains go direct, others use proxy
  - Wildcard domain matching tests
  - Proxy type formatting (HTTP vs SOCKS5)
  - Mode fallback behavior when `mode` is undefined
- **Vitest configuration** (`vitest.config.ts`)
  - Configured vitest for running unit tests
  - Updated npm scripts: `test`, `test:watch`, `test:coverage`

### Changed
- Updated npm test scripts to use vitest instead of placeholder echo commands

## [1.4.0] - 2026-02-15

### Added - Import/Export Profiles (Issue #11)
- **Export Profiles**
  - Export all proxy profiles as JSON file
  - Clean export format with version metadata for forward compatibility
  - Automatic filename with date: `x-proxy-profiles-YYYY-MM-DD.json`

- **Import Profiles**
  - Import profiles from JSON export file
  - Strict validation of file format and profile data
  - Non-destructive append mode (existing profiles preserved)
  - Partial import support with skip count for invalid profiles
  - Graceful error handling with user-friendly messages

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
