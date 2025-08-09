/**
 * Storage service for persisting proxy configurations
 * Supports both Chrome storage API (for extension) and localStorage (for development)
 */

import { 
  ProxyProfile, 
  StorageSchema, 
  AppSettings 
} from '../types/proxy';

const STORAGE_KEY = 'x-proxy-data';
const CURRENT_SCHEMA_VERSION = 1;

/**
 * Storage service interface
 */
export interface IStorageService {
  getProfiles(): Promise<ProxyProfile[]>;
  getProfile(id: string): Promise<ProxyProfile | null>;
  saveProfile(profile: ProxyProfile): Promise<void>;
  deleteProfile(id: string): Promise<void>;
  getActiveProfileId(): Promise<string | null>;
  setActiveProfileId(id: string | null): Promise<void>;
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;
  clear(): Promise<void>;
  export(): Promise<StorageSchema>;
  import(data: StorageSchema): Promise<void>;
}

/**
 * Chrome storage implementation
 */
class ChromeStorageService implements IStorageService {
  private isAvailable(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;
  }

  private async getData(): Promise<StorageSchema> {
    if (!this.isAvailable()) {
      throw new Error('Chrome storage API not available');
    }

    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        const data = result[STORAGE_KEY];
        if (!data) {
          resolve(this.getDefaultSchema());
        } else {
          resolve(this.migrateSchema(data));
        }
      });
    });
  }

  private async setData(data: StorageSchema): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Chrome storage API not available');
    }

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEY]: data }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  async getProfiles(): Promise<ProxyProfile[]> {
    const data = await this.getData();
    return data.profiles.map(p => this.deserializeProfile(p));
  }

  async getProfile(id: string): Promise<ProxyProfile | null> {
    const data = await this.getData();
    const profile = data.profiles.find(p => p.id === id);
    return profile ? this.deserializeProfile(profile) : null;
  }

  async saveProfile(profile: ProxyProfile): Promise<void> {
    const data = await this.getData();
    const index = data.profiles.findIndex(p => p.id === profile.id);
    
    const serializedProfile = this.serializeProfile(profile);
    
    if (index >= 0) {
      data.profiles[index] = serializedProfile;
    } else {
      data.profiles.push(serializedProfile);
    }
    
    await this.setData(data);
  }

  async deleteProfile(id: string): Promise<void> {
    const data = await this.getData();
    data.profiles = data.profiles.filter(p => p.id !== id);
    
    // Clear active profile if it was deleted
    if (data.activeProfileId === id) {
      data.activeProfileId = undefined;
    }
    
    await this.setData(data);
  }

  async getActiveProfileId(): Promise<string | null> {
    const data = await this.getData();
    return data.activeProfileId || null;
  }

  async setActiveProfileId(id: string | null): Promise<void> {
    const data = await this.getData();
    data.activeProfileId = id || undefined;
    await this.setData(data);
  }

  async getSettings(): Promise<AppSettings> {
    const data = await this.getData();
    return data.settings || {};
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const data = await this.getData();
    data.settings = settings;
    await this.setData(data);
  }

  async clear(): Promise<void> {
    await this.setData(this.getDefaultSchema());
  }

  async export(): Promise<StorageSchema> {
    return await this.getData();
  }

  async import(importData: StorageSchema): Promise<void> {
    const migrated = this.migrateSchema(importData);
    await this.setData(migrated);
  }

  private getDefaultSchema(): StorageSchema {
    return {
      version: CURRENT_SCHEMA_VERSION,
      profiles: [],
      activeProfileId: undefined,
      settings: {
        showNotifications: true,
        testOnConnect: false,
        theme: 'auto'
      }
    };
  }

  private migrateSchema(data: any): StorageSchema {
    // Handle migration between schema versions if needed
    if (!data.version || data.version < CURRENT_SCHEMA_VERSION) {
      // Perform migrations here
      data.version = CURRENT_SCHEMA_VERSION;
    }
    return data;
  }

  private serializeProfile(profile: ProxyProfile): ProxyProfile {
    return {
      ...profile,
      createdAt: profile.createdAt instanceof Date ? profile.createdAt : new Date(profile.createdAt),
      updatedAt: profile.updatedAt instanceof Date ? profile.updatedAt : new Date(profile.updatedAt)
    };
  }

  private deserializeProfile(profile: ProxyProfile): ProxyProfile {
    return {
      ...profile,
      createdAt: new Date(profile.createdAt),
      updatedAt: new Date(profile.updatedAt)
    };
  }
}

/**
 * LocalStorage implementation for development
 */
class LocalStorageService implements IStorageService {
  private getData(): StorageSchema {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return this.getDefaultSchema();
    }
    try {
      return this.migrateSchema(JSON.parse(data));
    } catch (error) {
      console.error('Failed to parse storage data:', error);
      return this.getDefaultSchema();
    }
  }

  private setData(data: StorageSchema): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async getProfiles(): Promise<ProxyProfile[]> {
    const data = this.getData();
    return data.profiles.map(p => this.deserializeProfile(p));
  }

  async getProfile(id: string): Promise<ProxyProfile | null> {
    const data = this.getData();
    const profile = data.profiles.find(p => p.id === id);
    return profile ? this.deserializeProfile(profile) : null;
  }

  async saveProfile(profile: ProxyProfile): Promise<void> {
    const data = this.getData();
    const index = data.profiles.findIndex(p => p.id === profile.id);
    
    const serializedProfile = this.serializeProfile(profile);
    
    if (index >= 0) {
      data.profiles[index] = serializedProfile;
    } else {
      data.profiles.push(serializedProfile);
    }
    
    this.setData(data);
  }

  async deleteProfile(id: string): Promise<void> {
    const data = this.getData();
    data.profiles = data.profiles.filter(p => p.id !== id);
    
    // Clear active profile if it was deleted
    if (data.activeProfileId === id) {
      data.activeProfileId = undefined;
    }
    
    this.setData(data);
  }

  async getActiveProfileId(): Promise<string | null> {
    const data = this.getData();
    return data.activeProfileId || null;
  }

  async setActiveProfileId(id: string | null): Promise<void> {
    const data = this.getData();
    data.activeProfileId = id || undefined;
    this.setData(data);
  }

  async getSettings(): Promise<AppSettings> {
    const data = this.getData();
    return data.settings || {};
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const data = this.getData();
    data.settings = settings;
    this.setData(data);
  }

  async clear(): Promise<void> {
    this.setData(this.getDefaultSchema());
  }

  async export(): Promise<StorageSchema> {
    return this.getData();
  }

  async import(importData: StorageSchema): Promise<void> {
    const migrated = this.migrateSchema(importData);
    this.setData(migrated);
  }

  private getDefaultSchema(): StorageSchema {
    return {
      version: CURRENT_SCHEMA_VERSION,
      profiles: [],
      activeProfileId: undefined,
      settings: {
        showNotifications: true,
        testOnConnect: false,
        theme: 'auto'
      }
    };
  }

  private migrateSchema(data: any): StorageSchema {
    // Handle migration between schema versions if needed
    if (!data.version || data.version < CURRENT_SCHEMA_VERSION) {
      // Perform migrations here
      data.version = CURRENT_SCHEMA_VERSION;
    }
    return data;
  }

  private serializeProfile(profile: ProxyProfile): any {
    return {
      ...profile,
      createdAt: profile.createdAt instanceof Date ? profile.createdAt.toISOString() : profile.createdAt,
      updatedAt: profile.updatedAt instanceof Date ? profile.updatedAt.toISOString() : profile.updatedAt
    };
  }

  private deserializeProfile(profile: any): ProxyProfile {
    return {
      ...profile,
      createdAt: new Date(profile.createdAt),
      updatedAt: new Date(profile.updatedAt)
    };
  }
}

/**
 * Factory function to create appropriate storage service
 */
export function createStorageService(): IStorageService {
  // Check if running as Chrome extension
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    return new ChromeStorageService();
  }
  // Fallback to localStorage for development
  return new LocalStorageService();
}

/**
 * Singleton instance
 */
let storageInstance: IStorageService | null = null;

/**
 * Get storage service instance
 */
export function getStorageService(): IStorageService {
  if (!storageInstance) {
    storageInstance = createStorageService();
  }
  return storageInstance;
}
