/**
 * Validation utilities for proxy settings
 */

import { 
  ProxyConfig, 
  ProxyProfile, 
  ProxyType, 
  ValidationResult, 
  ValidationError 
} from '../types/proxy';

/**
 * Validates a proxy configuration
 */
export function validateProxyConfig(config: Partial<ProxyConfig>): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate host
  if (!config.host) {
    errors.push({
      field: 'host',
      message: 'Proxy host is required'
    });
  } else if (!isValidHost(config.host)) {
    errors.push({
      field: 'host',
      message: 'Invalid proxy host format',
      value: config.host
    });
  }

  // Validate port
  if (config.port === undefined || config.port === null) {
    errors.push({
      field: 'port',
      message: 'Proxy port is required'
    });
  } else if (!isValidPort(config.port)) {
    errors.push({
      field: 'port',
      message: 'Port must be between 1 and 65535',
      value: config.port
    });
  }

  // Validate type
  if (!config.type) {
    errors.push({
      field: 'type',
      message: 'Proxy type is required'
    });
  } else if (!isValidProxyType(config.type)) {
    errors.push({
      field: 'type',
      message: 'Invalid proxy type',
      value: config.type
    });
  }

  // Validate authentication if provided
  if (config.auth) {
    if (!config.auth.username) {
      errors.push({
        field: 'auth.username',
        message: 'Username is required when authentication is provided'
      });
    }
    if (!config.auth.password) {
      errors.push({
        field: 'auth.password',
        message: 'Password is required when authentication is provided'
      });
    }
  }

  // Validate bypass list
  if (config.bypassList && Array.isArray(config.bypassList)) {
    config.bypassList.forEach((entry, index) => {
      if (!isValidBypassEntry(entry)) {
        errors.push({
          field: `bypassList[${index}]`,
          message: 'Invalid bypass list entry format',
          value: entry
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a proxy profile
 */
export function validateProxyProfile(profile: Partial<ProxyProfile>): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate basic fields
  if (!profile.name) {
    errors.push({
      field: 'name',
      message: 'Profile name is required'
    });
  } else if (profile.name.length > 50) {
    errors.push({
      field: 'name',
      message: 'Profile name must be 50 characters or less',
      value: profile.name
    });
  }

  if (profile.description && profile.description.length > 200) {
    errors.push({
      field: 'description',
      message: 'Description must be 200 characters or less',
      value: profile.description
    });
  }

  // Validate color if provided
  if (profile.color && !isValidColor(profile.color)) {
    errors.push({
      field: 'color',
      message: 'Invalid color format (use hex color)',
      value: profile.color
    });
  }

  // Validate tags
  if (profile.tags && Array.isArray(profile.tags)) {
    profile.tags.forEach((tag, index) => {
      if (!isValidTag(tag)) {
        errors.push({
          field: `tags[${index}]`,
          message: 'Invalid tag format',
          value: tag
        });
      }
    });
  }

  // Validate proxy config if provided
  if (profile.config) {
    const configValidation = validateProxyConfig(profile.config);
    errors.push(...configValidation.errors);
  } else if (profile.id) {
    // Only require config for existing profiles
    errors.push({
      field: 'config',
      message: 'Proxy configuration is required'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Checks if a string is a valid hostname or IP address
 */
export function isValidHost(host: string): boolean {
  if (!host || typeof host !== 'string') return false;
  
  // Remove protocol if present
  const cleanHost = host.replace(/^(https?:\/\/)?/, '');
  
  // Check for IP address (IPv4)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(cleanHost)) {
    const parts = cleanHost.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }
  
  // Check for IPv6 address (simplified check)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  if (ipv6Regex.test(cleanHost)) {
    return true;
  }
  
  // Check for hostname
  const hostnameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return hostnameRegex.test(cleanHost) && cleanHost.length <= 253;
}

/**
 * Checks if a port number is valid
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Checks if a proxy type is valid
 */
export function isValidProxyType(type: string): boolean {
  return Object.values(ProxyType).includes(type as ProxyType);
}

/**
 * Checks if a bypass list entry is valid
 */
export function isValidBypassEntry(entry: string): boolean {
  if (!entry || typeof entry !== 'string') return false;
  
  // Allow wildcards
  const cleanEntry = entry.replace(/\*/g, '');
  
  // Check for CIDR notation
  if (entry.includes('/')) {
    const [ip, cidr] = entry.split('/');
    const cidrNum = parseInt(cidr, 10);
    return isValidHost(ip) && cidrNum >= 0 && cidrNum <= 32;
  }
  
  // Check for port specification
  if (entry.includes(':')) {
    const [host, port] = rsplit(entry, ':', 1);
    return isValidHost(host) && isValidPort(parseInt(port, 10));
  }
  
  // Check as regular host
  return isValidHost(cleanEntry) || cleanEntry === 'localhost' || cleanEntry === '<local>';
}

/**
 * Checks if a color string is valid (hex format)
 */
export function isValidColor(color: string): boolean {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
}

/**
 * Checks if a tag is valid
 */
export function isValidTag(tag: string): boolean {
  if (!tag || typeof tag !== 'string') return false;
  // Allow alphanumeric, hyphens, and underscores
  const tagRegex = /^[a-zA-Z0-9_-]+$/;
  return tagRegex.test(tag) && tag.length <= 20;
}

/**
 * Sanitizes a proxy host by removing protocol
 */
export function sanitizeHost(host: string): string {
  return host.replace(/^(https?:\/\/)?/, '').trim();
}

/**
 * Normalizes a bypass list
 */
export function normalizeBypassList(bypassList?: string[]): string[] {
  if (!bypassList || !Array.isArray(bypassList)) return [];
  
  return bypassList
    .filter(entry => entry && typeof entry === 'string')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0)
    .filter((entry, index, self) => self.indexOf(entry) === index); // Remove duplicates
}

/**
 * Helper to split string by last occurrence
 */
function rsplit(str: string, sep: string, maxsplit: number): string[] {
  const split = str.split(sep);
  return maxsplit
    ? [split.slice(0, -maxsplit).join(sep)].concat(split.slice(-maxsplit))
    : split;
}

/**
 * Validates a URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a default bypass list for local addresses
 */
export function getDefaultBypassList(): string[] {
  return [
    'localhost',
    '127.0.0.1',
    '::1',
    '<local>',
    '*.local',
    '169.254/16',
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16'
  ];
}
