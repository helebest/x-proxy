import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProxyManager } from '@/core/ProxyManager';
import { RuleEngine } from '@/rules/RuleEngine';
import { PACGenerator } from '@/pac/PACGenerator';
import { ProxyType, ProxyConfig, ProxyProfile } from '@/types/proxy';
import { Rule, RuleType, RulePriority } from '@/rules/types';

describe('E2E User Workflows', () => {
  let proxyManager: ProxyManager;
  let ruleEngine: RuleEngine;
  let pacGenerator: PACGenerator;

  beforeEach(async () => {
    proxyManager = new ProxyManager();
    await proxyManager.initialize();
    ruleEngine = new RuleEngine();
    pacGenerator = new PACGenerator();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Profile Creation and Activation Workflow', () => {
    it('should complete full profile creation to activation flow', async () => {
      // Step 1: User creates a new proxy profile
      const config: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'corporate.proxy.com',
        port: 8080,
        auth: {
          username: 'john.doe',
          password: 'secure123'
        },
        bypassList: ['localhost', '*.internal.company.com']
      };

      const profile = await proxyManager.createProfile('Corporate Proxy', config, {
        description: 'Company proxy for accessing internal resources',
        color: '#0066CC',
        tags: ['work', 'corporate']
      });

      expect(profile).toBeDefined();
      expect(profile.name).toBe('Corporate Proxy');

      // Step 2: User activates the profile
      await proxyManager.activateProfile(profile.id);

      // Step 3: Verify Chrome proxy is configured
      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.objectContaining({
            mode: 'fixed_servers',
            rules: expect.objectContaining({
              singleProxy: {
                scheme: 'http',
                host: 'corporate.proxy.com',
                port: 8080
              }
            })
          })
        }),
        expect.any(Function)
      );

      // Step 4: Verify UI updates (badge, icon, notification)
      expect(chrome.action.setBadgeText).toHaveBeenCalled();
      expect(chrome.notifications.create).toHaveBeenCalled();

      // Step 5: User verifies active profile
      const activeProfile = proxyManager.getActiveProfile();
      expect(activeProfile).toBeDefined();
      expect(activeProfile?.id).toBe(profile.id);
    });
  });

  describe('Rule-Based Proxy Switching Workflow', () => {
    let usProxy: ProxyProfile;
    let euProxy: ProxyProfile;

    beforeEach(async () => {
      // Setup multiple proxy profiles
      usProxy = await proxyManager.createProfile('US Proxy', {
        type: ProxyType.HTTP,
        host: 'us.proxy.com',
        port: 8080
      });

      euProxy = await proxyManager.createProfile('EU Proxy', {
        type: ProxyType.SOCKS5,
        host: 'eu.proxy.com',
        port: 1080
      });
    });

    it('should switch proxies based on URL rules', async () => {
      // Step 1: User creates rules for different sites
      const usRule: Rule = {
        id: 'us-sites',
        name: 'US Streaming Sites',
        type: RuleType.DOMAIN,
        pattern: '*.netflix.com',
        profileId: usProxy.id,
        priority: RulePriority.HIGH,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const euRule: Rule = {
        id: 'eu-sites',
        name: 'EU News Sites',
        type: RuleType.DOMAIN,
        pattern: '*.bbc.co.uk',
        profileId: euProxy.id,
        priority: RulePriority.HIGH,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      ruleEngine.addRule(usRule);
      ruleEngine.addRule(euRule);

      // Step 2: Test URL matching
      const netflixResult = ruleEngine.testURL('https://www.netflix.com/browse');
      expect(netflixResult.recommendedProfileId).toBe(usProxy.id);

      const bbcResult = ruleEngine.testURL('https://www.bbc.co.uk/news');
      expect(bbcResult.recommendedProfileId).toBe(euProxy.id);

      // Step 3: Generate PAC script from rules
      const pacScript = pacGenerator.generate([usRule, euRule]);
      expect(pacScript).toContain('netflix.com');
      expect(pacScript).toContain('bbc.co.uk');

      // Step 4: Apply PAC configuration
      const pacProfile = await proxyManager.createProfile('Auto-Switch PAC', {
        type: ProxyType.PAC,
        pacData: pacScript
      });

      await proxyManager.activateProfile(pacProfile.id);

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.objectContaining({
            mode: 'pac_script',
            pacScript: expect.objectContaining({
              data: expect.stringContaining('FindProxyForURL')
            })
          })
        }),
        expect.any(Function)
      );
    });
  });

  describe('Quick Switch Workflow', () => {
    let profiles: ProxyProfile[] = [];

    beforeEach(async () => {
      // Create multiple profiles for quick switching
      profiles.push(await proxyManager.createProfile('Home', {
        type: ProxyType.HTTP,
        host: 'home.proxy.com',
        port: 8080
      }));

      profiles.push(await proxyManager.createProfile('Work', {
        type: ProxyType.HTTP,
        host: 'work.proxy.com',
        port: 3128
      }));

      profiles.push(await proxyManager.createProfile('Public WiFi', {
        type: ProxyType.SOCKS5,
        host: 'secure.proxy.com',
        port: 1080
      }));
    });

    it('should support quick profile switching via keyboard shortcuts', async () => {
      // Simulate keyboard shortcut handler
      const handleKeyboardShortcut = async (shortcut: string) => {
        switch (shortcut) {
          case 'Alt+1':
            await proxyManager.activateProfile(profiles[0].id);
            break;
          case 'Alt+2':
            await proxyManager.activateProfile(profiles[1].id);
            break;
          case 'Alt+3':
            await proxyManager.activateProfile(profiles[2].id);
            break;
          case 'Alt+0':
            await proxyManager.deactivateProfile();
            break;
        }
      };

      // Test switching between profiles
      await handleKeyboardShortcut('Alt+1');
      expect(proxyManager.getActiveProfile()?.id).toBe(profiles[0].id);

      await handleKeyboardShortcut('Alt+2');
      expect(proxyManager.getActiveProfile()?.id).toBe(profiles[1].id);

      await handleKeyboardShortcut('Alt+3');
      expect(proxyManager.getActiveProfile()?.id).toBe(profiles[2].id);

      await handleKeyboardShortcut('Alt+0');
      expect(proxyManager.getActiveProfile()).toBeNull();

      // Verify Chrome proxy settings were updated each time
      expect(chrome.proxy.settings.set).toHaveBeenCalledTimes(3);
      expect(chrome.proxy.settings.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('Import/Export Workflow', () => {
    it('should handle profile import and export', async () => {
      // Step 1: User creates profiles
      await proxyManager.createProfile('Profile 1', {
        type: ProxyType.HTTP,
        host: 'proxy1.com',
        port: 8080
      });

      await proxyManager.createProfile('Profile 2', {
        type: ProxyType.SOCKS5,
        host: 'proxy2.com',
        port: 1080
      });

      // Step 2: User exports profiles
      const exportedData = proxyManager.exportProfiles();
      const exportedJson = JSON.parse(exportedData);

      expect(exportedJson.profiles).toHaveLength(2);
      expect(exportedJson.version).toBeDefined();

      // Step 3: User clears profiles (simulating new installation)
      const profileIds = proxyManager.getProfiles().map(p => p.id);
      for (const id of profileIds) {
        await proxyManager.deleteProfile(id);
      }
      expect(proxyManager.getProfiles()).toHaveLength(0);

      // Step 4: User imports profiles
      await proxyManager.importProfiles(exportedData);

      // Step 5: Verify imported profiles
      const importedProfiles = proxyManager.getProfiles();
      expect(importedProfiles).toHaveLength(2);
      expect(importedProfiles.find(p => p.name === 'Profile 1')).toBeDefined();
      expect(importedProfiles.find(p => p.name === 'Profile 2')).toBeDefined();
    });
  });

  describe('Proxy Testing Workflow', () => {
    it('should test proxy connectivity before activation', async () => {
      // Mock proxy tester
      const testProxyConnection = async (config: ProxyConfig): Promise<boolean> => {
        // Simulate connection test
        if (config.host === 'invalid.proxy.com') {
          return false;
        }
        return true;
      };

      // Step 1: User creates a profile with valid proxy
      const validConfig: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'valid.proxy.com',
        port: 8080
      };

      const isValidProxyReachable = await testProxyConnection(validConfig);
      expect(isValidProxyReachable).toBe(true);

      if (isValidProxyReachable) {
        const validProfile = await proxyManager.createProfile('Valid Proxy', validConfig);
        await proxyManager.activateProfile(validProfile.id);
        expect(proxyManager.getActiveProfile()).toBeDefined();
      }

      // Step 2: User tries to create profile with invalid proxy
      const invalidConfig: ProxyConfig = {
        type: ProxyType.HTTP,
        host: 'invalid.proxy.com',
        port: 9999
      };

      const isInvalidProxyReachable = await testProxyConnection(invalidConfig);
      expect(isInvalidProxyReachable).toBe(false);

      if (!isInvalidProxyReachable) {
        // Show warning to user but still allow creation
        const invalidProfile = await proxyManager.createProfile('Invalid Proxy', invalidConfig);
        expect(invalidProfile).toBeDefined();
        
        // But don't activate it
        expect(proxyManager.getActiveProfile()?.id).not.toBe(invalidProfile.id);
      }
    });
  });

  describe('PAC Script Editing Workflow', () => {
    it('should support creating and editing PAC scripts', async () => {
      // Step 1: User creates rules
      const rules: Rule[] = [
        {
          id: 'internal',
          name: 'Internal Sites',
          type: RuleType.DOMAIN,
          pattern: '*.internal.com',
          profileId: null, // Direct connection
          priority: RulePriority.CRITICAL,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'external',
          name: 'External Sites',
          type: RuleType.WILDCARD,
          pattern: '*',
          profileId: 'proxy-1',
          priority: RulePriority.LOW,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Step 2: Generate initial PAC script
      let pacScript = pacGenerator.generate(rules, {
        includeComments: true,
        includeDebug: false,
        defaultProxy: 'DIRECT'
      });

      expect(pacScript).toContain('Internal Sites');
      expect(pacScript).toContain('External Sites');

      // Step 3: User edits PAC script (add custom logic)
      const customPacScript = pacScript.replace(
        'function FindProxyForURL(url, host) {',
        `function FindProxyForURL(url, host) {
  // Custom logic: Block ads
  if (dnsDomainIs(host, ".doubleclick.net") || 
      dnsDomainIs(host, ".googleadservices.com")) {
    return "PROXY 127.0.0.1:1"; // Block by redirecting to invalid proxy
  }
  `
      );

      // Step 4: Create profile with custom PAC
      const pacProfile = await proxyManager.createProfile('Custom PAC', {
        type: ProxyType.PAC,
        pacData: customPacScript
      });

      // Step 5: Activate and verify
      await proxyManager.activateProfile(pacProfile.id);
      
      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.objectContaining({
            mode: 'pac_script',
            pacScript: expect.objectContaining({
              data: expect.stringContaining('doubleclick.net')
            })
          })
        }),
        expect.any(Function)
      );
    });
  });

  describe('Proxy Chain Workflow', () => {
    it('should support proxy chaining configuration', async () => {
      // Step 1: Create primary proxy
      const primaryProxy = await proxyManager.createProfile('Primary Proxy', {
        type: ProxyType.SOCKS5,
        host: 'primary.proxy.com',
        port: 1080,
        auth: {
          username: 'user1',
          password: 'pass1'
        }
      });

      // Step 2: Create secondary proxy with chain configuration
      const secondaryProxy = await proxyManager.createProfile('Secondary Proxy', {
        type: ProxyType.HTTP,
        host: 'secondary.proxy.com',
        port: 8080,
        auth: {
          username: 'user2',
          password: 'pass2'
        }
      });

      // Step 3: Create PAC script for proxy chaining
      const chainPacScript = `
function FindProxyForURL(url, host) {
  // Use primary proxy for sensitive sites
  if (dnsDomainIs(host, ".banking.com") || 
      dnsDomainIs(host, ".secure.com")) {
    return "SOCKS5 primary.proxy.com:1080";
  }
  
  // Use secondary proxy for general browsing
  if (isPlainHostName(host) || isInNet(host, "10.0.0.0", "255.0.0.0")) {
    return "DIRECT";
  }
  
  // Default to secondary proxy
  return "PROXY secondary.proxy.com:8080";
}`;

      const chainProfile = await proxyManager.createProfile('Proxy Chain', {
        type: ProxyType.PAC,
        pacData: chainPacScript
      });

      await proxyManager.activateProfile(chainProfile.id);

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.objectContaining({
            mode: 'pac_script',
            pacScript: expect.objectContaining({
              data: expect.stringContaining('primary.proxy.com')
            })
          })
        }),
        expect.any(Function)
      );
    });
  });

  describe('Auto-Enable on Network Change Workflow', () => {
    it('should auto-enable proxy based on network conditions', async () => {
      // Create profiles for different networks
      const homeProfile = await proxyManager.createProfile('Home Network', {
        type: ProxyType.DIRECT
      });

      const publicWifiProfile = await proxyManager.createProfile('Public WiFi', {
        type: ProxyType.SOCKS5,
        host: 'secure.vpn.com',
        port: 1080
      });

      // Simulate network detection
      const detectNetwork = (): string => {
        // In real implementation, this would check actual network
        return 'public-wifi';
      };

      const autoSwitchProxy = async () => {
        const network = detectNetwork();
        
        switch (network) {
          case 'home':
            await proxyManager.activateProfile(homeProfile.id);
            break;
          case 'public-wifi':
            await proxyManager.activateProfile(publicWifiProfile.id);
            break;
          default:
            await proxyManager.deactivateProfile();
        }
      };

      // Test auto-switch
      await autoSwitchProxy();
      
      expect(proxyManager.getActiveProfile()?.id).toBe(publicWifiProfile.id);
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: expect.stringContaining('Public WiFi')
        })
      );
    });
  });

  describe('Scheduled Proxy Switching Workflow', () => {
    it('should switch proxies based on schedule', async () => {
      // Create work and personal proxies
      const workProxy = await proxyManager.createProfile('Work Proxy', {
        type: ProxyType.HTTP,
        host: 'work.proxy.com',
        port: 8080
      });

      const personalProxy = await proxyManager.createProfile('Personal Proxy', {
        type: ProxyType.SOCKS5,
        host: 'personal.proxy.com',
        port: 1080
      });

      // Define schedule
      const schedule = {
        workHours: { start: 9, end: 17 }, // 9 AM to 5 PM
        workDays: [1, 2, 3, 4, 5] // Monday to Friday
      };

      const applyScheduledProxy = async () => {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();

        const isWorkTime = 
          day >= schedule.workDays[0] && 
          day <= schedule.workDays[schedule.workDays.length - 1] &&
          hour >= schedule.workHours.start && 
          hour < schedule.workHours.end;

        if (isWorkTime) {
          await proxyManager.activateProfile(workProxy.id);
        } else {
          await proxyManager.activateProfile(personalProxy.id);
        }
      };

      // Mock current time as work hours
      vi.setSystemTime(new Date('2025-08-09 10:00:00')); // Saturday 10 AM (normalized date)
      await applyScheduledProxy();
      expect(proxyManager.getActiveProfile()?.id).toBe(workProxy.id);

      // Mock current time as personal hours
      vi.setSystemTime(new Date('2025-08-09 20:00:00')); // Saturday 8 PM (normalized date)
      await applyScheduledProxy();
      expect(proxyManager.getActiveProfile()?.id).toBe(personalProxy.id);

      vi.useRealTimers();
    });
  });
});
