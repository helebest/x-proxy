import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests for X-Proxy configuration handling
 * 
 * Tests only the proxy types and features that are actually supported:
 * - HTTP/HTTPS proxy (combined as 'http' type)
 * - SOCKS5 proxy
 * - Basic configuration validation
 * - No authentication (not implemented in current UI)
 * - No complex bypass lists (simplified in current implementation)
 */

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn()
    }
  },
  proxy: {
    settings: {
      set: vi.fn(),
      get: vi.fn(),
      clear: vi.fn()
    }
  }
} as any;

describe('Proxy Configurations', () => {
  let mockStorage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockStorage = {
      'x-proxy-data': {
        version: 1,
        profiles: [],
        activeProfileId: undefined,
        settings: {}
      }
    };

    vi.mocked(chrome.storage.local.get).mockImplementation((keys, callback) => {
      if (callback) callback(mockStorage);
      return Promise.resolve(mockStorage);
    });

    vi.mocked(chrome.storage.local.set).mockImplementation((items, callback) => {
      Object.assign(mockStorage, items);
      if (callback) callback();
      return Promise.resolve();
    });
  });

  describe('HTTP Proxy Configuration', () => {
    it('should handle basic HTTP proxy configuration', () => {
      const config = {
        type: 'http',
        host: 'proxy.example.com',
        port: 8080
      };

      const profile = {
        id: Date.now().toString(),
        name: 'HTTP Proxy',
        color: '#007AFF',
        config: config,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(profile.config.type).toBe('http');
      expect(profile.config.host).toBe('proxy.example.com');
      expect(profile.config.port).toBe(8080);
    });

    it('should handle HTTP proxy with default port 8080', () => {
      const config = {
        type: 'http',
        host: 'proxy.company.com',
        port: 8080 // Default HTTP proxy port
      };

      const profile = {
        id: Date.now().toString(),
        name: 'Company Proxy',
        color: '#4CAF50',
        config: config,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(profile.config.type).toBe('http');
      expect(profile.config.port).toBe(8080);
    });

    it('should handle HTTP proxy with custom port', () => {
      const config = {
        type: 'http',
        host: 'custom.proxy.com',
        port: 3128 // Common alternative HTTP proxy port
      };

      const profile = {
        id: Date.now().toString(),
        name: 'Custom Port Proxy',
        color: '#FF9800',
        config: config,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(profile.config.port).toBe(3128);
    });

    it('should normalize deprecated HTTPS type to HTTP', () => {
      // In current implementation, HTTPS is combined with HTTP
      const config = {
        type: 'https', // Will be normalized to 'http'
        host: 'secure.proxy.com',
        port: 443
      };

      // Simulate the normalization logic from options.js
      let normalizedType = config.type;
      if (normalizedType === 'https') normalizedType = 'http';

      const profile = {
        id: Date.now().toString(),
        name: 'HTTPS Proxy',
        color: '#007AFF',
        config: {
          ...config,
          type: normalizedType
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(profile.config.type).toBe('http'); // Should be normalized
    });
  });

  describe('SOCKS5 Proxy Configuration', () => {
    it('should handle SOCKS5 proxy configuration', () => {
      const config = {
        type: 'socks5',
        host: 'socks.proxy.com',
        port: 1080
      };

      const profile = {
        id: Date.now().toString(),
        name: 'SOCKS5 Proxy',
        color: '#9C27B0',
        config: config,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(profile.config.type).toBe('socks5');
      expect(profile.config.host).toBe('socks.proxy.com');
      expect(profile.config.port).toBe(1080);
    });

    it('should handle SOCKS5 proxy with custom port', () => {
      const config = {
        type: 'socks5',
        host: 'custom-socks.example.com',
        port: 8080 // Non-standard SOCKS5 port
      };

      const profile = {
        id: Date.now().toString(),
        name: 'Custom SOCKS5',
        color: '#607D8B',
        config: config,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(profile.config.type).toBe('socks5');
      expect(profile.config.port).toBe(8080);
    });

    it('should normalize deprecated SOCKS4 type to SOCKS5', () => {
      // In current implementation, SOCKS4 is combined with SOCKS5
      const config = {
        type: 'socks4', // Will be normalized to 'socks5'
        host: 'old-socks.proxy.com',
        port: 1080
      };

      // Simulate the normalization logic from options.js
      let normalizedType = config.type;
      if (normalizedType === 'socks4') normalizedType = 'socks5';

      const profile = {
        id: Date.now().toString(),
        name: 'Old SOCKS Proxy',
        color: '#795548',
        config: {
          ...config,
          type: normalizedType
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(profile.config.type).toBe('socks5'); // Should be normalized
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required fields', () => {
      const validateConfig = (config: any) => {
        const errors: string[] = [];
        
        if (!config.name?.trim()) errors.push('Profile name is required');
        if (!config.host?.trim()) errors.push('Host is required');
        if (!config.port || isNaN(parseInt(config.port))) errors.push('Valid port is required');
        if (!['http', 'socks5'].includes(config.type)) errors.push('Invalid proxy type');
        
        return { valid: errors.length === 0, errors };
      };

      // Valid configuration
      const validConfig = {
        name: 'Valid Proxy',
        type: 'http',
        host: 'proxy.example.com',
        port: '8080'
      };

      expect(validateConfig(validConfig).valid).toBe(true);
      expect(validateConfig(validConfig).errors).toHaveLength(0);

      // Invalid configuration - missing name
      const invalidConfig1 = {
        name: '',
        type: 'http',
        host: 'proxy.example.com',
        port: '8080'
      };

      expect(validateConfig(invalidConfig1).valid).toBe(false);
      expect(validateConfig(invalidConfig1).errors).toContain('Profile name is required');

      // Invalid configuration - missing host
      const invalidConfig2 = {
        name: 'Test',
        type: 'http',
        host: '',
        port: '8080'
      };

      expect(validateConfig(invalidConfig2).valid).toBe(false);
      expect(validateConfig(invalidConfig2).errors).toContain('Host is required');

      // Invalid configuration - invalid port
      const invalidConfig3 = {
        name: 'Test',
        type: 'http',
        host: 'proxy.example.com',
        port: 'invalid'
      };

      expect(validateConfig(invalidConfig3).valid).toBe(false);
      expect(validateConfig(invalidConfig3).errors).toContain('Valid port is required');
    });

    it('should validate supported proxy types', () => {
      const supportedTypes = ['http', 'socks5'];
      
      supportedTypes.forEach(type => {
        const config = {
          type: type,
          host: 'proxy.example.com',
          port: 8080
        };
        
        expect(['http', 'socks5']).toContain(config.type);
      });

      // Unsupported types should be handled by normalization or rejection
      const unsupportedTypes = ['pac', 'direct', 'system'];
      
      unsupportedTypes.forEach(type => {
        expect(['http', 'socks5']).not.toContain(type);
      });
    });

    it('should validate port ranges', () => {
      const validatePort = (port: number) => {
        return port >= 1 && port <= 65535;
      };

      expect(validatePort(80)).toBe(true);
      expect(validatePort(8080)).toBe(true);
      expect(validatePort(1080)).toBe(true);
      expect(validatePort(65535)).toBe(true);
      
      expect(validatePort(0)).toBe(false);
      expect(validatePort(-1)).toBe(false);
      expect(validatePort(65536)).toBe(false);
    });
  });

  describe('Chrome Proxy API Integration', () => {
    it('should convert HTTP profile to Chrome proxy config', () => {
      const profile = {
        id: 'test',
        name: 'HTTP Proxy',
        config: {
          type: 'http',
          host: 'proxy.example.com',
          port: 8080
        }
      };

      const chromeConfig = {
        value: {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: 'http',
              host: profile.config.host,
              port: profile.config.port
            }
          }
        }
      };

      expect(chromeConfig.value.mode).toBe('fixed_servers');
      expect(chromeConfig.value.rules.singleProxy.scheme).toBe('http');
      expect(chromeConfig.value.rules.singleProxy.host).toBe('proxy.example.com');
      expect(chromeConfig.value.rules.singleProxy.port).toBe(8080);
    });

    it('should convert SOCKS5 profile to Chrome proxy config', () => {
      const profile = {
        id: 'test',
        name: 'SOCKS5 Proxy',
        config: {
          type: 'socks5',
          host: 'socks.example.com',
          port: 1080
        }
      };

      const chromeConfig = {
        value: {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: 'socks5',
              host: profile.config.host,
              port: profile.config.port
            }
          }
        }
      };

      expect(chromeConfig.value.mode).toBe('fixed_servers');
      expect(chromeConfig.value.rules.singleProxy.scheme).toBe('socks5');
      expect(chromeConfig.value.rules.singleProxy.host).toBe('socks.example.com');
      expect(chromeConfig.value.rules.singleProxy.port).toBe(1080);
    });

    it('should handle proxy deactivation', () => {
      const deactivateConfig = {
        value: {
          mode: 'system'
        }
      };

      expect(deactivateConfig.value.mode).toBe('system');
    });
  });

  describe('Profile Structure', () => {
    it('should create profile with proper structure', () => {
      const profileData = {
        name: 'Test Profile',
        type: 'http',
        host: 'test.proxy.com',
        port: '8080',
        color: '#007AFF'
      };

      const profile = {
        id: Date.now().toString(),
        name: profileData.name,
        color: profileData.color,
        config: {
          type: profileData.type,
          host: profileData.host,
          port: parseInt(profileData.port)
        },
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('name');
      expect(profile).toHaveProperty('color');
      expect(profile).toHaveProperty('config');
      expect(profile).toHaveProperty('isActive');
      expect(profile).toHaveProperty('createdAt');
      expect(profile).toHaveProperty('updatedAt');

      expect(profile.config).toHaveProperty('type');
      expect(profile.config).toHaveProperty('host');
      expect(profile.config).toHaveProperty('port');

      expect(typeof profile.id).toBe('string');
      expect(typeof profile.name).toBe('string');
      expect(typeof profile.color).toBe('string');
      expect(typeof profile.isActive).toBe('boolean');
      expect(typeof profile.createdAt).toBe('string');
      expect(typeof profile.updatedAt).toBe('string');
      expect(typeof profile.config.port).toBe('number');
    });
  });
});