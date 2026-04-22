import { describe, it, expect } from 'vitest'
import { resolveIconPaths, COLOR_NAMES } from '../lib/icon-paths.js'

// Pure-function contract for the toolbar icon path resolver.
// The background service worker's updateIcon() delegates to this resolver;
// exercising it here keeps the three-way branch (profile / direct / system)
// covered without needing a chrome-action stub.

describe('resolveIconPaths — three-way branching', () => {
  it('returns active-{color} paths for all 4 sizes when given a known profile color', () => {
    const paths = resolveIconPaths('#007AFF', 'profile')
    expect(paths[16]).toBe('icons/icon-active-blue-16.png')
    expect(paths[32]).toBe('icons/icon-active-blue-32.png')
    expect(paths[48]).toBe('icons/icon-active-blue-48.png')
    expect(paths[128]).toBe('icons/icon-active-blue-128.png')
  })

  it('returns icon-direct paths for all 4 sizes when mode is "direct" and no profileColor', () => {
    const paths = resolveIconPaths(null, 'direct')
    expect(paths[16]).toBe('icons/icon-direct-16.png')
    expect(paths[32]).toBe('icons/icon-direct-32.png')
    expect(paths[48]).toBe('icons/icon-direct-48.png')
    expect(paths[128]).toBe('icons/icon-direct-128.png')
  })

  it('returns icon-inactive paths when mode is "system" and no profileColor', () => {
    const paths = resolveIconPaths(null, 'system')
    expect(paths[16]).toBe('icons/icon-inactive-16.png')
    expect(paths[32]).toBe('icons/icon-inactive-32.png')
    expect(paths[48]).toBe('icons/icon-inactive-48.png')
    expect(paths[128]).toBe('icons/icon-inactive-128.png')
  })

  it('profile color wins over mode — active profile with mode="direct" should not happen but must resolve to color', () => {
    // Defensive: the caller contract is profileColor non-null implies mode==='profile'.
    // If anyone ever passes an inconsistent (color, 'direct') pair, color wins to
    // avoid the worse failure of showing a bypass icon while a proxy is active.
    const paths = resolveIconPaths('#F44336', 'direct')
    expect(paths[16]).toBe('icons/icon-active-red-16.png')
  })

  it('direct and system resolve to DIFFERENT paths (the reason this helper exists)', () => {
    const direct = resolveIconPaths(null, 'direct')
    const system = resolveIconPaths(null, 'system')
    expect(direct[16]).not.toBe(system[16])
    expect(direct[128]).not.toBe(system[128])
  })

  it('falls back to icon-inactive for unknown modes', () => {
    const paths = resolveIconPaths(null, 'unknown-mode')
    expect(paths[16]).toBe('icons/icon-inactive-16.png')
  })

  it('falls back to icon-inactive when profileColor is an unrecognized hex', () => {
    // If a user-configured color ever slips past COLOR_NAMES we'd rather show
    // the inactive gray than a broken/404 icon path.
    const paths = resolveIconPaths('#123456', 'profile')
    expect(paths[16]).toBe('icons/icon-inactive-16.png')
  })
})

describe('COLOR_NAMES — kept in sync with generate-icons.js PROFILE_COLORS', () => {
  it('has all 8 canonical profile colors', () => {
    expect(COLOR_NAMES['#007AFF']).toBe('blue')
    expect(COLOR_NAMES['#4CAF50']).toBe('green')
    expect(COLOR_NAMES['#F44336']).toBe('red')
    expect(COLOR_NAMES['#FF9800']).toBe('orange')
    expect(COLOR_NAMES['#9C27B0']).toBe('purple')
    expect(COLOR_NAMES['#009688']).toBe('teal')
    expect(COLOR_NAMES['#FFC107']).toBe('yellow')
    expect(COLOR_NAMES['#607D8B']).toBe('gray')
  })
})
