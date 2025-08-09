import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ProxyManager } from '@/core/ProxyManager';
import { ProxyProfile, ProxyType, ProxyEvent, ProxyConfig } from '@/types/proxy';
import { IStorageService } from '@/services/storage';

// Mock storage service
class MockStorageService implements IStorageService {
  private profiles: Map<string, ProxyProfile> = new Map();
  private activeProfileId: string | null = null;
  private settings: any = {};

  async getProfiles(): Promise<ProxyProfile[]> {
    return Array.from(this.profiles.values());
  }

  async saveProfile(profile: ProxyProfile): Promise<void> {
    this.profiles.set(profile.id, profile);
  }

  async deleteProfile(id: string): Promise<void> {
    this.profiles.delete(id);
  }

  async getActiveProfileId(): Promise<string | null> {
    return this.activeProfileId;
  }

  async setActiveProfileId(id: string | null): Promise<void> {
    this.activeProfileId = id;
  }

  async getSettings(): Promise<any> {
    return this.settings;
  }

  async saveSettings(settings: any): Promise<void> {
    this.settings = settings;
  }

  async clear(): Promise<void> {
    this.profiles.clear();
    this.activeProfileId = null;
    this.settings = {};
  }
}

describe('ProxyManager', () => {
  let proxyManager: ProxyManager;
  let mockStorage: MockStorageService;

  beforeEach(async () => {
    mockStorage = new MockStorageService();
    proxyManager = new ProxyManager(mockStorage);
    await proxyManager.initialize();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const manager = new ProxyManager(mockStorage);
      await expect(manager.initialize()).resolves.not.toThrow();
    });

    it('should throw error when using methods before initialization', () => {
      const manager = new ProxyManager(mockStorage);
      expect(() => manager.getProfiles()).toThrow('ProxyManager not initialized');
    });

    it('should not reinitialize if already initialized', async () => {
      const spy = vi.spyOn(mockStorage, 'getProfiles');
      await proxyManager.initialize();
      await proxyManager.initialize();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('createProfile', () => {
    it('should create a valid proxy profile', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080,
        bypassList: ['localhost', '127.0.0.1']
      };

      const profile = await proxyManager.createProfile('Test Profile', config, {
        description: 'Test description',
        color: '#FF0000'
      });

      expect(profile).toBeDefined();
      expect(profile.name).toBe('Test Profile');
      expect(profile.config.type).toBe(ProxyType.HTTP);
      expect(profile.config.host).toBe('proxy.example.com');
      expect(profile.config.port).toBe(8080);
      expect(profile.color).toBe('#FF0000');
    });

    it('should sanitize host and normalize bypass list', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: '  http://proxy.example.com:8080  ',
        port: 8080,
        bypassList: ['localhost', '  127.0.0.1  ', 'localhost']
      };

      const profile = await proxyManager.createProfile('Test', config);

      expect(profile.config.host).toBe('proxy.example.com');
      expect(profile.config.bypassList).toEqual(['localhost', '127.0.0.1']);
    });

    it('should handle authentication in proxy config', async () => {
      const config: ProxyConfig = {
        type: ProxyType.SOCKS5,
        host: 'socks.example.com',
        port: 1080,
        auth: {
          username: 'testuser',
          password: 'testpass'
        }
      };

      const profile = await proxyManager.createProfile('SOCKS Profile', config);

      expect(profile.config.auth).toBeDefined();
      expect(profile.config.auth?.username).toBe('testuser');
      expect(profile.config.auth?.password).toBe('testpass');
    });

    it('should throw error for invalid profile', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: '',  // Invalid empty host
        port: 8080
      };

      await expect(
        proxyManager.createProfile('Invalid', config)
      ).rejects.toThrow();
    });

    it('should emit PROFILE_CREATED event', async () => {
      const listener = vi.fn();
      proxyManager.on(ProxyEvent.PROFILE_CREATED, listener);

      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };

      const profile = await proxyManager.createProfile('Test', config);

      expect(listener).toHaveBeenCalledWith(profile);
    });
  });

  describe('updateProfile', () => {
    let existingProfile: ProxyProfile;

    beforeEach(async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };
      existingProfile = await proxyManager.createProfile('Existing', config);
    });

    it('should update an existing profile', async () => {
      const updated = await proxyManager.updateProfile(existingProfile.id, {
        name: 'Updated Name',
        description: 'New description'
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('New description');
      expect(updated.config.host).toBe('proxy.example.com');
    });

    it('should update proxy configuration', async () => {
      const newConfig: ProxyConfig = {
        type: ProxyType.SOCKS5,
        host: 'new-proxy.example.com',
        port: 1080
      };

      const updated = await proxyManager.updateProfile(existingProfile.id, {
        config: newConfig
      });

      expect(updated.config.type).toBe(ProxyType.SOCKS5);
      expect(updated.config.host).toBe('new-proxy.example.com');
      expect(updated.config.port).toBe(1080);
    });

    it('should throw error for non-existent profile', async () => {
      await expect(
        proxyManager.updateProfile('non-existent', { name: 'Test' })
      ).rejects.toThrow('Profile with id non-existent not found');
    });

    it('should emit PROFILE_UPDATED event', async () => {
      const listener = vi.fn();
      proxyManager.on(ProxyEvent.PROFILE_UPDATED, listener);

      const updated = await proxyManager.updateProfile(existingProfile.id, {
        name: 'Updated'
      });

      expect(listener).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteProfile', () => {
    let profile: ProxyProfile;

    beforeEach(async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };
      profile = await proxyManager.createProfile('To Delete', config);
    });

    it('should delete an existing profile', async () => {
      await proxyManager.deleteProfile(profile.id);
      const profiles = proxyManager.getProfiles();
      expect(profiles.find(p => p.id === profile.id)).toBeUndefined();
    });

    it('should deactivate profile if it is active', async () => {
      await proxyManager.activateProfile(profile.id);
      expect(proxyManager.getActiveProfile()?.id).toBe(profile.id);

      await proxyManager.deleteProfile(profile.id);
      expect(proxyManager.getActiveProfile()).toBeNull();
    });

    it('should throw error for non-existent profile', async () => {
      await expect(
        proxyManager.deleteProfile('non-existent')
      ).rejects.toThrow('Profile with id non-existent not found');
    });

    it('should emit PROFILE_DELETED event', async () => {
      const listener = vi.fn();
      proxyManager.on(ProxyEvent.PROFILE_DELETED, listener);

      await proxyManager.deleteProfile(profile.id);
      expect(listener).toHaveBeenCalledWith(profile.id);
    });
  });

  describe('activateProfile', () => {
    let profile1: ProxyProfile;
    let profile2: ProxyProfile;

    beforeEach(async () => {
      const config1: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy1.example.com',
        port: 8080
      };
      const config2: ProxyConfig = {
        type: ProxyType.SOCKS5,
        host: 'proxy2.example.com',
        port: 1080
      };
      profile1 = await proxyManager.createProfile('Profile 1', config1);
      profile2 = await proxyManager.createProfile('Profile 2', config2);
    });

    it('should activate a profile', async () => {
      await proxyManager.activateProfile(profile1.id);
      expect(proxyManager.getActiveProfile()?.id).toBe(profile1.id);
    });

    it('should deactivate previous profile when activating new one', async () => {
      await proxyManager.activateProfile(profile1.id);
      await proxyManager.activateProfile(profile2.id);

      const profiles = proxyManager.getProfiles();
      const p1 = profiles.find(p => p.id === profile1.id);
      const p2 = profiles.find(p => p.id === profile2.id);

      expect(p1?.isActive).toBe(false);
      expect(p2?.isActive).toBe(true);
    });

    it('should apply proxy settings to Chrome', async () => {
      await proxyManager.activateProfile(profile1.id);
      expect(chrome.proxy.settings.set).toHaveBeenCalled();
    });

    it('should emit PROFILE_ACTIVATED event', async () => {
      const listener = vi.fn();
      proxyManager.on(ProxyEvent.PROFILE_ACTIVATED, listener);

      await proxyManager.activateProfile(profile1.id);
      expect(listener).toHaveBeenCalledWith(profile1);
    });
  });

  describe('deactivateProfile', () => {
    let profile: ProxyProfile;

    beforeEach(async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };
      profile = await proxyManager.createProfile('Test', config);
      await proxyManager.activateProfile(profile.id);
    });

    it('should deactivate active profile', async () => {
      await proxyManager.deactivateProfile();
      expect(proxyManager.getActiveProfile()).toBeNull();
    });

    it('should clear Chrome proxy settings', async () => {
      await proxyManager.deactivateProfile();
      expect(chrome.proxy.settings.clear).toHaveBeenCalled();
    });

    it('should emit PROFILE_DEACTIVATED event', async () => {
      const listener = vi.fn();
      proxyManager.on(ProxyEvent.PROFILE_DEACTIVATED, listener);

      await proxyManager.deactivateProfile();
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('getProfiles', () => {
    it('should return all profiles', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };

      await proxyManager.createProfile('Profile 1', config);
      await proxyManager.createProfile('Profile 2', config);
      await proxyManager.createProfile('Profile 3', config);

      const profiles = proxyManager.getProfiles();
      expect(profiles).toHaveLength(3);
    });

    it('should return empty array when no profiles', () => {
      const profiles = proxyManager.getProfiles();
      expect(profiles).toEqual([]);
    });
  });

  describe('convertToChromeProxy', () => {
    it('should convert HTTP proxy to Chrome config', () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080,
        bypassList: ['localhost', '*.local']
      };

      const chromeConfig = proxyManager.convertToChromeProxy(config);

      expect(chromeConfig.mode).toBe('fixed_servers');
      expect(chromeConfig.rules?.singleProxy).toEqual({
        scheme: 'http',
        host: 'proxy.example.com',
        port: 8080
      });
      expect(chromeConfig.rules?.bypassList).toEqual(['localhost', '*.local']);
    });

    it('should convert SOCKS proxy to Chrome config', () => {
      const config: ProxyConfig = {
        type: ProxyType.SOCKS5,
        host: 'socks.example.com',
        port: 1080
      };

      const chromeConfig = proxyManager.convertToChromeProxy(config);

      expect(chromeConfig.mode).toBe('fixed_servers');
      expect(chromeConfig.rules?.singleProxy).toEqual({
        scheme: 'socks5',
        host: 'socks.example.com',
        port: 1080
      });
    });

    it('should convert PAC proxy to Chrome config', () => {
      const config: ProxyConfig = {
        type: ProxyType.PAC,
        pacUrl: 'http://example.com/proxy.pac'
      };

      const chromeConfig = proxyManager.convertToChromeProxy(config);

      expect(chromeConfig.mode).toBe('pac_script');
      expect(chromeConfig.pacScript?.url).toBe('http://example.com/proxy.pac');
    });

    it('should handle authentication in Chrome config', () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080,
        auth: {
          username: 'user',
          password: 'pass'
        }
      };

      const chromeConfig = proxyManager.convertToChromeProxy(config);

      // Note: Chrome doesn't support inline auth, this should be handled separately
      expect(chromeConfig.mode).toBe('fixed_servers');
    });
  });

  describe('event system', () => {
    it('should add and trigger event listeners', async () => {
      const listener = vi.fn();
      proxyManager.on(ProxyEvent.PROFILE_CREATED, listener);

      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };

      await proxyManager.createProfile('Test', config);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should remove event listeners', async () => {
      const listener = vi.fn();
      proxyManager.on(ProxyEvent.PROFILE_CREATED, listener);
      proxyManager.off(ProxyEvent.PROFILE_CREATED, listener);

      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };

      await proxyManager.createProfile('Test', config);
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle multiple listeners for same event', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      proxyManager.on(ProxyEvent.PROFILE_CREATED, listener1);
      proxyManager.on(ProxyEvent.PROFILE_CREATED, listener2);

      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };

      await proxyManager.createProfile('Test', config);
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('import/export', () => {
    it('should export profiles to JSON', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };

      await proxyManager.createProfile('Profile 1', config);
      await proxyManager.createProfile('Profile 2', config);

      const exported = proxyManager.exportProfiles();
      const data = JSON.parse(exported);

      expect(data.profiles).toHaveLength(2);
      expect(data.version).toBeDefined();
      expect(data.exportDate).toBeDefined();
    });

    it('should import profiles from JSON', async () => {
      const importData = {
        version: '1.0.0',
        profiles: [
          {
            id: 'test-id-1',
            name: 'Imported Profile',
            config: {
              type: ProxyType.HTTP,
              host: 'imported.example.com',
              port: 8080
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      };

      await proxyManager.importProfiles(JSON.stringify(importData));
      const profiles = proxyManager.getProfiles();

      expect(profiles).toHaveLength(1);
      expect(profiles[0].name).toBe('Imported Profile');
    });
  });
});
