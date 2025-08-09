/**
 * Core proxy management module exports
 */

// Export types
export * from '../types/proxy';

// Export ProxyManager
export { ProxyManager, getProxyManager } from './ProxyManager';

// Export storage service
export type { IStorageService } from '../services/storage';
export { 
  createStorageService, 
  getStorageService 
} from '../services/storage';

// Export validation utilities
export {
  validateProxyConfig,
  validateProxyProfile,
  isValidHost,
  isValidPort,
  isValidProxyType,
  isValidBypassEntry,
  isValidColor,
  isValidTag,
  isValidUrl,
  sanitizeHost,
  normalizeBypassList,
  getDefaultBypassList
} from '../utils/validation';
