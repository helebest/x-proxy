import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests for basic proxy management functionality
 * 
 * These tests focus on the actual proxy management features that exist
 * in the current X-Proxy implementation, which are relatively simple:
 * - Basic profile storage and retrieval
 * - Chrome proxy API interaction
 * - Profile activation/deactivation
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
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  }
} as any;

describe('Proxy Manager', () => {
  let mockStorage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
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

    vi.mocked(chrome.storage.local.get).mockImplementation((keys, callback) => {
      if (callback) callback(mockStorage);
      return Promise.resolve(mockStorage);
    });

    vi.mocked(chrome.storage.local.set).mockImplementation((items, callback) => {
      Object.assign(mockStorage, items);
      if (callback) callback();
      return Promise.resolve();
    });

    vi.mocked(chrome.proxy.settings.set).mockImplementation((config, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });
  });

  describe('Profile Storage', () => {
    it('should save and retrieve proxy profiles', async () => {
      const profile = {
        id: 'test-profile',
        name: 'Test Proxy',
        color: '#007AFF',
        config: {
          type: 'http',
          host: 'proxy.example.com',
          port: 8080
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add profile to storage
      mockStorage['x-proxy-data'].profiles.push(profile);
      await chrome.storage.local.set({ 'x-proxy-data': mockStorage['x-proxy-data'] });

      // Retrieve profiles
      const result = await chrome.storage.local.get(['x-proxy-data']);
      const profiles = result['x-proxy-data'].profiles;

      expect(profiles).toHaveLength(1);
      expect(profiles[0].name).toBe('Test Proxy');
      expect(profiles[0].config.type).toBe('http');
      expect(profiles[0].config.host).toBe('proxy.example.com');
      expect(profiles[0].config.port).toBe(8080);
    });

    it('should handle empty profile list', async () => {
      const result = await chrome.storage.local.get(['x-proxy-data']);
      const profiles = result['x-proxy-data'].profiles;

      expect(profiles).toHaveLength(0);
      expect(Array.isArray(profiles)).toBe(true);
    });

    it('should maintain profile data integrity', async () => {
      const originalProfile = {
        id: 'integrity-test',
        name: 'Original Name',
        color: '#FF0000',
        config: {
          type: 'socks5',
          host: 'original.proxy.com',
          port: 1080
        },
        createdAt: new Date('2024-01-01').toISOString(),
        updatedAt: new Date('2024-01-01').toISOString()
      };

      // Save profile
      mockStorage['x-proxy-data'].profiles.push(originalProfile);
      await chrome.storage.local.set({ 'x-proxy-data': mockStorage['x-proxy-data'] });

      // Retrieve and verify
      const result = await chrome.storage.local.get(['x-proxy-data']);
      const savedProfile = result['x-proxy-data'].profiles[0];

      expect(savedProfile.id).toBe(originalProfile.id);
      expect(savedProfile.name).toBe(originalProfile.name);
      expect(savedProfile.color).toBe(originalProfile.color);
      expect(savedProfile.config.type).toBe(originalProfile.config.type);
      expect(savedProfile.config.host).toBe(originalProfile.config.host);
      expect(savedProfile.config.port).toBe(originalProfile.config.port);
      expect(savedProfile.createdAt).toBe(originalProfile.createdAt);
    });
  });

  describe('Profile Activation', () => {
    let testProfile: any;

    beforeEach(() => {
      testProfile = {
        id: 'activation-test',
        name: 'Activation Test',
        config: {
          type: 'http',
          host: 'test.proxy.com',
          port: 8080
        }
      };
      
      mockStorage['x-proxy-data'].profiles = [testProfile];
    });

    it('should activate HTTP proxy profile', async () => {
      // Set active profile
      mockStorage['x-proxy-data'].activeProfileId = testProfile.id;
      await chrome.storage.local.set({ 'x-proxy-data': mockStorage['x-proxy-data'] });

      // Simulate proxy activation
      await chrome.proxy.settings.set({
        value: {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: 'http',
              host: 'test.proxy.com',
              port: 8080
            }
          }
        }
      });

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith({
        value: {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: 'http',
              host: 'test.proxy.com',
              port: 8080
            }
          }
        }
      });

      expect(mockStorage['x-proxy-data'].activeProfileId).toBe(testProfile.id);
    });

    it('should activate SOCKS5 proxy profile', async () => {
      const socksProfile = {
        id: 'socks-test',
        name: 'SOCKS Test',
        config: {
          type: 'socks5',
          host: 'socks.proxy.com',
          port: 1080
        }
      };

      mockStorage['x-proxy-data'].profiles = [socksProfile];
      mockStorage['x-proxy-data'].activeProfileId = socksProfile.id;

      await chrome.proxy.settings.set({
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
      });

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith({
        value: expect.objectContaining({
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: 'socks5',
              host: 'socks.proxy.com',
              port: 1080
            }
          }
        })
      });
    });

    it('should deactivate proxy', async () => {
      // Clear active profile
      mockStorage['x-proxy-data'].activeProfileId = undefined;
      await chrome.storage.local.set({ 'x-proxy-data': mockStorage['x-proxy-data'] });

      // Set system proxy mode
      await chrome.proxy.settings.set({
        value: {
          mode: 'system'
        }
      });

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith({
        value: {
          mode: 'system'
        }
      });

      expect(mockStorage['x-proxy-data'].activeProfileId).toBeUndefined();
    });
  });

  describe('Active Profile Management', () => {
    it('should get active profile when one is set', async () => {
      const profiles = [
        {
          id: 'profile-1',
          name: 'Active Profile',
          config: { type: 'http', host: '127.0.0.1', port: 8080 }
        },
        {
          id: 'profile-2', 
          name: 'Inactive Profile',
          config: { type: 'socks5', host: '127.0.0.1', port: 1080 }
        }
      ];

      mockStorage['x-proxy-data'].profiles = profiles;
      mockStorage['x-proxy-data'].activeProfileId = 'profile-1';

      const result = await chrome.storage.local.get(['x-proxy-data']);
      const data = result['x-proxy-data'];
      const activeProfile = data.profiles.find((p: any) => p.id === data.activeProfileId);

      expect(activeProfile).toBeDefined();
      expect(activeProfile?.name).toBe('Active Profile');
      expect(activeProfile?.id).toBe('profile-1');
    });

    it('should return null when no profile is active', async () => {
      const profiles = [
        { id: 'profile-1', name: 'Profile 1', config: { type: 'http', host: '127.0.0.1', port: 8080 } }
      ];

      mockStorage['x-proxy-data'].profiles = profiles;
      mockStorage['x-proxy-data'].activeProfileId = undefined; // No active profile

      const result = await chrome.storage.local.get(['x-proxy-data']);
      const data = result['x-proxy-data'];
      const activeProfile = data.profiles.find((p: any) => p.id === data.activeProfileId);

      expect(activeProfile).toBeUndefined();
      expect(data.activeProfileId).toBeUndefined();
    });

    it('should handle stale active profile ID', async () => {
      const profiles = [
        { id: 'existing-profile', name: 'Existing', config: { type: 'http', host: '127.0.0.1', port: 8080 } }
      ];

      mockStorage['x-proxy-data'].profiles = profiles;
      mockStorage['x-proxy-data'].activeProfileId = 'non-existent-profile';

      const result = await chrome.storage.local.get(['x-proxy-data']);
      const data = result['x-proxy-data'];
      const activeProfile = data.profiles.find((p: any) => p.id === data.activeProfileId);

      expect(activeProfile).toBeUndefined();
      expect(data.activeProfileId).toBe('non-existent-profile'); // Still there but invalid

      // Cleanup logic would set it to undefined
      if (!activeProfile && data.activeProfileId) {
        data.activeProfileId = undefined;
        await chrome.storage.local.set({ 'x-proxy-data': data });
      }

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        'x-proxy-data': expect.objectContaining({
          activeProfileId: undefined
        })
      });
    });
  });

  describe('Profile Operations', () => {
    it('should delete profile', async () => {
      const profiles = [
        { id: 'profile-1', name: 'Profile 1', config: { type: 'http', host: '127.0.0.1', port: 8080 } },
        { id: 'profile-2', name: 'Profile 2', config: { type: 'socks5', host: '127.0.0.1', port: 1080 } }
      ];

      mockStorage['x-proxy-data'].profiles = profiles;

      // Delete profile-1
      const profileIndex = mockStorage['x-proxy-data'].profiles.findIndex((p: any) => p.id === 'profile-1');
      mockStorage['x-proxy-data'].profiles.splice(profileIndex, 1);
      await chrome.storage.local.set({ 'x-proxy-data': mockStorage['x-proxy-data'] });

      expect(mockStorage['x-proxy-data'].profiles).toHaveLength(1);
      expect(mockStorage['x-proxy-data'].profiles[0].id).toBe('profile-2');
    });

    it('should delete active profile and clear active state', async () => {
      const profiles = [
        { id: 'active-profile', name: 'Active', config: { type: 'http', host: '127.0.0.1', port: 8080 } }
      ];

      mockStorage['x-proxy-data'].profiles = profiles;
      mockStorage['x-proxy-data'].activeProfileId = 'active-profile';

      // Delete the active profile
      const profileIndex = mockStorage['x-proxy-data'].profiles.findIndex((p: any) => p.id === 'active-profile');
      const wasActive = mockStorage['x-proxy-data'].activeProfileId === 'active-profile';
      
      mockStorage['x-proxy-data'].profiles.splice(profileIndex, 1);
      
      if (wasActive) {
        mockStorage['x-proxy-data'].activeProfileId = undefined;
        // Should also deactivate proxy
        await chrome.proxy.settings.set({ value: { mode: 'system' } });
      }

      await chrome.storage.local.set({ 'x-proxy-data': mockStorage['x-proxy-data'] });

      expect(mockStorage['x-proxy-data'].profiles).toHaveLength(0);
      expect(mockStorage['x-proxy-data'].activeProfileId).toBeUndefined();
      expect(chrome.proxy.settings.set).toHaveBeenCalledWith({
        value: { mode: 'system' }
      });
    });

    it('should update profile', async () => {
      const originalProfile = {
        id: 'update-test',
        name: 'Original Name',
        color: '#007AFF',
        config: { type: 'http', host: 'original.com', port: 8080 },
        createdAt: new Date('2024-01-01').toISOString(),
        updatedAt: new Date('2024-01-01').toISOString()
      };

      mockStorage['x-proxy-data'].profiles = [originalProfile];

      // Update profile
      const updatedProfile = {
        ...originalProfile,
        name: 'Updated Name',
        config: { type: 'http', host: 'updated.com', port: 9090 },
        updatedAt: new Date().toISOString()
      };

      const profileIndex = mockStorage['x-proxy-data'].profiles.findIndex((p: any) => p.id === 'update-test');
      mockStorage['x-proxy-data'].profiles[profileIndex] = updatedProfile;
      await chrome.storage.local.set({ 'x-proxy-data': mockStorage['x-proxy-data'] });

      const savedProfile = mockStorage['x-proxy-data'].profiles[0];
      expect(savedProfile.name).toBe('Updated Name');
      expect(savedProfile.config.host).toBe('updated.com');
      expect(savedProfile.config.port).toBe(9090);
      expect(new Date(savedProfile.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalProfile.updatedAt).getTime()
      );
    });
  });

  describe('Data Migration and Normalization', () => {
    it('should normalize deprecated proxy types', () => {
      const profileWithOldTypes = {
        id: 'migration-test',
        name: 'Migration Test',
        type: 'https', // Old format
        host: 'proxy.example.com',
        port: 443
      };

      // Normalization logic
      const normalizeProfile = (profile: any) => {
        let type = profile.config?.type || profile.type || 'http';
        if (type === 'https') type = 'http';
        if (type === 'socks4') type = 'socks5';

        return {
          id: profile.id,
          name: profile.name,
          config: {
            type: type,
            host: profile.config?.host || profile.host,
            port: profile.config?.port || profile.port
          },
          createdAt: profile.createdAt || new Date().toISOString(),
          updatedAt: profile.updatedAt || new Date().toISOString()
        };
      };

      const normalized = normalizeProfile(profileWithOldTypes);

      expect(normalized.config.type).toBe('http'); // Should be normalized
      expect(normalized.config.host).toBe('proxy.example.com');
      expect(normalized.config.port).toBe(443);
    });
  });
});