/**
 * Core TypeScript interfaces and types for proxy configurations
 */

/**
 * Supported proxy types
 */
export enum ProxyType {
  HTTP = 'http',
  HTTPS = 'https',
  SOCKS4 = 'socks4',
  SOCKS5 = 'socks5',
  DIRECT = 'direct',
  SYSTEM = 'system'
}

/**
 * Proxy authentication credentials
 */
export interface ProxyAuth {
  username: string;
  password: string;
}

/**
 * Base proxy configuration
 */
export interface ProxyConfig {
  /** Proxy server host/IP address */
  host: string;
  /** Proxy server port */
  port: number;
  /** Proxy type */
  type: ProxyType;
  /** Optional authentication */
  auth?: ProxyAuth;
  /** Bypass list - domains/IPs to bypass proxy */
  bypassList?: string[];
}

/**
 * Proxy profile with metadata
 */
export interface ProxyProfile {
  /** Unique identifier */
  id: string;
  /** Profile name */
  name: string;
  /** Profile description */
  description?: string;
  /** Profile icon/color for UI */
  color?: string;
  /** Whether this profile is active */
  isActive: boolean;
  /** Whether this profile is the default */
  isDefault?: boolean;
  /** Proxy configuration */
  config: ProxyConfig;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Tags for organization */
  tags?: string[];
}

/**
 * Chrome proxy settings structure
 */
export interface ChromeProxyConfig {
  mode: 'direct' | 'auto_detect' | 'pac_script' | 'fixed_servers' | 'system';
  rules?: {
    singleProxy?: {
      scheme?: string;
      host: string;
      port?: number;
    };
    proxyForHttp?: {
      scheme?: string;
      host: string;
      port?: number;
    };
    proxyForHttps?: {
      scheme?: string;
      host: string;
      port?: number;
    };
    proxyForFtp?: {
      scheme?: string;
      host: string;
      port?: number;
    };
    fallbackProxy?: {
      scheme?: string;
      host: string;
      port?: number;
    };
    bypassList?: string[];
  };
  pacScript?: {
    url?: string;
    data?: string;
    mandatory?: boolean;
  };
}

/**
 * Proxy validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Storage schema version for migrations
 */
export interface StorageSchema {
  version: number;
  profiles: ProxyProfile[];
  activeProfileId?: string;
  settings?: AppSettings;
}

/**
 * Application settings
 */
export interface AppSettings {
  autoSwitch?: boolean;
  showNotifications?: boolean;
  testOnConnect?: boolean;
  defaultBypassList?: string[];
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * Proxy test result
 */
export interface ProxyTestResult {
  success: boolean;
  latency?: number;
  error?: string;
  timestamp: Date;
}

/**
 * Events emitted by the proxy manager
 */
export enum ProxyEvent {
  PROFILE_CREATED = 'profile:created',
  PROFILE_UPDATED = 'profile:updated',
  PROFILE_DELETED = 'profile:deleted',
  PROFILE_ACTIVATED = 'profile:activated',
  PROFILE_DEACTIVATED = 'profile:deactivated',
  CONNECTION_TESTED = 'connection:tested',
  ERROR = 'error'
}

/**
 * Event payload types
 */
export interface ProxyEventPayload {
  [ProxyEvent.PROFILE_CREATED]: ProxyProfile;
  [ProxyEvent.PROFILE_UPDATED]: ProxyProfile;
  [ProxyEvent.PROFILE_DELETED]: string; // profile id
  [ProxyEvent.PROFILE_ACTIVATED]: ProxyProfile;
  [ProxyEvent.PROFILE_DEACTIVATED]: string; // profile id
  [ProxyEvent.CONNECTION_TESTED]: ProxyTestResult;
  [ProxyEvent.ERROR]: Error;
}
