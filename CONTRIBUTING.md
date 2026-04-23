# Contributing to X-Proxy

Last updated: 2026-04-23

First off, thank you for considering contributing to X-Proxy! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Guidelines](#coding-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Standards

- **Be Respectful**: Treat everyone with respect. No harassment, discrimination, or inappropriate behavior.
- **Be Collaborative**: Work together to resolve conflicts and assume good intentions.
- **Be Professional**: Maintain professionalism in all interactions.
- **Be Inclusive**: Welcome and support people of all backgrounds and identities.

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- Node.js 18+ and npm 8+
- Git and a GitHub account
- Chrome browser for testing
- Basic familiarity with plain JavaScript and Chrome Extensions (Manifest V3)

> X-Proxy source files are **plain `.js`** at the repo root. TypeScript is used only for type-checking via `tsconfig.json` (`allowJs: true`) — there is no `.ts` source to compile and no build-time transform on your code.

### First Contributions

Unsure where to begin? Look at:

- [Good First Issues](https://github.com/helebest/x-proxy/labels/good%20first%20issue) - small, focused tasks
- [Help Wanted](https://github.com/helebest/x-proxy/labels/help%20wanted) - issues that need extra attention
- [Documentation](https://github.com/helebest/x-proxy/labels/documentation) - doc improvements

## How Can I Contribute?

### Reporting Bugs

Before filing a bug, please check existing issues to avoid duplicates. Include:

1. **Clear Title** — a concise, descriptive title
2. **Description** — what went wrong
3. **Steps to Reproduce** — the exact sequence
4. **Expected vs. Actual Behavior**
5. **Screenshots** — if relevant
6. **Environment** — Chrome version, X-Proxy version, OS, proxy type

#### Bug Report Template

```markdown
## Bug Description
A clear and concise description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Configure '....'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Screenshots
If applicable, add screenshots.

## Environment
- Chrome Version: [e.g., 128.0.6613.120]
- X-Proxy Version: [e.g., 1.6.1]
- OS: [e.g., macOS 15, Windows 11]
- Proxy Type: [HTTP / HTTPS / SOCKS5 / PAC]

## Additional Context
Any other context about the problem.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Please include:

1. **Use Case** — why you need this
2. **Current Behavior** — and why it's insufficient
3. **Proposed Solution**
4. **Alternatives** considered
5. **Additional Context**

## Development Setup

1. **Fork and clone**
   ```bash
   git clone https://github.com/your-username/x-proxy.git
   cd x-proxy
   git remote add upstream https://github.com/helebest/x-proxy.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

4. **Build the extension**
   ```bash
   npm run build       # build all three components to dist/
   npm run watch       # rebuild background.js on change (popup/options need manual rebuild)
   ```

   > Do **not** use `npm run dev` — it starts a Vite dev server, which is not how Chrome extensions load. Chrome loads files from `dist/` as an unpacked extension; that's why the workflow is build → load → reload.

5. **Load the extension in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` directory
   - After each rebuild, click the reload icon on the X-Proxy card

## Project Structure

```
x-proxy/
├── background.js             # Service worker (proxy mgmt, PAC gen, auth)
├── popup.html / popup.js / popup.css   # Toolbar popup UI
├── options.html / options.js / options.css   # Full options page
├── manifest.json             # MV3 manifest (copied into dist/ at build)
├── lib/
│   ├── icon-paths.js         # Icon path resolver (profile/direct/system)
│   └── storage-migration.js  # v1 → v2 schema migration
├── tests/                    # Vitest unit tests — flat, *.test.js
├── e2e/                      # Playwright E2E — flat, *.spec.ts
│   ├── fixture.ts            # Launches Chromium with built dist/ loaded
│   └── __screenshots__/      # Visual-regression baselines
├── scripts/
│   └── generate-icons.js     # Regenerate PNG icons from SVG (sharp)
├── public/icons/             # Static icon assets
├── vite.config.background.ts # One Vite config per component — each builds
├── vite.config.popup.ts      # independently into dist/ (no emptyOutDir)
├── vite.config.options.ts
└── tsconfig.json             # Strict type-check over .js via allowJs
```

## Coding Guidelines

### JavaScript Style

Source files are plain ES2022 JavaScript. We follow a few hard rules:

1. **No TypeScript syntax in source files** — JSDoc annotations are fine and preferred for public helpers; the type checker consumes them.
2. **Prefer `const`** — `let` only when reassignment is real; avoid `var`.
3. **No `eval` / dynamic code** — required for Chrome Web Store review.
4. **Small, pure helpers live in `lib/`** — so they can be unit-tested without stubbing `chrome.*` APIs (see `lib/icon-paths.js` as the pattern).
5. **Keep `background.js` lightweight** — it's a service worker and gets terminated aggressively; anything expensive should be on-demand, not on-startup.

#### Example: an extractable pure helper

```javascript
// lib/icon-paths.js
/**
 * Resolve the toolbar icon paths for the current mode.
 * @param {string | undefined} profileColor - hex color of the active profile, if any
 * @param {'profile' | 'direct' | 'system'} mode
 * @returns {{ 16: string, 32: string, 48: string, 128: string }}
 */
export function resolveIconPaths(profileColor, mode) {
  if (mode === 'direct') return DIRECT_ICONS;
  if (mode === 'system') return INACTIVE_ICONS;
  return colorizedIcons(profileColor);
}
```

```javascript
// tests/update-icon.test.js — exercises it directly, no chrome stubs
import { resolveIconPaths } from '../lib/icon-paths.js';
// ...
```

### File Naming

- **Source files**: kebab-case for multi-word files (`icon-paths.js`, `storage-migration.js`); single-purpose entry points keep their established names (`background.js`, `popup.js`, `options.js`).
- **Test files**: `*.test.js` in `tests/` for Vitest; `*.spec.ts` in `e2e/` for Playwright.
- **CSS**: kebab-case.

### Chrome Extension Specifics

1. **Only request permissions you use** — each new permission triggers re-review on the Web Store.
2. **Storage**: `chrome.storage.local` under the single key `'x-proxy-data'`. Respect the v2 schema (`mode` + `profiles` + `activeProfileId`) documented in `CLAUDE.md`. If you change the schema, bump `version` and add a migration in `lib/storage-migration.js`.
3. **Message protocol** (popup/options → background): `ACTIVATE_PROFILE`, `DEACTIVATE_PROFILE`, `GET_STATE`. Don't introduce new message types without discussion.
4. **Proxy API mode selection** lives in `background.js` and branches on profile type; test both the PAC-generation path and the `fixed_servers` path when touching it.

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat** — new feature
- **fix** — bug fix
- **docs** — documentation only
- **style** — formatting, no code change
- **refactor** — code change that neither fixes a bug nor adds a feature
- **perf** — performance improvement
- **test** — adding or updating tests
- **build** — build system / deps
- **ci** — CI configuration
- **chore** — anything else that doesn't touch src or tests

### Examples

```bash
feat(popup): add Direct Connection mode button
fix(background): repaint toolbar icon immediately on activate
docs(readme): add v1.6.1 roadmap entry
perf(popup): remove backdrop-filter from header and footer
test(icon-paths): pin direct-vs-system distinctness
feat(storage)!: migrate to schema v2 with top-level mode

BREAKING CHANGE: x-proxy-data now includes a top-level `mode` field;
v1 → v2 migration runs automatically on first load.
```

## Pull Request Process

1. **Sync with upstream**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a branch** (`feature/...` or `fix/...`)

3. **Make changes** — code, tests, docs

4. **Verify locally**
   ```bash
   npm run type-check   # tsc --noEmit
   npm test             # Vitest unit tests
   npm run build        # must succeed; required before E2E
   npm run test:e2e     # Playwright (headed Chrome, needs dist/)
   ```

   > `npm run lint` is currently a no-op placeholder; it will always "pass". Don't treat it as a real gate.

5. **Commit** — Conventional Commits; one logical change per commit where practical

6. **Push and open a PR**
   - Fill out the PR template
   - Link related issues (`Fixes #N`)
   - If a user-visible behavior changed, update `CHANGELOG.md` under `[Unreleased]`

### Pull Request Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass (`npm test`)
- [ ] Type check passes (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)
- [ ] E2E tests pass (`npm run test:e2e`) — if UI/background changed
- [ ] Manual testing completed in an unpacked `dist/` load

## Checklist
- [ ] Follows project conventions (plain JS, no TS syntax in source)
- [ ] Self-review completed
- [ ] Comments added only where WHY is non-obvious
- [ ] Docs updated (README / CHANGELOG / CLAUDE.md) if behavior changed
- [ ] No new permissions added (or explicitly justified if so)

## Related Issues
Fixes #(issue number)

## Screenshots
If UI changed, include before/after.
```

## Testing

### Running Tests

```bash
npm test                 # Vitest unit tests (tests/*.test.js)
npm run test:watch       # Vitest in watch mode
npm run test:coverage    # Vitest with v8 coverage

npm run build            # required before E2E
npm run test:e2e         # Playwright E2E (e2e/*.spec.ts)
npm run test:e2e:headed  # E2E with a visible browser
```

> `test:unit` and `test:integration` are aliases for `vitest run` kept for muscle memory — they run the same suite as `npm test`. The real second tier is `test:e2e`.

### Writing Tests

1. **Unit tests** live in `tests/` as flat `*.test.js` files. Prefer extracting logic into `lib/` and testing the pure function — no `chrome.*` stubs needed. See `lib/icon-paths.js` + `tests/update-icon.test.js` as the canonical pattern.
2. **E2E tests** live in `e2e/` as flat `*.spec.ts` files and go through the `fixture.ts` helper that launches Chromium with the built `dist/` loaded.
3. **Screenshot baselines** live under `e2e/__screenshots__/`; update them deliberately (`--update-snapshots`) and review the diffs before committing.

#### Example unit test

```javascript
import { describe, it, expect } from 'vitest';
import { resolveIconPaths } from '../lib/icon-paths.js';

describe('resolveIconPaths', () => {
  it('direct and system resolve to different icon sets', () => {
    const direct = resolveIconPaths(undefined, 'direct');
    const system = resolveIconPaths(undefined, 'system');
    expect(direct[128]).not.toBe(system[128]);
  });

  it('profile mode uses the profile color', () => {
    const paths = resolveIconPaths('#FF3B30', 'profile');
    expect(paths[16]).toMatch(/#?FF3B30/i);
  });
});
```

## Documentation

### Code Documentation

Default to no comments. Add a short one only when the **why** is non-obvious (hidden constraint, subtle invariant, workaround for a specific bug). Don't explain **what** the code does — names should do that.

JSDoc is encouraged for exported helpers in `lib/`:

```javascript
/**
 * Resolve the toolbar icon paths for the current mode.
 * @param {string | undefined} profileColor - hex color of the active profile
 * @param {'profile' | 'direct' | 'system'} mode
 * @returns {Record<16|32|48|128, string>}
 */
export function resolveIconPaths(profileColor, mode) { /* ... */ }
```

## Release Checklist

Version numbers are easy to forget — they live in more places than you'd think, and a stale one in the wrong file (e.g. the JSON-LD `softwareVersion` used by Google search results) is user-visible. Work through this list on every release.

### Tier 1 — every version bump (no exceptions)

| File | What to change |
| --- | --- |
| `package.json` | `"version"` field |
| `package-lock.json` | regenerated automatically by `npm install` after `package.json` bumps — commit it |
| `manifest.json` | `"version"` field (this is what Chrome Web Store sees) |
| `options.html` | About panel `<h3>X-Proxy v…</h3>` (user-visible in the extension) |
| `CHANGELOG.md` | move `[Unreleased]` content into a new `## [x.y.z] - YYYY-MM-DD` section; update the `Last updated:` date at the top |
| `docs/index.html` | JSON-LD `"softwareVersion"` (schema.org — surfaces in Google SERPs) |
| `docs/STORE_LISTING.md` | "Current Version" block + push the old version into "Previous Updates" |
| `README.md` | add a new `### vX.Y.Z ✅ (Current - …)` roadmap entry, and clear any stale `(Current - …)` markers on older versions |
| `e2e/options.spec.ts` | the About-section test hard-codes the version string (`X-Proxy v…`) — update the assertion |
| `e2e/__screenshots__/visual.spec.ts/options-about.png` | regenerate so the baseline image shows the new version (see Tier 2 "visual baselines" below — same `npm run test:e2e:update` step handles this) |

### Tier 2 — when user-visible behavior changes

- **Visual baselines (ALWAYS on any CSS / HTML / design-token change)** — run `npm run test:e2e:update` and commit the regenerated PNGs under `e2e/__screenshots__/`. **Then review the PNG diffs in the PR**, not just the file-count delta: a two-pixel shift looks the same as a broken layout in `git diff --stat`. Visual tests that "pass unexpectedly" after a design change are a signal the diff threshold is too loose or the baseline is frozen before the code change landed — treat that as a failure, not a pass.
- **`README.md`** — feature list, domain-routing callouts, screenshots; and the roadmap bullets under the new version
- **`options.html`** About panel `Features:` list — if a headline feature shipped or was removed
- **`docs/STORE_LISTING.md`** — description, screenshots, permissions explanation if a new permission was added
- **`docs/index.html`** — `featureList[]` array in JSON-LD, and any hero/meta copy

### Tier 3 — when internals change

- **`CLAUDE.md`** — architecture, storage schema (`x-proxy-data`), message protocol, proxy-mode branching, or build/test flow
- **`CONTRIBUTING.md`** (this file) — dev setup, test commands, project structure, or contribution conventions
- **`docs/SEO_GUIDE.md`** — only when SEO infrastructure itself changes (meta tags, sitemap, structured data); version string at the top gets the same bump as Tier 1

### Historical / do-not-touch-on-release

- `docs/PRIVACY_POLICY` — only update on actual policy change, not on version bumps
- `docs/BACKGROUND_SERVICE_IMPLEMENTATION.md` — historical design record
- `CHANGELOG.md` entries for prior versions — immutable once released

### Sanity check before opening the PR

```bash
# These two should agree and match the new version
grep '"version"' package.json manifest.json

# Nothing but CHANGELOG entries for old versions should mention the previous version
# (replace 1.6.0 with whatever the previous released version was)
git grep -n 'v1\.6\.0\|1\.6\.0' -- ':!CHANGELOG.md'

# Full E2E suite including visual regression — runs against the built dist/
npm run build && npm run test:e2e

# Serial E2E suite to rule out worker-parallelism flakes before pushing
npm run test:e2e -- --workers=1
```

### Things that are *not* caught automatically

Be aware of the gaps so you don't over-trust the green check:

- **Single-character text drift** (like "v1.5.1" → "v1.6.1" in a 1280×720 screenshot) is smaller than the `maxDiffPixelRatio: 0.01` threshold. `toHaveScreenshot` will NOT fail on it. Content drift of this shape is caught by `toContainText` assertions (see `e2e/options.spec.ts` About test), not by pixel diff. If you bump the version, both the text assertion AND the baseline image must be updated — Tier 1 covers both.
- **CSS transition mid-flight values** can fool axe-core's color-contrast rule after `emulateMedia` flips. `e2e/a11y.spec.ts` handles this via a `disableTransitions` helper that must run *before* `emulateMedia`. Use the same pattern if you add new a11y or visual specs that toggle color scheme.
- **Flakes from worker parallelism** occasionally surface when the same `context.newPage()` is reused across workers. When in doubt, re-run with `--workers=1`; if the failure does not reproduce serially, it's the harness, not your code.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Open an issue with the `question` label.

---

Thank you for contributing to X-Proxy! 🚀
