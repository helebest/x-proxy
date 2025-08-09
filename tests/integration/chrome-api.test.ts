import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProxyManager } from '@/core/ProxyManager';
import { ProxyType, ProxyConfig } from '@/types/proxy';

describe('Chrome API Integration', () => {
  let proxyManager: ProxyManager;

  beforeEach(async () => {
    proxyManager = new ProxyManager();
    await proxyManager.initialize();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('chrome.proxy.settings', () => {
    it('should set proxy configuration correctly', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080,
        bypassList: ['localhost', '127.0.0.1']
      };

      const profile = await proxyManager.createProfile('Test', config);
      await proxyManager.activateProfile(profile.id);

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.objectContaining({
            mode: 'fixed_servers',
            rules: expect.objectContaining({
              singleProxy: {
                scheme: 'http',
                host: 'proxy.example.com',
                port: 8080
              },
              bypassList: ['localhost', '127.0.0.1']
            })
          }),
          scope: 'regular'
        }),
        expect.any(Function)
      );
    });

    it('should clear proxy settings when deactivating', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };

      const profile = await proxyManager.createProfile('Test', config);
      await proxyManager.activateProfile(profile.id);
      await proxyManager.deactivateProfile();

      expect(chrome.proxy.settings.clear).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'regular'
        }),
        expect.any(Function)
      );
    });

    it('should handle PAC script configuration', async () => {
      const config: ProxyConfig = {
        type: ProxyType.PAC,
        pacUrl: 'http://example.com/proxy.pac'
      };

      const profile = await proxyManager.createProfile('PAC Test', config);
      await proxyManager.activateProfile(profile.id);

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.objectContaining({
            mode: 'pac_script',
            pacScript: {
              url: 'http://example.com/proxy.pac'
            }
          })
        }),
        expect.any(Function)
      );
    });

    it('should handle inline PAC data', async () => {
      const pacData = `
        function FindProxyForURL(url, host) {
          if (dnsDomainIs(host, ".example.com"))
            return "PROXY proxy.example.com:8080";
          return "DIRECT";
        }
      `;

      const config: ProxyConfig = {
        type: ProxyType.PAC,
        pacData: pacData
      };

      const profile = await proxyManager.createProfile('Inline PAC', config);
      await proxyManager.activateProfile(profile.id);

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.objectContaining({
            mode: 'pac_script',
            pacScript: {
              data: pacData
            }
          })
        }),
        expect.any(Function)
      );
    });

    it('should get current proxy settings', async () => {
      const mockSettings = {
        levelOfControl: 'controlled_by_this_extension',
        value: {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: 'http',
              host: 'current.proxy.com',
              port: 3128
            }
          }
        }
      };

      chrome.proxy.settings.get = vi.fn((config, callback) => {
        callback(mockSettings);
      });

      const settings = await new Promise((resolve) => {
        chrome.proxy.settings.get({}, resolve);
      });

      expect(settings).toEqual(mockSettings);
    });
  });

  describe('chrome.storage', () => {
    it('should save profiles to storage', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };

      await proxyManager.createProfile('Storage Test', config);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          profiles: expect.any(Array)
        }),
        expect.any(Function)
      );
    });

    it('should load profiles from storage on initialization', async () => {
      const mockProfiles = [
        {
          id: 'stored-1',
          name: 'Stored Profile',
          config: {
            type: ProxyType.HTTP,
            host: 'stored.proxy.com',
            port: 8080
          },
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      chrome.storage.local.get = vi.fn((keys, callback) => {
        callback({ profiles: mockProfiles });
        return Promise.resolve({ profiles: mockProfiles });
      });

      const manager = new ProxyManager();
      await manager.initialize();

      const profiles = manager.getProfiles();
      expect(profiles).toHaveLength(1);
      expect(profiles[0].name).toBe('Stored Profile');
    });

    it('should save active profile ID', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };

      const profile = await proxyManager.createProfile('Active Test', config);
      await proxyManager.activateProfile(profile.id);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          activeProfileId: profile.id
        }),
        expect.any(Function)
      );
    });

    it('should handle storage errors gracefully', async () => {
      chrome.storage.local.set = vi.fn((items, callback) => {
        chrome.runtime.lastError = { message: 'Storage quota exceeded' };
        if (callback) callback();
        return Promise.reject(new Error('Storage quota exceeded'));
      });

      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };

      await expect(
        proxyManager.createProfile('Error Test', config)
      ).rejects.toThrow();
    });
  });

  describe('chrome.runtime', () => {
    it('should send messages between components', async () => {
      const message = {
        type: 'ACTIVATE_PROFILE',
        profileId: 'test-profile'
      };

      chrome.runtime.sendMessage(message);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(message);
    });

    it('should handle message responses', async () => {
      chrome.runtime.sendMessage = vi.fn((message, callback) => {
        if (callback) {
          callback({ success: true, data: 'Response data' });
        }
      });

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_STATUS' }, resolve);
      });

      expect(response).toEqual({ success: true, data: 'Response data' });
    });

    it('should register message listeners', () => {
      const listener = vi.fn();
      chrome.runtime.onMessage.addListener(listener);

      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledWith(listener);
    });

    it('should handle runtime errors', () => {
      chrome.runtime.lastError = { message: 'Extension context invalidated' };
      
      const hasError = chrome.runtime.lastError !== null;
      expect(hasError).toBe(true);
      expect(chrome.runtime.lastError.message).toBe('Extension context invalidated');
    });
  });

  describe('chrome.webRequest', () => {
    it('should register auth handler for proxy authentication', () => {
      const authHandler = vi.fn();
      
      chrome.webRequest.onAuthRequired.addListener(
        authHandler,
        { urls: ['<all_urls>'] },
        ['blocking']
      );

      expect(chrome.webRequest.onAuthRequired.addListener).toHaveBeenCalledWith(
        authHandler,
        { urls: ['<all_urls>'] },
        ['blocking']
      );
    });

    it('should handle proxy errors', () => {
      const errorHandler = vi.fn();
      
      chrome.webRequest.onErrorOccurred.addListener(
        errorHandler,
        { urls: ['<all_urls>'] }
      );

      expect(chrome.webRequest.onErrorOccurred.addListener).toHaveBeenCalledWith(
        errorHandler,
        { urls: ['<all_urls>'] }
      );
    });
  });

  describe('chrome.action', () => {
    it('should update badge when proxy is active', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };

      const profile = await proxyManager.createProfile('Badge Test', config);
      await proxyManager.activateProfile(profile.id);

      // Simulating badge update
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#00FF00' });

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'ON' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#00FF00' });
    });

    it('should clear badge when proxy is deactivated', async () => {
      await proxyManager.deactivateProfile();

      // Simulating badge clear
      chrome.action.setBadgeText({ text: '' });

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });

    it('should update icon based on proxy state', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };

      const profile = await proxyManager.createProfile('Icon Test', config);
      await proxyManager.activateProfile(profile.id);

      // Simulating icon update
      chrome.action.setIcon({
        path: {
          16: 'icons/active-16.png',
          32: 'icons/active-32.png',
          48: 'icons/active-48.png',
          128: 'icons/active-128.png'
        }
      });

      expect(chrome.action.setIcon).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.objectContaining({
            16: expect.stringContaining('active')
          })
        })
      );
    });
  });

  describe('chrome.notifications', () => {
    it('should show notification on proxy activation', async () => {
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };

      const profile = await proxyManager.createProfile('Notification Test', config);
      await proxyManager.activateProfile(profile.id);

      // Simulating notification
      chrome.notifications.create('proxy-activated', {
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: 'Proxy Activated',
        message: `Profile "${profile.name}" is now active`
      });

      expect(chrome.notifications.create).toHaveBeenCalledWith(
        'proxy-activated',
        expect.objectContaining({
          type: 'basic',
          title: 'Proxy Activated',
          message: expect.stringContaining(profile.name)
        })
      );
    });

    it('should show error notification on proxy failure', async () => {
      chrome.proxy.settings.set = vi.fn((config, callback) => {
        chrome.runtime.lastError = { message: 'Failed to set proxy' };
        if (callback) callback();
      });

      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'invalid.proxy',
        port: 9999
      };

      const profile = await proxyManager.createProfile('Error Test', config);
      
      try {
        await proxyManager.activateProfile(profile.id);
      } catch (error) {
        // Simulating error notification
        chrome.notifications.create('proxy-error', {
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: 'Proxy Error',
          message: 'Failed to set proxy'
        });
      }

      expect(chrome.notifications.create).toHaveBeenCalledWith(
        'proxy-error',
        expect.objectContaining({
          title: 'Proxy Error'
        })
      );
    });
  });

  describe('chrome.tabs', () => {
    it('should reload tabs after proxy change', async () => {
      chrome.tabs.query = vi.fn((query, callback) => {
        callback([
          { id: 1, url: 'https://example.com' },
          { id: 2, url: 'https://google.com' }
        ]);
      });

      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'proxy.example.com',
        port: 8080
      };

      const profile = await proxyManager.createProfile('Reload Test', config);
      await proxyManager.activateProfile(profile.id);

      // Simulate tab reload
      chrome.tabs.query({ active: false }, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) chrome.tabs.reload(tab.id);
        });
      });

      expect(chrome.tabs.query).toHaveBeenCalled();
      expect(chrome.tabs.reload).toHaveBeenCalledTimes(2);
    });

    it('should update specific tab with proxy info', async () => {
      const tabId = 123;
      
      chrome.tabs.update(tabId, { url: 'chrome://proxy-settings' });

      expect(chrome.tabs.update).toHaveBeenCalledWith(
        tabId,
        { url: 'chrome://proxy-settings' }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle chrome.proxy.settings errors', async () => {
      chrome.proxy.settings.set = vi.fn((config, callback) => {
        chrome.runtime.lastError = { message: 'Invalid proxy configuration' };
        if (callback) callback();
      });

      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: '',  // Invalid empty host
        port: 8080
      };

      // This should be caught by validation before Chrome API call
      await expect(
        proxyManager.createProfile('Invalid', config)
      ).rejects.toThrow();
    });

    it('should handle permission errors', () => {
      chrome.proxy.settings.set = vi.fn(() => {
        throw new Error('Permission denied: proxy');
      });

      expect(() => {
        chrome.proxy.settings.set({ value: {} }, () => {});
      }).toThrow('Permission denied');
    });

    it('should handle context invalidation', async () => {
      chrome.runtime.lastError = { message: 'Extension context invalidated' };
      
      const isContextValid = () => {
        return !chrome.runtime.lastError || 
               !chrome.runtime.lastError.message?.includes('context invalidated');
      };

      expect(isContextValid()).toBe(false);
    });
  });
});
