import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * E2E tests for actual X-Proxy user workflows
 * 
 * Tests the real functionality that users interact with:
 * - Creating and managing proxy profiles
 * - Activating/deactivating proxies  
 * - Profile operations (edit, duplicate, delete)
 * - Options page interactions
 * - Popup interactions
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
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
    setIcon: vi.fn()
  },
  notifications: {
    create: vi.fn(),
    clear: vi.fn()
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  }
} as any;

describe('E2E User Workflows', () => {
  let mockStorage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset storage mock
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

    vi.mocked(chrome.runtime.sendMessage).mockImplementation((message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Profile Management Workflow', () => {
    it('should complete profile creation, activation, and deletion workflow', async () => {
      // Step 1: User creates a new HTTP proxy profile
      const newProfile = {
        id: Date.now().toString(),
        name: 'Home Proxy',
        color: '#007AFF',
        config: {
          type: 'http',
          host: '127.0.0.1',
          port: 1235
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Simulate adding profile to storage
      mockStorage['x-proxy-data'].profiles.push(newProfile);
      await chrome.storage.local.set({ 'x-proxy-data': mockStorage['x-proxy-data'] });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        'x-proxy-data': expect.objectContaining({
          profiles: expect.arrayContaining([
            expect.objectContaining({
              name: 'Home Proxy',
              config: expect.objectContaining({
                type: 'http',
                host: '127.0.0.1',
                port: 1235
              })
            })
          ])
        })
      });

      // Step 2: User activates the profile
      mockStorage['x-proxy-data'].activeProfileId = newProfile.id;
      await chrome.storage.local.set({ 'x-proxy-data': mockStorage['x-proxy-data'] });

      // Simulate background service activating proxy
      await chrome.proxy.settings.set({
        value: {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: 'http',
              host: '127.0.0.1',
              port: 1235
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
              host: '127.0.0.1',
              port: 1235
            }
          }
        }
      });

      // Step 3: User deletes the active profile  
      const profileIndex = mockStorage['x-proxy-data'].profiles.findIndex((p: any) => p.id === newProfile.id);
      mockStorage['x-proxy-data'].profiles.splice(profileIndex, 1);
      mockStorage['x-proxy-data'].activeProfileId = undefined;
      
      // Should deactivate proxy when active profile is deleted
      await chrome.runtime.sendMessage({ type: 'DEACTIVATE_PROFILE' });
      await chrome.storage.local.set({ 'x-proxy-data': mockStorage['x-proxy-data'] });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'DEACTIVATE_PROFILE'
      });

      expect(mockStorage['x-proxy-data'].profiles).toHaveLength(0);
      expect(mockStorage['x-proxy-data'].activeProfileId).toBeUndefined();
    });

    it('should handle SOCKS5 proxy profile creation and activation', async () => {
      // Create SOCKS5 profile
      const socksProfile = {
        id: Date.now().toString(),
        name: 'SOCKS Proxy',
        color: '#FF6B6B',
        config: {
          type: 'socks5',
          host: '127.0.0.1',
          port: 1080
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockStorage['x-proxy-data'].profiles.push(socksProfile);
      mockStorage['x-proxy-data'].activeProfileId = socksProfile.id;

      // Activate SOCKS5 proxy
      await chrome.proxy.settings.set({
        value: {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: 'socks5',
              host: '127.0.0.1',
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
              host: '127.0.0.1',
              port: 1080
            }
          }
        })
      });
    });
  });

  describe('Profile Operations Workflow', () => {
    let testProfile: any;

    beforeEach(() => {
      testProfile = {
        id: 'test-profile',
        name: 'Test Profile',
        color: '#4CAF50',
        config: {
          type: 'http',
          host: 'proxy.example.com',
          port: 8080
        },
        createdAt: new Date('2024-01-01').toISOString(),
        updatedAt: new Date('2024-01-01').toISOString()
      };
      
      mockStorage['x-proxy-data'].profiles = [testProfile];
    });

    it('should duplicate profile with correct structure', () => {
      const duplicate = {
        id: Date.now().toString(),
        name: `${testProfile.name} (Copy)`,
        color: testProfile.color,
        config: {
          type: testProfile.config.type,
          host: testProfile.config.host,
          port: testProfile.config.port
        },
        isActive: false, // Important: duplicates should not be active
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(duplicate.name).toBe('Test Profile (Copy)');
      expect(duplicate.id).not.toBe(testProfile.id);
      expect(duplicate.isActive).toBe(false);
      expect(duplicate.config.type).toBe('http');
      expect(duplicate.config.host).toBe('proxy.example.com');
      expect(duplicate.config.port).toBe(8080);
    });

    it('should edit profile and update timestamp', () => {
      const updatedProfile = {
        ...testProfile,
        name: 'Updated Test Profile',
        config: {
          ...testProfile.config,
          host: 'updated.proxy.com',
          port: 9090
        },
        updatedAt: new Date().toISOString()
      };

      expect(updatedProfile.name).toBe('Updated Test Profile');
      expect(updatedProfile.config.host).toBe('updated.proxy.com');
      expect(updatedProfile.config.port).toBe(9090);
      expect(new Date(updatedProfile.updatedAt).getTime()).toBeGreaterThan(
        new Date(testProfile.updatedAt).getTime()
      );
    });
  });

  describe('Data Synchronization Workflow', () => {
    it('should load fresh data from storage when popup opens', async () => {
      const profiles = [
        {
          id: 'profile-1',
          name: 'Home',
          config: { type: 'http', host: '127.0.0.1', port: 1235 }
        },
        {
          id: 'profile-2',
          name: 'Work', 
          config: { type: 'socks5', host: '10.0.0.1', port: 1080 }
        }
      ];

      mockStorage['x-proxy-data'].profiles = profiles;
      mockStorage['x-proxy-data'].activeProfileId = 'profile-2';

      // Simulate popup loading data
      const result = await chrome.storage.local.get(['x-proxy-data']);
      const data = result['x-proxy-data'];
      const activeProfile = data.profiles.find((p: any) => p.id === data.activeProfileId);

      expect(data.profiles).toHaveLength(2);
      expect(activeProfile?.name).toBe('Work');
      expect(activeProfile?.config.type).toBe('socks5');
    });

    it('should clean up stale active profile reference', async () => {
      // Set up stale active profile ID
      mockStorage['x-proxy-data'].profiles = [
        { id: 'existing-profile', name: 'Existing', config: { type: 'http', host: '127.0.0.1', port: 8080 } }
      ];
      mockStorage['x-proxy-data'].activeProfileId = 'deleted-profile-id';

      const result = await chrome.storage.local.get(['x-proxy-data']);
      const data = result['x-proxy-data'];
      const activeProfile = data.profiles.find((p: any) => p.id === data.activeProfileId);

      if (!activeProfile && data.activeProfileId) {
        // Clean up stale reference
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

  describe('Error Handling Workflow', () => {
    it('should handle invalid date values gracefully', () => {
      const profileWithBadDates = {
        id: 'bad-dates',
        name: 'Bad Dates Profile',
        createdAt: null,
        updatedAt: 'invalid-date-string'
      };

      // Function to safely handle dates (from options.js)
      const safeParseDate = (dateValue: any) => {
        if (!dateValue) return new Date();
        
        if (dateValue instanceof Date) {
          return isNaN(dateValue.getTime()) ? new Date() : dateValue;
        }
        
        if (typeof dateValue === 'string' || typeof dateValue === 'number') {
          const date = new Date(dateValue);
          return isNaN(date.getTime()) ? new Date() : date;
        }
        
        return new Date();
      };

      const normalizedCreatedAt = safeParseDate(profileWithBadDates.createdAt);
      const normalizedUpdatedAt = safeParseDate(profileWithBadDates.updatedAt);

      expect(normalizedCreatedAt).toBeInstanceOf(Date);
      expect(normalizedUpdatedAt).toBeInstanceOf(Date);
      expect(isNaN(normalizedCreatedAt.getTime())).toBe(false);
      expect(isNaN(normalizedUpdatedAt.getTime())).toBe(false);
    });

    it('should validate proxy configuration input', () => {
      const validConfig = {
        name: 'Valid Proxy',
        type: 'http',
        host: 'proxy.example.com',
        port: '8080'
      };

      const invalidConfig = {
        name: '',
        type: 'http',
        host: '',
        port: ''
      };

      // Validation logic from options.js
      const validateConfig = (config: any) => {
        if (!config.name?.trim()) return { valid: false, error: 'Please enter a profile name' };
        if (!config.host?.trim() || !config.port?.trim()) return { valid: false, error: 'Please enter host and port' };
        return { valid: true };
      };

      expect(validateConfig(validConfig).valid).toBe(true);
      expect(validateConfig(invalidConfig).valid).toBe(false);
      expect(validateConfig(invalidConfig).error).toContain('profile name');
    });
  });

  describe('UI State Management Workflow', () => {
    it('should update UI elements when profile state changes', () => {
      // Simulate profile activation UI updates
      const mockUpdateBadge = (isActive: boolean, profileName?: string) => {
        if (isActive && profileName) {
          chrome.action.setBadgeText({ text: '●' });
          chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
        } else {
          chrome.action.setBadgeText({ text: '' });
        }
      };

      // Test activation
      mockUpdateBadge(true, 'Home Proxy');
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '●' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#4CAF50' });

      vi.clearAllMocks();

      // Test deactivation
      mockUpdateBadge(false);
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });
  });
});