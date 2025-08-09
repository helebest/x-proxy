/**
 * Background service worker for X-Proxy Chrome Extension
 * Handles proxy settings, profile management, and message communication
 */

import { ProxyManager, getProxyManager } from '../core/ProxyManager';
import { 
  ProxyProfile, 
  ProxyConfig, 
  ProxyType, 
  ChromeProxyConfig
} from '../types/proxy';

// Message types for communication between components
interface MessageRequest {
  type: string;
  payload?: any;
}

interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Badge colors for different proxy states
const BADGE_COLORS = {
  active: '#4CAF50',    // Green for active proxy
  inactive: '#9E9E9E',  // Gray for no proxy
  error: '#F44336',     // Red for error state
  warning: '#FF9800'    // Orange for warning
};

// Badge text for different states
const BADGE_TEXT = {
  active: 'ON',
  inactive: 'OFF',
  error: 'ERR',
  direct: 'DIR'
};

class BackgroundService {
  private proxyManager: ProxyManager;
  private currentPacScript: string | null = null;

  constructor() {
    this.proxyManager = getProxyManager();
    this.initialize();
  }

  /**
   * Initialize the background service
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize proxy manager
      await this.proxyManager.initialize();

      // Set up message listeners
      this.setupMessageListeners();

      // Set up proxy event listeners
      this.setupProxyEventListeners();

      // Set up auth provider
      this.setupAuthProvider();

      // Set up context menus
      this.setupContextMenus();

      // Set up alarm for periodic tasks
      this.setupAlarms();

      // Restore active profile on startup
      await this.restoreActiveProfile();

      // Update badge based on current state
      await this.updateBadge();

      console.log('Background service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize background service:', error);
      await this.updateBadge('error');
    }
  }

  /**
   * Set up message listeners for popup and options page communication
   */
  private setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener((request: MessageRequest, sender, sendResponse) => {
      // Handle async response
      this.handleMessage(request, sender)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ 
          success: false, 
          error: error.message || 'Unknown error' 
        }));
      
      // Return true to indicate async response
      return true;
    });

    // Handle connections from popup/options
    chrome.runtime.onConnect.addListener(port => {
      console.log('Port connected:', port.name);
      
      port.onMessage.addListener(async (request: MessageRequest) => {
        try {
          const response = await this.handleMessage(request, { tab: null, port });
          port.postMessage(response);
        } catch (error) {
          port.postMessage({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      });
    });
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(request: MessageRequest, _sender: any): Promise<MessageResponse> {
    console.log('Handling message:', request.type, request.payload);

    try {
      switch (request.type) {
        // Profile management
        case 'GET_PROFILES':
          return {
            success: true,
            data: this.proxyManager.getAllProfiles()
          };

        case 'GET_ACTIVE_PROFILE':
          return {
            success: true,
            data: this.proxyManager.getActiveProfile()
          };

        case 'CREATE_PROFILE':
          const newProfile = await this.proxyManager.createProfile(
            request.payload.name,
            request.payload.config,
            request.payload.options
          );
          await this.updateBadge();
          return {
            success: true,
            data: newProfile
          };

        case 'UPDATE_PROFILE':
          const updatedProfile = await this.proxyManager.updateProfile(
            request.payload.id,
            request.payload.updates
          );
          await this.updateBadge();
          return {
            success: true,
            data: updatedProfile
          };

        case 'DELETE_PROFILE':
          await this.proxyManager.deleteProfile(request.payload.id);
          await this.updateBadge();
          return {
            success: true
          };

        case 'ACTIVATE_PROFILE':
          await this.activateProfile(request.payload.id);
          return {
            success: true
          };

        case 'DEACTIVATE_PROFILE':
          await this.deactivateProfile();
          return {
            success: true
          };

        case 'TEST_PROXY':
          const testResult = await this.proxyManager.testProxy(request.payload.id);
          return {
            success: true,
            data: testResult
          };

        // Quick switch
        case 'QUICK_SWITCH':
          await this.quickSwitch(request.payload.profileId);
          return {
            success: true
          };

        // Import/Export
        case 'EXPORT_PROFILES':
          return {
            success: true,
            data: this.proxyManager.exportProfiles()
          };

        case 'IMPORT_PROFILES':
          await this.proxyManager.importProfiles(request.payload.profiles);
          return {
            success: true
          };

        // Settings
        case 'GET_SETTINGS':
          const settings = await this.proxyManager.storage.getSettings();
          return {
            success: true,
            data: settings
          };

        case 'SAVE_SETTINGS':
          await this.proxyManager.storage.saveSettings(request.payload);
          return {
            success: true
          };

        // PAC Script
        case 'GET_PAC_SCRIPT':
          return {
            success: true,
            data: this.currentPacScript
          };

        case 'UPDATE_PAC_SCRIPT':
          await this.updatePacScript(request.payload.script);
          return {
            success: true
          };

        default:
          throw new Error(`Unknown message type: ${request.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set up proxy event listeners
   */
  private setupProxyEventListeners(): void {
    // Listen for proxy errors
    chrome.proxy.onProxyError.addListener(details => {
      console.error('Proxy error:', details);
      this.updateBadge('error');
      
      // Show notification if enabled
      this.showNotification('Proxy Error', details.error, 'error');
    });
  }

  /**
   * Set up authentication provider for proxies requiring auth
   */
  private setupAuthProvider(): void {
    chrome.webRequest.onAuthRequired.addListener(
      (details, callback) => {
        // Check if this is for a proxy authentication
        if (!details.isProxy) {
          if (callback) {
            callback({ cancel: true });
          }
          return { cancel: true };
        }

        const activeProfile = this.proxyManager.getActiveProfile();
        if (!activeProfile || !activeProfile.config.auth) {
          if (callback) {
            callback({ cancel: true });
          }
          return { cancel: true };
        }

        const auth = activeProfile.config.auth;
        
        // Provide credentials
        const response = {
          authCredentials: {
            username: auth.username,
            password: auth.password
          }
        };
        
        if (callback) {
          callback(response);
        }
        return response;
      },
      { urls: ['<all_urls>'] },
      ['asyncBlocking']
    );
  }

  /**
   * Set up context menus for quick actions
   */
  private setupContextMenus(): void {
    // Remove all existing menus
    chrome.contextMenus.removeAll(() => {
      // Create parent menu
      chrome.contextMenus.create({
        id: 'x-proxy-parent',
        title: 'X-Proxy',
        contexts: ['action']
      });

      // Create quick switch submenu
      chrome.contextMenus.create({
        id: 'x-proxy-quick-switch',
        parentId: 'x-proxy-parent',
        title: 'Quick Switch',
        contexts: ['action']
      });

      // Add profile options dynamically
      this.updateContextMenuProfiles();

      // Add separator
      chrome.contextMenus.create({
        id: 'x-proxy-separator',
        parentId: 'x-proxy-parent',
        type: 'separator',
        contexts: ['action']
      });

      // Add direct connection option
      chrome.contextMenus.create({
        id: 'x-proxy-direct',
        parentId: 'x-proxy-parent',
        title: 'Direct Connection',
        contexts: ['action']
      });

      // Add disable proxy option
      chrome.contextMenus.create({
        id: 'x-proxy-disable',
        parentId: 'x-proxy-parent',
        title: 'Disable Proxy',
        contexts: ['action']
      });
    });

    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener(async (info) => {
      if (info.menuItemId === 'x-proxy-direct') {
        await this.setDirectConnection();
      } else if (info.menuItemId === 'x-proxy-disable') {
        await this.deactivateProfile();
      } else if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith('x-proxy-profile-')) {
        const profileId = info.menuItemId.replace('x-proxy-profile-', '');
        await this.activateProfile(profileId);
      }
    });
  }

  /**
   * Update context menu with current profiles
   */
  private async updateContextMenuProfiles(): Promise<void> {
    const profiles = this.proxyManager.getAllProfiles();
    
    // Remove old profile menu items
    profiles.forEach(profile => {
      chrome.contextMenus.remove(`x-proxy-profile-${profile.id}`, () => {
        // Ignore errors for non-existent items
        chrome.runtime.lastError;
      });
    });

    // Add current profiles
    profiles.forEach(profile => {
      chrome.contextMenus.create({
        id: `x-proxy-profile-${profile.id}`,
        parentId: 'x-proxy-quick-switch',
        title: profile.name,
        contexts: ['action'],
        checked: profile.isActive,
        type: 'radio'
      });
    });
  }

  /**
   * Set up alarms for periodic tasks
   */
  private setupAlarms(): void {
    // Create alarm for periodic connection tests
    chrome.alarms.create('test-connection', {
      periodInMinutes: 5
    });

    // Handle alarm events
    chrome.alarms.onAlarm.addListener(async alarm => {
      if (alarm.name === 'test-connection') {
        const activeProfile = this.proxyManager.getActiveProfile();
        if (activeProfile) {
          const settings = await this.proxyManager.storage.getSettings();
          if (settings.testOnConnect) {
            const result = await this.proxyManager.testProxy(activeProfile.id);
            if (!result.success) {
              await this.updateBadge('warning');
              this.showNotification(
                'Connection Test Failed',
                `Proxy ${activeProfile.name} may be unavailable`,
                'warning'
              );
            }
          }
        }
      }
    });
  }

  /**
   * Restore active profile on startup
   */
  private async restoreActiveProfile(): Promise<void> {
    const activeProfileId = await this.proxyManager.storage.getActiveProfileId();
    if (activeProfileId) {
      try {
        await this.activateProfile(activeProfileId);
      } catch (error) {
        console.error('Failed to restore active profile:', error);
        await this.updateBadge('error');
      }
    }
  }

  /**
   * Activate a proxy profile
   */
  private async activateProfile(profileId: string): Promise<void> {
    const profile = this.proxyManager.getProfile(profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Generate and apply proxy configuration
    const chromeConfig = await this.generateChromeProxyConfig(profile);
    await this.applyProxyConfig(chromeConfig);

    // Update manager state
    await this.proxyManager.activateProfile(profileId);

    // Update UI elements
    await this.updateBadge('active', profile);
    await this.updateContextMenuProfiles();

    // Show notification
    const settings = await this.proxyManager.storage.getSettings();
    if (settings.showNotifications) {
      this.showNotification(
        'Proxy Activated',
        `${profile.name} is now active`,
        'success'
      );
    }
  }

  /**
   * Deactivate the current proxy profile
   */
  private async deactivateProfile(): Promise<void> {
    await this.clearProxyConfig();
    await this.proxyManager.deactivateProfile();
    await this.updateBadge('inactive');
    await this.updateContextMenuProfiles();

    const settings = await this.proxyManager.storage.getSettings();
    if (settings.showNotifications) {
      this.showNotification(
        'Proxy Deactivated',
        'Direct connection restored',
        'info'
      );
    }
  }

  /**
   * Quick switch to a profile
   */
  private async quickSwitch(profileId: string | null): Promise<void> {
    if (profileId) {
      await this.activateProfile(profileId);
    } else {
      await this.deactivateProfile();
    }
  }

  /**
   * Set direct connection (bypass proxy)
   */
  private async setDirectConnection(): Promise<void> {
    await this.applyProxyConfig({ mode: 'direct' });
    await this.proxyManager.deactivateProfile();
    await this.updateBadge('direct');
    await this.updateContextMenuProfiles();
  }

  /**
   * Generate Chrome proxy configuration from profile
   */
  private async generateChromeProxyConfig(profile: ProxyProfile): Promise<ChromeProxyConfig> {
    const config = profile.config;

    // Handle special proxy types
    if (config.type === ProxyType.DIRECT) {
      return { mode: 'direct' };
    }

    if (config.type === ProxyType.SYSTEM) {
      return { mode: 'system' };
    }

    // Check if PAC script should be used
    if (this.shouldUsePacScript(config)) {
      const pacScript = await this.generatePacScript(config);
      return {
        mode: 'pac_script',
        pacScript: {
          data: pacScript,
          mandatory: true
        }
      };
    }

    // Generate fixed server configuration
    const proxyServer = {
      scheme: config.type === ProxyType.SOCKS5 ? 'socks5' : 
              config.type === ProxyType.SOCKS4 ? 'socks4' : 
              config.type,
      host: config.host,
      port: config.port
    };

    return {
      mode: 'fixed_servers',
      rules: {
        singleProxy: proxyServer,
        bypassList: config.bypassList || this.getDefaultBypassList()
      }
    };
  }

  /**
   * Determine if PAC script should be used
   */
  private shouldUsePacScript(config: ProxyConfig): boolean {
    // Use PAC script for complex bypass rules or SOCKS with authentication
    return (config.type === ProxyType.SOCKS5 && !!config.auth) ||
           (!!config.bypassList && config.bypassList.length > 10);
  }

  /**
   * Generate PAC script for proxy configuration
   */
  private async generatePacScript(config: ProxyConfig): Promise<string> {
    const bypassList = config.bypassList || this.getDefaultBypassList();
    const proxyString = this.getProxyString(config);

    const pacScript = `
      function FindProxyForURL(url, host) {
        // Parse URL
        var scheme = url.substring(0, url.indexOf(':'));
        
        // Direct connection for local addresses
        if (isPlainHostName(host) ||
            shExpMatch(host, "*.local") ||
            isInNet(dnsResolve(host), "10.0.0.0", "255.0.0.0") ||
            isInNet(dnsResolve(host), "172.16.0.0", "255.240.0.0") ||
            isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0") ||
            isInNet(dnsResolve(host), "127.0.0.0", "255.255.255.0")) {
          return "DIRECT";
        }
        
        // Check bypass list
        var bypassList = ${JSON.stringify(bypassList)};
        for (var i = 0; i < bypassList.length; i++) {
          if (shExpMatch(host, bypassList[i])) {
            return "DIRECT";
          }
        }
        
        // Use proxy for all other connections
        return "${proxyString}";
      }
    `;

    this.currentPacScript = pacScript;
    return pacScript;
  }

  /**
   * Get proxy string for PAC script
   */
  private getProxyString(config: ProxyConfig): string {
    switch (config.type) {
      case ProxyType.SOCKS5:
        return `SOCKS5 ${config.host}:${config.port}`;
      case ProxyType.SOCKS4:
        return `SOCKS ${config.host}:${config.port}`;
      case ProxyType.HTTP:
        return `PROXY ${config.host}:${config.port}`;
      case ProxyType.HTTPS:
        return `HTTPS ${config.host}:${config.port}`;
      default:
        return 'DIRECT';
    }
  }

  /**
   * Update PAC script
   */
  private async updatePacScript(script: string): Promise<void> {
    this.currentPacScript = script;
    
    // Apply if there's an active profile
    const activeProfile = this.proxyManager.getActiveProfile();
    if (activeProfile) {
      await this.applyProxyConfig({
        mode: 'pac_script',
        pacScript: {
          data: script,
          mandatory: true
        }
      });
    }
  }

  /**
   * Apply proxy configuration to Chrome
   */
  private async applyProxyConfig(config: ChromeProxyConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.proxy.settings.set(
        { 
          value: config, 
          scope: 'regular' 
        },
        () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Clear proxy configuration
   */
  private async clearProxyConfig(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.proxy.settings.clear(
        { scope: 'regular' },
        () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            this.currentPacScript = null;
            resolve();
          }
        }
      );
    });
  }

  /**
   * Update extension badge
   */
  private async updateBadge(state?: string, profile?: ProxyProfile): Promise<void> {
    let text = BADGE_TEXT.inactive;
    let color = BADGE_COLORS.inactive;
    let title = 'X-Proxy: No active proxy';

    if (state === 'error') {
      text = BADGE_TEXT.error;
      color = BADGE_COLORS.error;
      title = 'X-Proxy: Error';
    } else if (state === 'warning') {
      text = '!';
      color = BADGE_COLORS.warning;
      title = 'X-Proxy: Connection issue';
    } else if (state === 'direct') {
      text = BADGE_TEXT.direct;
      color = BADGE_COLORS.inactive;
      title = 'X-Proxy: Direct connection';
    } else if (state === 'active' || profile) {
      const activeProfile = profile || this.proxyManager.getActiveProfile();
      if (activeProfile) {
        text = BADGE_TEXT.active;
        color = activeProfile.color || BADGE_COLORS.active;
        title = `X-Proxy: ${activeProfile.name}`;
      }
    } else {
      // Check current state
      const activeProfile = this.proxyManager.getActiveProfile();
      if (activeProfile) {
        text = BADGE_TEXT.active;
        color = activeProfile.color || BADGE_COLORS.active;
        title = `X-Proxy: ${activeProfile.name}`;
      }
    }

    // Set badge text and color
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
    await chrome.action.setTitle({ title });
  }

  /**
   * Show notification
   */
  private showNotification(title: string, message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    const iconUrl = `/icons/icon-128.png`;
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl,
      title,
      message,
      priority: type === 'error' ? 2 : 1
    });
  }

  /**
   * Get default bypass list
   */
  private getDefaultBypassList(): string[] {
    return [
      'localhost',
      '127.0.0.1',
      '::1',
      '192.168.*.*',
      '10.*.*.*',
      '172.16.*.*',
      '*.local',
      '<local>'
    ];
  }
}

// Initialize background service
new BackgroundService();

// Export for testing
export { BackgroundService };
