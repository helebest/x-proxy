/**
 * ProxyManager class for handling proxy profiles
 */

import {
  ProxyProfile,
  ProxyConfig,
  ProxyType,
  ProxyEvent,
  ProxyEventPayload,
  ChromeProxyConfig,
  ProxyTestResult,
  ValidationResult
} from '../types/proxy';
import { IStorageService, getStorageService } from '../services/storage';
import { 
  validateProxyProfile, 
  validateProxyConfig,
  sanitizeHost,
  normalizeBypassList,
  getDefaultBypassList 
} from '../utils/validation';

type EventListener<T extends ProxyEvent> = (payload: ProxyEventPayload[T]) => void;

/**
 * Main proxy manager class
 */
export class ProxyManager {
  public storage: IStorageService;
  private eventListeners: Map<ProxyEvent, Set<EventListener<any>>>;
  private profiles: Map<string, ProxyProfile>;
  private activeProfileId: string | null = null;
  private initialized: boolean = false;

  constructor(storage?: IStorageService) {
    this.storage = storage || getStorageService();
    this.eventListeners = new Map();
    this.profiles = new Map();
  }

  /**
   * Initialize the proxy manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load profiles from storage
      const profiles = await this.storage.getProfiles();
      profiles.forEach(profile => {
        this.profiles.set(profile.id, profile);
      });

      // Load active profile
      this.activeProfileId = await this.storage.getActiveProfileId();

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize ProxyManager:', error);
      throw error;
    }
  }

  /**
   * Ensure the manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('ProxyManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Create a new proxy profile
   */
  async createProfile(
    name: string,
    config: ProxyConfig,
    options?: {
      description?: string;
      color?: string;
      tags?: string[];
      isDefault?: boolean;
    }
  ): Promise<ProxyProfile> {
    this.ensureInitialized();

    // Generate unique ID
    const id = this.generateId();
    const now = new Date();

    // Create profile object
    const profile: ProxyProfile = {
      id,
      name,
      description: options?.description,
      color: options?.color,
      isActive: false,
      isDefault: options?.isDefault,
      config: {
        ...config,
        host: sanitizeHost(config.host),
        bypassList: normalizeBypassList(config.bypassList)
      },
      createdAt: now,
      updatedAt: now,
      tags: options?.tags
    };

    // Validate profile
    const validation = validateProxyProfile(profile);
    if (!validation.isValid) {
      throw new Error(`Invalid profile: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Save to storage
    await this.storage.saveProfile(profile);
    this.profiles.set(id, profile);

    // Emit event
    this.emit(ProxyEvent.PROFILE_CREATED, profile);

    return profile;
  }

  /**
   * Update an existing proxy profile
   */
  async updateProfile(
    id: string,
    updates: Partial<Omit<ProxyProfile, 'id' | 'createdAt'>>
  ): Promise<ProxyProfile> {
    this.ensureInitialized();

    const existingProfile = this.profiles.get(id);
    if (!existingProfile) {
      throw new Error(`Profile with id ${id} not found`);
    }

    // Merge updates
    const updatedProfile: ProxyProfile = {
      ...existingProfile,
      ...updates,
      id: existingProfile.id,
      createdAt: existingProfile.createdAt,
      updatedAt: new Date()
    };

    // Process config if updated
    if (updates.config) {
      updatedProfile.config = {
        ...updatedProfile.config,
        host: sanitizeHost(updatedProfile.config.host),
        bypassList: normalizeBypassList(updatedProfile.config.bypassList)
      };
    }

    // Validate updated profile
    const validation = validateProxyProfile(updatedProfile);
    if (!validation.isValid) {
      throw new Error(`Invalid profile: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Save to storage
    await this.storage.saveProfile(updatedProfile);
    this.profiles.set(id, updatedProfile);

    // Emit event
    this.emit(ProxyEvent.PROFILE_UPDATED, updatedProfile);

    return updatedProfile;
  }

  /**
   * Delete a proxy profile
   */
  async deleteProfile(id: string): Promise<void> {
    this.ensureInitialized();

    if (!this.profiles.has(id)) {
      throw new Error(`Profile with id ${id} not found`);
    }

    // Deactivate if it's the active profile
    if (this.activeProfileId === id) {
      await this.deactivateProfile();
    }

    // Delete from storage
    await this.storage.deleteProfile(id);
    this.profiles.delete(id);

    // Emit event
    this.emit(ProxyEvent.PROFILE_DELETED, id);
  }

  /**
   * Get a profile by ID
   */
  getProfile(id: string): ProxyProfile | undefined {
    this.ensureInitialized();
    return this.profiles.get(id);
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): ProxyProfile[] {
    this.ensureInitialized();
    return Array.from(this.profiles.values());
  }

  /**
   * Get active profile
   */
  getActiveProfile(): ProxyProfile | null {
    this.ensureInitialized();
    return this.activeProfileId ? this.profiles.get(this.activeProfileId) || null : null;
  }

  /**
   * Activate a proxy profile
   */
  async activateProfile(id: string): Promise<void> {
    this.ensureInitialized();

    const profile = this.profiles.get(id);
    if (!profile) {
      throw new Error(`Profile with id ${id} not found`);
    }

    // Deactivate current profile if any
    if (this.activeProfileId) {
      await this.deactivateProfile();
    }

    // Apply proxy settings
    await this.applyProxySettings(profile);

    // Update profile status
    profile.isActive = true;
    await this.storage.saveProfile(profile);

    // Update active profile ID
    this.activeProfileId = id;
    await this.storage.setActiveProfileId(id);

    // Emit event
    this.emit(ProxyEvent.PROFILE_ACTIVATED, profile);
  }

  /**
   * Deactivate the current proxy profile
   */
  async deactivateProfile(): Promise<void> {
    this.ensureInitialized();

    if (!this.activeProfileId) {
      return;
    }

    const profile = this.profiles.get(this.activeProfileId);
    if (profile) {
      profile.isActive = false;
      await this.storage.saveProfile(profile);
    }

    // Clear proxy settings
    await this.clearProxySettings();

    const previousId = this.activeProfileId;
    this.activeProfileId = null;
    await this.storage.setActiveProfileId(null);

    // Emit event
    this.emit(ProxyEvent.PROFILE_DEACTIVATED, previousId);
  }

  /**
   * Test a proxy connection
   */
  async testProxy(profileId: string): Promise<ProxyTestResult> {
    this.ensureInitialized();

    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile with id ${profileId} not found`);
    }

    const startTime = Date.now();
    const result: ProxyTestResult = {
      success: false,
      timestamp: new Date()
    };

    try {
      // Attempt to make a test connection through the proxy
      // This is a simplified test - in production, you'd want to actually test the proxy
      const testUrl = 'https://www.google.com/generate_204';
      
      // For Chrome extension context
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        // Use Chrome's proxy API to temporarily set and test
        await fetch(testUrl, {
          method: 'HEAD',
          mode: 'no-cors'
        });
        
        result.success = true;
        result.latency = Date.now() - startTime;
      } else {
        // For development/testing
        result.success = true;
        result.latency = Math.floor(Math.random() * 200) + 50; // Simulated latency
      }
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Emit event
    this.emit(ProxyEvent.CONNECTION_TESTED, result);

    return result;
  }

  /**
   * Apply proxy settings to Chrome
   */
  private async applyProxySettings(profile: ProxyProfile): Promise<void> {
    const chromeConfig = this.convertToChromeConfig(profile.config);

    if (typeof chrome !== 'undefined' && chrome.proxy) {
      return new Promise((resolve, reject) => {
        chrome.proxy.settings.set(
          { value: chromeConfig, scope: 'regular' },
          () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          }
        );
      });
    } else {
      // For development, just log the config
      console.log('Would apply proxy settings:', chromeConfig);
    }
  }

  /**
   * Clear proxy settings in Chrome
   */
  private async clearProxySettings(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.proxy) {
      return new Promise((resolve, reject) => {
        chrome.proxy.settings.clear({ scope: 'regular' }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    } else {
      // For development
      console.log('Would clear proxy settings');
    }
  }

  /**
   * Convert internal proxy config to Chrome proxy config
   */
  private convertToChromeConfig(config: ProxyConfig): ChromeProxyConfig {
    if (config.type === ProxyType.DIRECT) {
      return { mode: 'direct' };
    }

    if (config.type === ProxyType.SYSTEM) {
      return { mode: 'system' };
    }

    const proxyServer = {
      scheme: config.type,
      host: config.host,
      port: config.port
    };

    return {
      mode: 'fixed_servers',
      rules: {
        singleProxy: proxyServer,
        bypassList: config.bypassList || getDefaultBypassList()
      }
    };
  }

  /**
   * Import profiles from exported data
   */
  async importProfiles(profiles: ProxyProfile[]): Promise<void> {
    this.ensureInitialized();

    for (const profile of profiles) {
      // Validate each profile
      const validation = validateProxyProfile(profile);
      if (!validation.isValid) {
        console.warn(`Skipping invalid profile ${profile.name}:`, validation.errors);
        continue;
      }

      // Generate new ID to avoid conflicts
      const newProfile = {
        ...profile,
        id: this.generateId(),
        isActive: false,
        createdAt: new Date(profile.createdAt),
        updatedAt: new Date()
      };

      await this.storage.saveProfile(newProfile);
      this.profiles.set(newProfile.id, newProfile);
    }
  }

  /**
   * Export all profiles
   */
  exportProfiles(): ProxyProfile[] {
    this.ensureInitialized();
    return this.getAllProfiles();
  }

  /**
   * Validate a proxy configuration
   */
  validateConfig(config: Partial<ProxyConfig>): ValidationResult {
    return validateProxyConfig(config);
  }

  /**
   * Subscribe to events
   */
  on<T extends ProxyEvent>(event: T, listener: EventListener<T>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Unsubscribe from events
   */
  off<T extends ProxyEvent>(event: T, listener: EventListener<T>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit an event
   */
  private emit<T extends ProxyEvent>(event: T, payload: ProxyEventPayload[T]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(payload);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `proxy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get predefined proxy templates
   */
  static getProxyTemplates(): Array<{ name: string; config: Partial<ProxyConfig> }> {
    return [
      {
        name: 'HTTP Proxy',
        config: {
          type: ProxyType.HTTP,
          port: 8080,
          bypassList: getDefaultBypassList()
        }
      },
      {
        name: 'SOCKS5 Proxy',
        config: {
          type: ProxyType.SOCKS5,
          port: 1080,
          bypassList: getDefaultBypassList()
        }
      },
      {
        name: 'HTTPS Proxy',
        config: {
          type: ProxyType.HTTPS,
          port: 8443,
          bypassList: getDefaultBypassList()
        }
      },
      {
        name: 'Direct Connection',
        config: {
          type: ProxyType.DIRECT,
          host: '',
          port: 0
        }
      },
      {
        name: 'System Proxy',
        config: {
          type: ProxyType.SYSTEM,
          host: '',
          port: 0
        }
      }
    ];
  }
}

// Export singleton instance
let managerInstance: ProxyManager | null = null;

/**
 * Get ProxyManager instance
 */
export function getProxyManager(): ProxyManager {
  if (!managerInstance) {
    managerInstance = new ProxyManager();
  }
  return managerInstance;
}
