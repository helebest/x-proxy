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
      auth: profile.config?.auth || { username: '', password: '' },
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
      auth: config.auth || { username: '', password: '' },
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
      auth: profile.config?.auth || { username: '', password: '' },
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

  it('should default auth to empty username and password', () => {
    const profile = { id: '1', name: 'Test' }
    const result = normalizeProfile(profile)

    expect(result.config.auth).toEqual({ username: '', password: '' })
  })

  it('should preserve existing auth credentials', () => {
    const profile = {
      id: '1',
      name: 'Test',
      config: {
        auth: { username: 'user1', password: 'pass1' }
      }
    }
    const result = normalizeProfile(profile)

    expect(result.config.auth).toEqual({ username: 'user1', password: 'pass1' })
  })

  it('should not lose auth after normalization round-trip', () => {
    const original = {
      id: '1',
      name: 'Test',
      config: {
        auth: { username: 'myuser', password: 'mypass' }
      }
    }

    const normalized = normalizeProfile(original)
    const reloaded = normalizeProfile(normalized)

    expect(reloaded.config.auth).toEqual({ username: 'myuser', password: 'mypass' })
  })

  it('should handle legacy profile without auth field (backward compat)', () => {
    // Simulate a profile saved before auth feature existed (flat structure)
    const legacy = {
      id: '1',
      name: 'Legacy Proxy',
      type: 'socks5',
      host: '127.0.0.1',
      port: 1080
      // no config, no auth — old flat format
    }

    const normalized = normalizeProfile(legacy)
    expect(normalized.config.auth).toEqual({ username: '', password: '' })
    expect(normalized.config.type).toBe('socks5')
    expect(normalized.config.host).toBe('127.0.0.1')
    expect(normalized.config.port).toBe(1080)

    // Save preserves auth default
    const saved = normalizeProfileForSave(normalized)
    expect(saved.config.auth).toEqual({ username: '', password: '' })
    expect(saved.config.type).toBe('socks5')
    expect(saved.config.host).toBe('127.0.0.1')
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

  it('should include auth default values', () => {
    const profile = { id: '1', name: 'Test' }
    const result = normalizeProfileForSave(profile)

    expect(result.config.auth).toEqual({ username: '', password: '' })
  })

  it('should preserve auth when saving', () => {
    const profile = {
      id: '1',
      name: 'Test',
      config: {
        auth: { username: 'saveduser', password: 'savedpass' }
      }
    }
    const result = normalizeProfileForSave(profile)

    expect(result.config.auth).toEqual({ username: 'saveduser', password: 'savedpass' })
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

  it('should default auth to empty username and password', () => {
    const profile = { id: '1', name: 'Test' }
    const result = popupNormalizeProfile(profile)

    expect(result.config.auth).toEqual({ username: '', password: '' })
  })

  it('should preserve auth from config.auth', () => {
    const profile = {
      id: '1',
      name: 'Test',
      config: {
        auth: { username: 'popupuser', password: 'popuppass' }
      }
    }
    const result = popupNormalizeProfile(profile)

    expect(result.config.auth).toEqual({ username: 'popupuser', password: 'popuppass' })
  })

  it('should handle legacy profile without auth in popup (backward compat)', () => {
    const legacy = {
      id: '1',
      name: 'Old Profile',
      config: {
        type: 'http',
        host: 'proxy.example.com',
        port: 8080,
        routingRules: { enabled: true, mode: 'whitelist', domains: ['*.google.com'] }
      }
    }
    const result = popupNormalizeProfile(legacy)

    expect(result.config.auth).toEqual({ username: '', password: '' })
    expect(result.config.host).toBe('proxy.example.com')
    expect(result.config.routingRules.enabled).toBe(true)
  })
})
