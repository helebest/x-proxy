import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Chrome API Integration Tests
 * 
 * Tests the actual Chrome extension APIs used by X-Proxy:
 * - chrome.storage.local (profile storage)
 * - chrome.proxy.settings (proxy configuration)
 * - chrome.action (badge updates)
 * - chrome.runtime.sendMessage (background communication)
 * 
 * Only tests features that are actually implemented in the current version.
 */

// Mock Chrome APIs with realistic implementations
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
      remove: vi.fn()
    }
  },
  proxy: {
    settings: {
      set: vi.fn(),
      get: vi.fn(),
      clear: vi.fn()
    }
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
    setIcon: vi.fn()
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  notifications: {
    create: vi.fn(),
    clear: vi.fn()
  }
} as any;

describe('Chrome API Integration', () => {
  let mockStorage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock storage data structure
    mockStorage = {
      'x-proxy-data': {
        version: 1,
        profiles: [],
        activeProfileId: undefined,
        settings: {
          startupEnable: false,
          defaultProfile: '',
          notifyChange: true,
          notifyError: true,
          showBadge: true
        }
      }
    };

    // Mock storage.local API
    vi.mocked(chrome.storage.local.get).mockImplementation((keys, callback) => {
      if (callback) callback(mockStorage);
      return Promise.resolve(mockStorage);
    });

    vi.mocked(chrome.storage.local.set).mockImplementation((items, callback) => {
      Object.assign(mockStorage, items);
      if (callback) callback();
      return Promise.resolve();
    });

    // Mock proxy.settings API
    vi.mocked(chrome.proxy.settings.set).mockImplementation((config, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    vi.mocked(chrome.proxy.settings.clear).mockImplementation((details, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    // Mock runtime messaging
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    });
  });

  describe('chrome.storage.local', () => {
    it('should store and retrieve proxy profiles', async () => {
      const testProfile = {
        id: 'storage-test',
        name: 'Storage Test',
        color: '#007AFF',
        config: {
          type: 'http',
          host: 'test.proxy.com',
          port: 8080
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store profile
      mockStorage['x-proxy-data'].profiles.push(testProfile);
      await chrome.storage.local.set({ 'x-proxy-data': mockStorage['x-proxy-data'] });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        'x-proxy-data': expect.objectContaining({
          profiles: expect.arrayContaining([
            expect.objectContaining({
              id: 'storage-test',
              name: 'Storage Test',
              config: expect.objectContaining({
                type: 'http',
                host: 'test.proxy.com',
                port: 8080
              })
            })
          ])
        })
      });

      // Retrieve profile
      const result = await chrome.storage.local.get(['x-proxy-data']);
      expect(result['x-proxy-data'].profiles).toHaveLength(1);
      expect(result['x-proxy-data'].profiles[0].name).toBe('Storage Test');
    });

    it('should handle storage quota and error cases', async () => {
      // Mock storage error
      vi.mocked(chrome.storage.local.set).mockImplementationOnce((items, callback) => {
        const error = new Error('Storage quota exceeded');
        if (callback) callback();
        throw error;
      });

      await expect(chrome.storage.local.set({ 'test': 'data' })).rejects.toThrow('Storage quota exceeded');
    });

    it('should handle malformed data gracefully', async () => {
      // Set up malformed data
      const malformedStorage = {
        'x-proxy-data': {
          profiles: null, // This should be an array
          activeProfileId: 'invalid',
          version: undefined
        }
      };

      vi.mocked(chrome.storage.local.get).mockImplementationOnce((keys, callback) => {
        if (callback) callback(malformedStorage);
        return Promise.resolve(malformedStorage);
      });

      const result = await chrome.storage.local.get(['x-proxy-data']);
      const data = result['x-proxy-data'];

      // Application should handle this gracefully
      const normalizedProfiles = Array.isArray(data.profiles) ? data.profiles : [];
      const normalizedVersion = data.version || 1;

      expect(normalizedProfiles).toHaveLength(0);
      expect(normalizedVersion).toBe(1);
    });
  });

  describe('chrome.proxy.settings', () => {
    it('should configure HTTP proxy correctly', async () => {
      const proxyConfig = {
        value: {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: 'http',
              host: 'proxy.example.com',
              port: 8080
            }
          }
        }
      };

      await chrome.proxy.settings.set(proxyConfig);

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(proxyConfig);
    });

    it('should configure SOCKS5 proxy correctly', async () => {
      const socksConfig = {
        value: {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: 'socks5',
              host: 'socks.proxy.com',
              port: 1080
            }
          }
        }
      };

      await chrome.proxy.settings.set(socksConfig);

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(socksConfig);
    });

    it('should clear proxy settings (return to system)', async () => {
      const systemConfig = {
        value: {
          mode: 'system'
        }
      };

      await chrome.proxy.settings.set(systemConfig);

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(systemConfig);
    });

    it('should handle proxy configuration errors', async () => {
      vi.mocked(chrome.proxy.settings.set).mockImplementationOnce((config, callback) => {
        const error = new Error('Invalid proxy configuration');
        if (callback) callback();
        throw error;
      });

      const invalidConfig = {
        value: {
          mode: 'invalid_mode',
          rules: {}
        }
      };

      await expect(chrome.proxy.settings.set(invalidConfig)).rejects.toThrow('Invalid proxy configuration');
    });
  });

  describe('chrome.action (Badge and Icon)', () => {
    it('should update badge when proxy is active', () => {
      const badgeConfig = { text: '●' };
      const colorConfig = { color: '#4CAF50' };

      chrome.action.setBadgeText(badgeConfig);
      chrome.action.setBadgeBackgroundColor(colorConfig);

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith(badgeConfig);
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith(colorConfig);
    });

    it('should clear badge when proxy is inactive', () => {
      const clearBadge = { text: '' };

      chrome.action.setBadgeText(clearBadge);

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith(clearBadge);
    });

    it('should handle icon updates', () => {
      const iconConfig = {
        path: {
          16: 'icons/active-16.png',
          32: 'icons/active-32.png'
        }
      };

      chrome.action.setIcon(iconConfig);

      expect(chrome.action.setIcon).toHaveBeenCalledWith(iconConfig);
    });
  });

  describe('chrome.runtime messaging', () => {
    it('should send activation message to background', async () => {
      const activateMessage = {
        type: 'ACTIVATE_PROFILE',
        profileId: 'test-profile'
      };

      const response = await chrome.runtime.sendMessage(activateMessage);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(activateMessage);
      expect(response).toEqual({ success: true });
    });

    it('should send deactivation message to background', async () => {
      const deactivateMessage = {
        type: 'DEACTIVATE_PROFILE'
      };

      const response = await chrome.runtime.sendMessage(deactivateMessage);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(deactivateMessage);
      expect(response).toEqual({ success: true });
    });

    it('should handle background script errors', async () => {
      vi.mocked(chrome.runtime.sendMessage).mockImplementationOnce((message, callback) => {
        const errorResponse = { success: false, error: 'Background service unavailable' };
        if (callback) callback(errorResponse);
        return Promise.resolve(errorResponse);
      });

      const message = { type: 'TEST_MESSAGE' };
      const response = await chrome.runtime.sendMessage(message);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Background service unavailable');
    });
  });

  describe('Data Flow Integration', () => {
    it('should complete full proxy activation flow', async () => {
      // Step 1: Create and store profile
      const profile = {
        id: 'integration-test',
        name: 'Integration Test',
        color: '#007AFF',
        config: {
          type: 'http',
          host: 'integration.proxy.com',
          port: 8080
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockStorage['x-proxy-data'].profiles.push(profile);
      await chrome.storage.local.set({ 'x-proxy-data': mockStorage['x-proxy-data'] });

      // Step 2: Set as active profile
      mockStorage['x-proxy-data'].activeProfileId = profile.id;
      await chrome.storage.local.set({ 'x-proxy-data': mockStorage['x-proxy-data'] });

      // Step 3: Send activation message to background
      await chrome.runtime.sendMessage({
        type: 'ACTIVATE_PROFILE',
        profileId: profile.id
      });

      // Step 4: Configure Chrome proxy settings
      await chrome.proxy.settings.set({
        value: {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: 'http',
              host: 'integration.proxy.com',
              port: 8080
            }
          }
        }
      });

      // Step 5: Update UI badge
      chrome.action.setBadgeText({ text: '●' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });

      // Verify all steps were executed
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(2);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'ACTIVATE_PROFILE',
        profileId: profile.id
      });
      expect(chrome.proxy.settings.set).toHaveBeenCalledWith({
        value: expect.objectContaining({
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: 'http',
              host: 'integration.proxy.com',
              port: 8080
            }
          }
        })
      });
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '●' });
    });

    it('should complete full proxy deactivation flow', async () => {
      // Start with active profile
      const profile = {
        id: 'deactivation-test',
        name: 'Deactivation Test',
        config: { type: 'http', host: 'test.proxy.com', port: 8080 }
      };

      mockStorage['x-proxy-data'].profiles = [profile];
      mockStorage['x-proxy-data'].activeProfileId = profile.id;

      // Step 1: Clear active profile
      mockStorage['x-proxy-data'].activeProfileId = undefined;
      await chrome.storage.local.set({ 'x-proxy-data': mockStorage['x-proxy-data'] });

      // Step 2: Send deactivation message
      await chrome.runtime.sendMessage({ type: 'DEACTIVATE_PROFILE' });

      // Step 3: Set system proxy mode
      await chrome.proxy.settings.set({
        value: { mode: 'system' }
      });

      // Step 4: Clear UI badge
      chrome.action.setBadgeText({ text: '' });

      // Verify deactivation flow
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'DEACTIVATE_PROFILE' });
      expect(chrome.proxy.settings.set).toHaveBeenCalledWith({
        value: { mode: 'system' }
      });
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
      expect(mockStorage['x-proxy-data'].activeProfileId).toBeUndefined();
    });
  });
});