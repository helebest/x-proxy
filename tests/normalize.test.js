import { describe, it, expect } from 'vitest'

/**
 * Extracted normalization logic from options.js and popup.js for testing.
 * These mirror the actual functions used in the extension.
 */

// From options.js: OptionsManager.normalizeProfile()
function normalizeProfile(profile) {
  return {
    id: profile.id || crypto.randomUUID(),
    name: profile.name || 'Unnamed Profile',
    color: profile.color || '#007AFF',
    config: {
      type: profile.type || 'http',
      host: profile.host || '',
      port: parseInt(profile.port) || 8080,
      bypassList: profile.bypassList || [],
      routingRules: profile.config?.routingRules || {
        enabled: false,
        mode: 'whitelist',
        domains: []
      }
    },
  }
}

// From options.js: OptionsManager.normalizeProfileForSave()
function normalizeProfileForSave(profile) {
  const config = profile.config || {}
  return {
    id: profile.id,
    name: (profile.name || 'Unnamed Profile').trim(),
    color: profile.color || '#007AFF',
    config: {
      type: config.type || profile.type || 'http',
      host: config.host || profile.host || '',
      port: parseInt(config.port || profile.port) || 8080,
      bypassList: config.bypassList || profile.bypassList || [],
      routingRules: config.routingRules || profile.routingRules || {
        enabled: false,
        mode: 'whitelist',
        domains: []
      }
    },
  }
}

// From popup.js: normalizeProfile()
function popupNormalizeProfile(profile) {
  return {
    id: profile.id || 'unknown',
    name: profile.name || 'Unnamed',
    color: profile.color || '#007AFF',
    config: {
      type: profile.config?.type || profile.type || 'http',
      host: profile.config?.host || profile.host || '',
      port: parseInt(profile.config?.port || profile.port) || 8080,
      routingRules: profile.config?.routingRules || {
        enabled: false,
        mode: 'whitelist',
        domains: []
      }
    },
  }
}

// ============================================================
// Tests
// ============================================================

describe('normalizeProfile (options.js)', () => {
  it('should include mode in routingRules fallback', () => {
    const profile = { id: '1', name: 'Test' }
    const result = normalizeProfile(profile)

    expect(result.config.routingRules).toEqual({
      enabled: false,
      mode: 'whitelist',
      domains: []
    })
  })

  it('should preserve existing routingRules with mode', () => {
    const profile = {
      id: '1',
      name: 'Test',
      config: {
        routingRules: {
          enabled: true,
          mode: 'blacklist',
          domains: ['*.google.com']
        }
      }
    }
    const result = normalizeProfile(profile)

    expect(result.config.routingRules).toEqual({
      enabled: true,
      mode: 'blacklist',
      domains: ['*.google.com']
    })
  })

  it('should not lose mode after normalization round-trip', () => {
    const original = {
      id: '1',
      name: 'Test',
      config: {
        routingRules: {
          enabled: true,
          mode: 'blacklist',
          domains: ['localhost', '127.0.0.1']
        }
      }
    }

    // Simulate: normalize -> save -> reload -> normalize
    const normalized = normalizeProfile(original)
    const reloaded = normalizeProfile(normalized)

    expect(reloaded.config.routingRules.mode).toBe('blacklist')
    expect(reloaded.config.routingRules.enabled).toBe(true)
    expect(reloaded.config.routingRules.domains).toEqual(['localhost', '127.0.0.1'])
  })

  it('should default to whitelist when profile has empty config', () => {
    const profile = { id: '1', name: 'Test', config: {} }
    const result = normalizeProfile(profile)

    expect(result.config.routingRules.mode).toBe('whitelist')
  })
})

describe('normalizeProfileForSave (options.js)', () => {
  it('should include mode in routingRules fallback', () => {
    const profile = { id: '1', name: 'Test' }
    const result = normalizeProfileForSave(profile)

    expect(result.config.routingRules).toEqual({
      enabled: false,
      mode: 'whitelist',
      domains: []
    })
  })

  it('should preserve blacklist mode when saving', () => {
    const profile = {
      id: '1',
      name: 'Test',
      config: {
        routingRules: {
          enabled: true,
          mode: 'blacklist',
          domains: ['*.example.com']
        }
      }
    }
    const result = normalizeProfileForSave(profile)

    expect(result.config.routingRules.mode).toBe('blacklist')
  })

  it('should use config.routingRules over profile.routingRules', () => {
    const profile = {
      id: '1',
      name: 'Test',
      config: {
        routingRules: { enabled: true, mode: 'blacklist', domains: ['a.com'] }
      },
      routingRules: { enabled: false, mode: 'whitelist', domains: [] }
    }
    const result = normalizeProfileForSave(profile)

    expect(result.config.routingRules.mode).toBe('blacklist')
    expect(result.config.routingRules.enabled).toBe(true)
  })
})

describe('normalizeProfile (popup.js)', () => {
  it('should include mode in routingRules fallback', () => {
    const profile = { id: '1', name: 'Test' }
    const result = popupNormalizeProfile(profile)

    expect(result.config.routingRules).toEqual({
      enabled: false,
      mode: 'whitelist',
      domains: []
    })
  })

  it('should preserve existing routingRules', () => {
    const profile = {
      id: '1',
      name: 'Test',
      config: {
        routingRules: {
          enabled: true,
          mode: 'blacklist',
          domains: ['*.blocked.com']
        }
      }
    }
    const result = popupNormalizeProfile(profile)

    expect(result.config.routingRules.mode).toBe('blacklist')
  })
})
