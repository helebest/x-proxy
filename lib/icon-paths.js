// Single source of truth for toolbar-icon paths, color mapping, and size set.
// Imported by the background service worker, the icon generator script, and
// the options page to keep profile-color handling consistent across build
// and runtime.

export const PROFILE_COLORS = [
  { hex: '#007AFF', name: 'blue'   },
  { hex: '#4CAF50', name: 'green'  },
  { hex: '#F44336', name: 'red'    },
  { hex: '#FF9800', name: 'orange' },
  { hex: '#9C27B0', name: 'purple' },
  { hex: '#009688', name: 'teal'   },
  { hex: '#FFC107', name: 'yellow' },
  { hex: '#607D8B', name: 'gray'   },
];

export const COLOR_NAMES = Object.fromEntries(
  PROFILE_COLORS.map(c => [c.hex, c.name])
);

export const ICON_SIZES = [16, 32, 48, 128];

function buildPaths(prefix) {
  const paths = {};
  for (const size of ICON_SIZES) {
    paths[size] = `icons/${prefix}-${size}.png`;
  }
  return paths;
}

/**
 * Resolve the four-size toolbar icon path set for the current proxy state.
 * Precedence:
 *   1. A known profileColor always wins — even if mode is inconsistent —
 *      because a bypass icon while a proxy is active would mislead worse
 *      than showing the wrong mode family.
 *   2. mode === 'direct' picks the icon-direct family.
 *   3. Anything else (system, unknown, null) falls back to icon-inactive.
 * @param {string|null} profileColor - hex like '#007AFF' or null
 * @param {string|null} mode - 'direct' | 'system' | 'profile' | anything
 * @returns {{16: string, 32: string, 48: string, 128: string}}
 */
export function resolveIconPaths(profileColor, mode) {
  const colorName = profileColor ? COLOR_NAMES[profileColor] : null;
  if (colorName) return buildPaths(`icon-active-${colorName}`);
  if (mode === 'direct') return buildPaths('icon-direct');
  return buildPaths('icon-inactive');
}
