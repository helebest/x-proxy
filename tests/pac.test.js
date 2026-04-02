import { describe, it, expect } from 'vitest'

/**
 * Extracted toPacUrl() from background.js for testing.
 */
function toPacUrl(input) {
  if (!input || !input.trim()) return null
  const trimmed = input.trim()
  if (/^https?:\/\//i.test(trimmed) || /^file:\/\//i.test(trimmed)) return { url: trimmed }
  if (/^[a-zA-Z]:[\\\/]/.test(trimmed)) return { url: 'file:///' + trimmed.replace(/\\/g, '/') }
  if (trimmed.startsWith('/')) return { url: 'file://' + trimmed }
  return null
}

/**
 * Builds Chrome proxy config from a profile, extracted from activateProxy() for testing.
 */
function buildProxyConfig(profile) {
  const proxyType = profile.config?.type || profile.type || 'http'

  if (proxyType === 'pac') {
    const pacUrl = profile.config?.pacUrl
    if (!pacUrl) throw new Error('Invalid PAC configuration: missing PAC URL')
    const resolved = toPacUrl(pacUrl)
    if (!resolved) throw new Error('Invalid PAC URL format')
    return {
      mode: 'pac_script',
      pacScript: { url: resolved.url }
    }
  }

  const proxyHost = profile.config?.host || profile.host
  const proxyPort = profile.config?.port || profile.port
  if (!proxyHost || !proxyPort) throw new Error('Invalid proxy configuration: missing host or port')

  const routingRules = profile.config?.routingRules
  const useRouting = routingRules?.enabled && routingRules?.domains?.length > 0

  if (useRouting) {
    const normalizedProfile = {
      ...profile,
      config: {
        type: proxyType,
        host: proxyHost,
        port: parseInt(proxyPort),
        routingRules: routingRules
      }
    }
    const pacScript = generatePAC(normalizedProfile)
    return {
      mode: 'pac_script',
      pacScript: { data: pacScript }
    }
  }

  return {
    mode: 'fixed_servers',
    rules: {
      singleProxy: {
        scheme: proxyType,
        host: proxyHost,
        port: parseInt(proxyPort)
      }
    }
  }
}

/**
 * Extracted PAC script generation logic from background.js for testing.
 * This mirrors the actual generatePAC() function.
 */
function generatePAC(profile) {
  const { type, host, port } = profile.config
  const { domains, mode } = profile.config.routingRules

  const routingMode = mode || 'whitelist'

  const proxyServer = type === 'socks5'
    ? `SOCKS5 ${host}:${port}`
    : `PROXY ${host}:${port}`

  if (routingMode === 'whitelist') {
    return `
function FindProxyForURL(url, host) {
  var whitelist = ${JSON.stringify(domains)};
  for (var i = 0; i < whitelist.length; i++) {
    if (shExpMatch(host, whitelist[i])) {
      return "${proxyServer}";
    }
  }
  return "DIRECT";
}`.trim()
  } else {
    return `
function FindProxyForURL(url, host) {
  var blacklist = ${JSON.stringify(domains)};
  for (var i = 0; i < blacklist.length; i++) {
    if (shExpMatch(host, blacklist[i])) {
      return "DIRECT";
    }
  }
  return "${proxyServer}";
}`.trim()
  }
}

/**
 * Simple shExpMatch implementation for testing PAC script logic.
 * Matches the behavior of the PAC runtime function.
 */
function shExpMatch(str, pattern) {
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${regexPattern}$`).test(str)
}

/**
 * Execute a PAC script and return the result for a given URL/host.
 */
function evalPAC(pacScript, url, host) {
  // Inject shExpMatch into the PAC script context
  const fn = new Function('shExpMatch', `
    ${pacScript}
    return FindProxyForURL("${url}", "${host}");
  `)
  return fn(shExpMatch)
}

// ============================================================
// Tests
// ============================================================

describe('generatePAC', () => {
  const httpProfile = {
    config: {
      type: 'http',
      host: 'proxy.example.com',
      port: 8080,
      routingRules: {
        enabled: true,
        mode: 'whitelist',
        domains: ['*.google.com', 'github.com']
      }
    }
  }

  const socks5Profile = {
    config: {
      type: 'socks5',
      host: '127.0.0.1',
      port: 1080,
      routingRules: {
        enabled: true,
        mode: 'blacklist',
        domains: ['localhost', '127.0.0.1', '*.local']
      }
    }
  }

  describe('whitelist mode', () => {
    it('should route whitelisted domains through proxy', () => {
      const pac = generatePAC(httpProfile)
      expect(evalPAC(pac, 'https://www.google.com', 'www.google.com')).toBe('PROXY proxy.example.com:8080')
    })

    it('should route exact match domains through proxy', () => {
      const pac = generatePAC(httpProfile)
      expect(evalPAC(pac, 'https://github.com', 'github.com')).toBe('PROXY proxy.example.com:8080')
    })

    it('should route non-whitelisted domains DIRECT', () => {
      const pac = generatePAC(httpProfile)
      expect(evalPAC(pac, 'https://example.com', 'example.com')).toBe('DIRECT')
    })

    it('should match wildcard subdomains', () => {
      const pac = generatePAC(httpProfile)
      expect(evalPAC(pac, 'https://mail.google.com', 'mail.google.com')).toBe('PROXY proxy.example.com:8080')
      expect(evalPAC(pac, 'https://docs.google.com', 'docs.google.com')).toBe('PROXY proxy.example.com:8080')
    })
  })

  describe('blacklist mode', () => {
    it('should route blacklisted domains DIRECT', () => {
      const pac = generatePAC(socks5Profile)
      expect(evalPAC(pac, 'http://localhost', 'localhost')).toBe('DIRECT')
    })

    it('should route non-blacklisted domains through proxy', () => {
      const pac = generatePAC(socks5Profile)
      expect(evalPAC(pac, 'https://google.com', 'google.com')).toBe('SOCKS5 127.0.0.1:1080')
    })

    it('should match wildcard blacklist patterns', () => {
      const pac = generatePAC(socks5Profile)
      expect(evalPAC(pac, 'http://myapp.local', 'myapp.local')).toBe('DIRECT')
    })
  })

  describe('proxy type formatting', () => {
    it('should format HTTP proxy correctly', () => {
      const pac = generatePAC(httpProfile)
      expect(pac).toContain('PROXY proxy.example.com:8080')
    })

    it('should format SOCKS5 proxy correctly', () => {
      const pac = generatePAC(socks5Profile)
      expect(pac).toContain('SOCKS5 127.0.0.1:1080')
    })
  })

  describe('mode fallback', () => {
    it('should default to whitelist when mode is undefined', () => {
      const profile = {
        config: {
          type: 'http',
          host: 'proxy.test.com',
          port: 3128,
          routingRules: {
            enabled: true,
            mode: undefined,
            domains: ['*.test.com']
          }
        }
      }
      const pac = generatePAC(profile)
      // Whitelist: listed domains use proxy, others go direct
      expect(evalPAC(pac, 'https://app.test.com', 'app.test.com')).toBe('PROXY proxy.test.com:3128')
      expect(evalPAC(pac, 'https://other.com', 'other.com')).toBe('DIRECT')
    })

    it('should NOT default to whitelist when mode is blacklist', () => {
      const profile = {
        config: {
          type: 'http',
          host: 'proxy.test.com',
          port: 3128,
          routingRules: {
            enabled: true,
            mode: 'blacklist',
            domains: ['*.test.com']
          }
        }
      }
      const pac = generatePAC(profile)
      // Blacklist: listed domains go direct, others use proxy
      expect(evalPAC(pac, 'https://app.test.com', 'app.test.com')).toBe('DIRECT')
      expect(evalPAC(pac, 'https://other.com', 'other.com')).toBe('PROXY proxy.test.com:3128')
    })
  })
})

// ============================================================
// buildProxyConfig tests
// ============================================================

describe('buildProxyConfig', () => {
  describe('PAC type profiles', () => {
    it('should return pac_script mode with url for HTTP PAC URL', () => {
      const profile = {
        config: {
          type: 'pac',
          pacUrl: 'http://example.com/proxy.pac'
        }
      }
      const config = buildProxyConfig(profile)
      expect(config).toEqual({
        mode: 'pac_script',
        pacScript: { url: 'http://example.com/proxy.pac' }
      })
    })

    it('should return pac_script mode with url for file:// PAC URL', () => {
      const profile = {
        config: {
          type: 'pac',
          pacUrl: 'file:///C:/data/proxy.pac'
        }
      }
      const config = buildProxyConfig(profile)
      expect(config).toEqual({
        mode: 'pac_script',
        pacScript: { url: 'file:///C:/data/proxy.pac' }
      })
    })

    it('should convert Windows path to file:// URL', () => {
      const profile = {
        config: {
          type: 'pac',
          pacUrl: 'C:\\data\\proxy.pac'
        }
      }
      const config = buildProxyConfig(profile)
      expect(config).toEqual({
        mode: 'pac_script',
        pacScript: { url: 'file:///C:/data/proxy.pac' }
      })
    })

    it('should throw error when pacUrl is missing', () => {
      const profile = {
        config: { type: 'pac' }
      }
      expect(() => buildProxyConfig(profile)).toThrow('missing PAC URL')
    })

    it('should throw error when pacUrl is invalid', () => {
      const profile = {
        config: { type: 'pac', pacUrl: 'not-a-valid-path' }
      }
      expect(() => buildProxyConfig(profile)).toThrow('Invalid PAC URL format')
    })
  })

  describe('http/socks5 profiles (existing behavior)', () => {
    it('should return fixed_servers for http without routing rules', () => {
      const profile = {
        config: {
          type: 'http',
          host: 'proxy.example.com',
          port: 8080
        }
      }
      const config = buildProxyConfig(profile)
      expect(config).toEqual({
        mode: 'fixed_servers',
        rules: {
          singleProxy: { scheme: 'http', host: 'proxy.example.com', port: 8080 }
        }
      })
    })

    it('should return pac_script with data for http with routing rules', () => {
      const profile = {
        config: {
          type: 'http',
          host: 'proxy.example.com',
          port: 8080,
          routingRules: {
            enabled: true,
            mode: 'whitelist',
            domains: ['*.google.com']
          }
        }
      }
      const config = buildProxyConfig(profile)
      expect(config.mode).toBe('pac_script')
      expect(config.pacScript.data).toBeDefined()
      expect(config.pacScript.url).toBeUndefined()
    })

    it('should throw error when host/port missing for http type', () => {
      const profile = {
        config: { type: 'http' }
      }
      expect(() => buildProxyConfig(profile)).toThrow('missing host or port')
    })
  })
})
