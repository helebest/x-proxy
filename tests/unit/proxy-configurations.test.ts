import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProxyManager } from '@/core/ProxyManager';
import { ProxyType, ProxyConfig } from '@/types/proxy';
import { validateProxyConfig } from '@/utils/validation';

describe('Proxy Configurations', () => {
  let proxyManager: ProxyManager;

  beforeEach(async () => {
    proxyManager = new ProxyManager();
    await proxyManager.initialize();
    vi.clearAllMocks();
  });

  describe('HTTP Proxy Configuration', () => {
    it('should handle basic HTTP proxy', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };

      const profile = await proxyManager.createProfile('HTTP Basic', config);
      expect(profile.config.type).toBe(ProxyType.HTTP);
      expect(profile.config.host).toBe('proxy.example.com');
      expect(profile.config.port).toBe(8080);
    });

    it('should handle HTTP proxy with authentication', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'secure.proxy.com',
        port: 8080,
        auth: {
          username: 'user123',
          password: 'pass456'
        }
      };

      const profile = await proxyManager.createProfile('HTTP Auth', config);
      expect(profile.config.auth).toBeDefined();
      expect(profile.config.auth?.username).toBe('user123');
    });

    it('should handle HTTP proxy with bypass list', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.company.com',
        port: 3128,
        bypassList: [
          'localhost',
          '127.0.0.1',
          '*.internal.company.com',
          '10.0.0.0/8',
          '192.168.0.0/16'
        ]
      };

      const profile = await proxyManager.createProfile('HTTP Bypass', config);
      expect(profile.config.bypassList).toBeDefined();
      expect(profile.config.bypassList).toContain('localhost');
      expect(profile.config.bypassList).toContain('*.internal.company.com');
    });
  });

  describe('HTTPS Proxy Configuration', () => {
    it('should handle HTTPS proxy', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTPS,
        host: 'secure.proxy.com',
        port: 443
      };

      const profile = await proxyManager.createProfile('HTTPS Proxy', config);
      expect(profile.config.type).toBe(ProxyType.HTTPS);
      expect(profile.config.port).toBe(443);
    });

    it('should handle HTTPS proxy with custom port', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTPS,
        host: 'custom.proxy.com',
        port: 8443
      };

      const profile = await proxyManager.createProfile('HTTPS Custom', config);
      expect(profile.config.port).toBe(8443);
    });
  });

  describe('SOCKS Proxy Configuration', () => {
    it('should handle SOCKS4 proxy', async () => {
      const config: ProxyConfig = {
        type: ProxyType.SOCKS4,
        host: 'socks4.proxy.com',
        port: 1080
      };

      const profile = await proxyManager.createProfile('SOCKS4', config);
      expect(profile.config.type).toBe(ProxyType.SOCKS4);
    });

    it('should handle SOCKS5 proxy', async () => {
      const config: ProxyConfig = {
        type: ProxyType.SOCKS5,
        host: 'socks5.proxy.com',
        port: 1080
      };

      const profile = await proxyManager.createProfile('SOCKS5', config);
      expect(profile.config.type).toBe(ProxyType.SOCKS5);
    });

    it('should handle SOCKS5 with authentication', async () => {
      const config: ProxyConfig = {
        type: ProxyType.SOCKS5,
        host: 'auth.socks5.com',
        port: 1080,
        auth: {
          username: 'socksuser',
          password: 'sockspass'
        }
      };

      const profile = await proxyManager.createProfile('SOCKS5 Auth', config);
      expect(profile.config.auth).toBeDefined();
    });
  });

  describe('PAC Script Configuration', () => {
    it('should handle PAC URL', async () => {
      const config: ProxyConfig = {
        type: ProxyType.PAC,
        pacUrl: 'http://proxy.company.com/proxy.pac'
      };

      const profile = await proxyManager.createProfile('PAC URL', config);
      expect(profile.config.type).toBe(ProxyType.PAC);
      expect(profile.config.pacUrl).toBe('http://proxy.company.com/proxy.pac');
    });

    it('should handle inline PAC data', async () => {
      const pacScript = `
        function FindProxyForURL(url, host) {
          if (dnsDomainIs(host, ".example.com"))
            return "PROXY proxy.example.com:8080";
          return "DIRECT";
        }
      `;

      const config: ProxyConfig = {
        type: ProxyType.PAC,
        pacData: pacScript
      };

      const profile = await proxyManager.createProfile('PAC Inline', config);
      expect(profile.config.pacData).toBeDefined();
      expect(profile.config.pacData).toContain('FindProxyForURL');
    });

    it('should handle PAC with fallback proxies', async () => {
      const pacScript = `
        function FindProxyForURL(url, host) {
          if (dnsDomainIs(host, ".secure.com"))
            return "PROXY primary.proxy.com:8080; PROXY backup.proxy.com:8080; DIRECT";
          return "DIRECT";
        }
      `;

      const config: ProxyConfig = {
        type: ProxyType.PAC,
        pacData: pacScript
      };

      const profile = await proxyManager.createProfile('PAC Fallback', config);
      expect(profile.config.pacData).toContain('primary.proxy.com');
      expect(profile.config.pacData).toContain('backup.proxy.com');
    });
  });

  describe('Direct Connection Configuration', () => {
    it('should handle direct connection (no proxy)', async () => {
      const config: ProxyConfig = {
        type: ProxyType.DIRECT
      };

      const profile = await proxyManager.createProfile('Direct', config);
      expect(profile.config.type).toBe(ProxyType.DIRECT);
      expect(profile.config.host).toBeUndefined();
      expect(profile.config.port).toBeUndefined();
    });
  });

  describe('System Proxy Configuration', () => {
    it('should handle system proxy settings', async () => {
      const config: ProxyConfig = {
        type: ProxyType.SYSTEM
      };

      const profile = await proxyManager.createProfile('System', config);
      expect(profile.config.type).toBe(ProxyType.SYSTEM);
    });
  });

  describe('Mixed Protocol Configuration', () => {
    it('should handle different protocols for HTTP/HTTPS', async () => {
      // Using PAC script to define different proxies for different protocols
      const pacScript = `
        function FindProxyForURL(url, host) {
          if (url.substring(0, 5) === "https")
            return "PROXY https-proxy.com:443";
          else if (url.substring(0, 4) === "http")
            return "PROXY http-proxy.com:8080";
          else if (url.substring(0, 3) === "ftp")
            return "SOCKS5 socks.proxy.com:1080";
          return "DIRECT";
        }
      `;

      const config: ProxyConfig = {
        type: ProxyType.PAC,
        pacData: pacScript
      };

      const profile = await proxyManager.createProfile('Mixed Protocol', config);
      expect(profile.config.pacData).toContain('https-proxy.com');
      expect(profile.config.pacData).toContain('http-proxy.com');
      expect(profile.config.pacData).toContain('socks.proxy.com');
    });
  });

  describe('Invalid Configurations', () => {
    it('should reject proxy with invalid host', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: '',
        port: 8080
      };

      await expect(
        proxyManager.createProfile('Invalid Host', config)
      ).rejects.toThrow();
    });

    it('should reject proxy with invalid port', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: -1
      };

      await expect(
        proxyManager.createProfile('Invalid Port', config)
      ).rejects.toThrow();
    });

    it('should reject proxy with port out of range', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 70000
      };

      await expect(
        proxyManager.createProfile('Port Out of Range', config)
      ).rejects.toThrow();
    });

    it('should reject PAC without URL or data', async () => {
      const config: ProxyConfig = {
        type: ProxyType.PAC
      };

      await expect(
        proxyManager.createProfile('Invalid PAC', config)
      ).rejects.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate HTTP proxy configuration', () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'valid.proxy.com',
        port: 8080
      };

      const result = validateProxyConfig(config);
      expect(result.isValid).toBe(true);
    });

    it('should validate bypass list format', () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.com',
        port: 8080,
        bypassList: [
          'localhost',
          '127.0.0.1',
          '::1',
          '*.local',
          '10.0.0.0/8',
          '192.168.0.0/16',
          'example.com',
          '.example.com',
          'sub.example.com'
        ]
      };

      const result = validateProxyConfig(config);
      expect(result.isValid).toBe(true);
    });

    it('should validate authentication credentials', () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.com',
        port: 8080,
        auth: {
          username: 'validuser',
          password: 'validpass123!@#'
        }
      };

      const result = validateProxyConfig(config);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid bypass list entries', () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.com',
        port: 8080,
        bypassList: ['invalid..domain', 'http://invalid', '']
      };

      const result = validateProxyConfig(config);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Chrome Proxy API Conversion', () => {
    it('should convert to Chrome fixed_servers mode', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };

      const profile = await proxyManager.createProfile('Chrome Fixed', config);
      await proxyManager.activateProfile(profile.id);

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.objectContaining({
            mode: 'fixed_servers'
          })
        }),
        expect.any(Function)
      );
    });

    it('should convert to Chrome pac_script mode', async () => {
      const config: ProxyConfig = {
        type: ProxyType.PAC,
        pacUrl: 'http://proxy.example.com/proxy.pac'
      };

      const profile = await proxyManager.createProfile('Chrome PAC', config);
      await proxyManager.activateProfile(profile.id);

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.objectContaining({
            mode: 'pac_script'
          })
        }),
        expect.any(Function)
      );
    });

    it('should convert to Chrome direct mode', async () => {
      const config: ProxyConfig = {
        type: ProxyType.DIRECT
      };

      const profile = await proxyManager.createProfile('Chrome Direct', config);
      await proxyManager.activateProfile(profile.id);

      expect(chrome.proxy.settings.clear).toHaveBeenCalled();
    });

    it('should convert to Chrome system mode', async () => {
      const config: ProxyConfig = {
        type: ProxyType.SYSTEM
      };

      const profile = await proxyManager.createProfile('Chrome System', config);
      await proxyManager.activateProfile(profile.id);

      expect(chrome.proxy.settings.clear).toHaveBeenCalled();
    });
  });
});
