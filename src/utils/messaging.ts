/**
 * Messaging utilities for communication between extension components
 * Provides type-safe message passing between popup, options, and background
 */

import { ProxyProfile, ProxyConfig, AppSettings, ProxyTestResult } from '../types/proxy';

/**
 * Message types for communication
 */
export enum MessageType {
  // Profile management
  GET_PROFILES = 'GET_PROFILES',
  GET_ACTIVE_PROFILE = 'GET_ACTIVE_PROFILE',
  CREATE_PROFILE = 'CREATE_PROFILE',
  UPDATE_PROFILE = 'UPDATE_PROFILE',
  DELETE_PROFILE = 'DELETE_PROFILE',
  ACTIVATE_PROFILE = 'ACTIVATE_PROFILE',
  DEACTIVATE_PROFILE = 'DEACTIVATE_PROFILE',
  TEST_PROXY = 'TEST_PROXY',
  
  // Quick actions
  QUICK_SWITCH = 'QUICK_SWITCH',
  
  // Import/Export
  EXPORT_PROFILES = 'EXPORT_PROFILES',
  IMPORT_PROFILES = 'IMPORT_PROFILES',
  
  // Settings
  GET_SETTINGS = 'GET_SETTINGS',
  SAVE_SETTINGS = 'SAVE_SETTINGS',
  
  // PAC Script
  GET_PAC_SCRIPT = 'GET_PAC_SCRIPT',
  UPDATE_PAC_SCRIPT = 'UPDATE_PAC_SCRIPT',
  
  // Connection status
  CHECK_CONNECTION = 'CHECK_CONNECTION',
  
  // Badge updates
  UPDATE_BADGE = 'UPDATE_BADGE'
}

/**
 * Message payloads for each message type
 */
export interface MessagePayloads {
  [MessageType.GET_PROFILES]: undefined;
  [MessageType.GET_ACTIVE_PROFILE]: undefined;
  [MessageType.CREATE_PROFILE]: {
    name: string;
    config: ProxyConfig;
    options?: {
      description?: string;
      color?: string;
      tags?: string[];
      isDefault?: boolean;
    };
  };
  [MessageType.UPDATE_PROFILE]: {
    id: string;
    updates: Partial<Omit<ProxyProfile, 'id' | 'createdAt'>>;
  };
  [MessageType.DELETE_PROFILE]: {
    id: string;
  };
  [MessageType.ACTIVATE_PROFILE]: {
    id: string;
  };
  [MessageType.DEACTIVATE_PROFILE]: undefined;
  [MessageType.TEST_PROXY]: {
    id: string;
  };
  [MessageType.QUICK_SWITCH]: {
    profileId: string | null;
  };
  [MessageType.EXPORT_PROFILES]: undefined;
  [MessageType.IMPORT_PROFILES]: {
    profiles: ProxyProfile[];
  };
  [MessageType.GET_SETTINGS]: undefined;
  [MessageType.SAVE_SETTINGS]: AppSettings;
  [MessageType.GET_PAC_SCRIPT]: undefined;
  [MessageType.UPDATE_PAC_SCRIPT]: {
    script: string;
  };
  [MessageType.CHECK_CONNECTION]: undefined;
  [MessageType.UPDATE_BADGE]: {
    state?: string;
    profileId?: string;
  };
}

/**
 * Message responses for each message type
 */
export interface MessageResponses {
  [MessageType.GET_PROFILES]: ProxyProfile[];
  [MessageType.GET_ACTIVE_PROFILE]: ProxyProfile | null;
  [MessageType.CREATE_PROFILE]: ProxyProfile;
  [MessageType.UPDATE_PROFILE]: ProxyProfile;
  [MessageType.DELETE_PROFILE]: void;
  [MessageType.ACTIVATE_PROFILE]: void;
  [MessageType.DEACTIVATE_PROFILE]: void;
  [MessageType.TEST_PROXY]: ProxyTestResult;
  [MessageType.QUICK_SWITCH]: void;
  [MessageType.EXPORT_PROFILES]: ProxyProfile[];
  [MessageType.IMPORT_PROFILES]: void;
  [MessageType.GET_SETTINGS]: AppSettings;
  [MessageType.SAVE_SETTINGS]: void;
  [MessageType.GET_PAC_SCRIPT]: string | null;
  [MessageType.UPDATE_PAC_SCRIPT]: void;
  [MessageType.CHECK_CONNECTION]: boolean;
  [MessageType.UPDATE_BADGE]: void;
}

/**
 * Generic message interface
 */
export interface Message<T extends MessageType = MessageType> {
  type: T;
  payload?: MessagePayloads[T];
}

/**
 * Generic response interface
 */
export interface Response<T extends MessageType = MessageType> {
  success: boolean;
  data?: MessageResponses[T];
  error?: string;
}

/**
 * Message client for sending messages to background script
 */
export class MessageClient {
  private port: chrome.runtime.Port | null = null;
  private messageId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();

  /**
   * Connect to background script
   */
  connect(name = 'popup'): void {
    if (this.port) {
      this.disconnect();
    }

    this.port = chrome.runtime.connect({ name });
    
    this.port.onMessage.addListener((response: any) => {
      if (response.id !== undefined) {
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          if (response.success) {
            pending.resolve(response.data);
          } else {
            pending.reject(new Error(response.error || 'Unknown error'));
          }
          this.pendingRequests.delete(response.id);
        }
      }
    });

    this.port.onDisconnect.addListener(() => {
      this.port = null;
      // Reject all pending requests
      this.pendingRequests.forEach(pending => {
        pending.reject(new Error('Connection lost'));
      });
      this.pendingRequests.clear();
    });
  }

  /**
   * Disconnect from background script
   */
  disconnect(): void {
    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }
    this.pendingRequests.clear();
  }

  /**
   * Send a message to the background script
   */
  async send<T extends MessageType>(
    type: T,
    payload?: MessagePayloads[T]
  ): Promise<MessageResponses[T]> {
    // Use simple message passing if no port connection
    if (!this.port) {
      return this.sendSimpleMessage(type, payload);
    }

    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      this.pendingRequests.set(id, { resolve, reject });
      
      this.port!.postMessage({
        id,
        type,
        payload
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Send a simple message without port connection
   */
  private async sendSimpleMessage<T extends MessageType>(
    type: T,
    payload?: MessagePayloads[T]
  ): Promise<MessageResponses[T]> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type,
          payload
        },
        (response: Response<T>) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response.success) {
            resolve(response.data as MessageResponses[T]);
          } else {
            reject(new Error(response.error || 'Unknown error'));
          }
        }
      );
    });
  }

  /**
   * Helper methods for common operations
   */
  async getProfiles(): Promise<ProxyProfile[]> {
    return this.send(MessageType.GET_PROFILES);
  }

  async getActiveProfile(): Promise<ProxyProfile | null> {
    return this.send(MessageType.GET_ACTIVE_PROFILE);
  }

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
    return this.send(MessageType.CREATE_PROFILE, { name, config, options });
  }

  async updateProfile(
    id: string,
    updates: Partial<Omit<ProxyProfile, 'id' | 'createdAt'>>
  ): Promise<ProxyProfile> {
    return this.send(MessageType.UPDATE_PROFILE, { id, updates });
  }

  async deleteProfile(id: string): Promise<void> {
    return this.send(MessageType.DELETE_PROFILE, { id });
  }

  async activateProfile(id: string): Promise<void> {
    return this.send(MessageType.ACTIVATE_PROFILE, { id });
  }

  async deactivateProfile(): Promise<void> {
    return this.send(MessageType.DEACTIVATE_PROFILE);
  }

  async testProxy(id: string): Promise<ProxyTestResult> {
    return this.send(MessageType.TEST_PROXY, { id });
  }

  async quickSwitch(profileId: string | null): Promise<void> {
    return this.send(MessageType.QUICK_SWITCH, { profileId });
  }

  async getSettings(): Promise<AppSettings> {
    return this.send(MessageType.GET_SETTINGS);
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    return this.send(MessageType.SAVE_SETTINGS, settings);
  }

  async exportProfiles(): Promise<ProxyProfile[]> {
    return this.send(MessageType.EXPORT_PROFILES);
  }

  async importProfiles(profiles: ProxyProfile[]): Promise<void> {
    return this.send(MessageType.IMPORT_PROFILES, { profiles });
  }

  async getPacScript(): Promise<string | null> {
    return this.send(MessageType.GET_PAC_SCRIPT);
  }

  async updatePacScript(script: string): Promise<void> {
    return this.send(MessageType.UPDATE_PAC_SCRIPT, { script });
  }
}

/**
 * Singleton instance of message client
 */
let messageClient: MessageClient | null = null;

/**
 * Get message client instance
 */
export function getMessageClient(): MessageClient {
  if (!messageClient) {
    messageClient = new MessageClient();
  }
  return messageClient;
}

/**
 * Listen for state changes from background
 */
export function onStateChange(callback: (state: any) => void): () => void {
  const listener = (message: any) => {
    if (message.type === 'STATE_CHANGE') {
      callback(message.payload);
    }
  };

  chrome.runtime.onMessage.addListener(listener);

  // Return cleanup function
  return () => {
    chrome.runtime.onMessage.removeListener(listener);
  };
}

/**
 * Broadcast state change to all connected clients
 */
export function broadcastStateChange(state: any): void {
  chrome.runtime.sendMessage({
    type: 'STATE_CHANGE',
    payload: state
  }).catch(() => {
    // Ignore errors if no listeners
  });
}
