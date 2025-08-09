/**
 * PAC Script Types and Interfaces
 * Provides types for PAC script parsing, validation, and generation
 */

import { Rule, RuleType } from '../rules/types';
import { ProxyConfig, ProxyType } from '../types/proxy';

/**
 * PAC script configuration
 */
export interface PACConfig {
  /** PAC script content */
  script?: string;
  /** URL to external PAC script */
  url?: string;
  /** Whether to use local script or external URL */
  useUrl?: boolean;
  /** Auto-update interval for external PAC scripts (in minutes) */
  updateInterval?: number;
  /** Last update timestamp */
  lastUpdated?: Date;
  /** Whether PAC script is enabled */
  enabled: boolean;
}

/**
 * PAC function types
 */
export enum PACFunction {
  // Network functions
  IS_IN_NET = 'isInNet',
  DNS_DOMAIN_IS = 'dnsDomainIs',
  LOCAL_HOST_OR_DOMAIN_IS = 'localHostOrDomainIs',
  IS_RESOLVABLE = 'isResolvable',
  IS_PLAIN_HOST_NAME = 'isPlainHostName',
  
  // String matching functions
  SHEXP_MATCH = 'shExpMatch',
  
  // Date/Time functions
  WEEKDAY_RANGE = 'weekdayRange',
  DATE_RANGE = 'dateRange',
  TIME_RANGE = 'timeRange',
  
  // Utility functions
  DNS_RESOLVE = 'dnsResolve',
  MY_IP_ADDRESS = 'myIpAddress',
  DNS_DOMAIN_LEVELS = 'dnsDomainLevels'
}

/**
 * PAC script validation result
 */
export interface PACValidationResult {
  /** Whether the PAC script is valid */
  isValid: boolean;
  /** Validation errors */
  errors: PACValidationError[];
  /** Validation warnings */
  warnings?: PACValidationWarning[];
  /** Detected PAC functions */
  functions?: string[];
  /** Detected proxy configurations */
  proxies?: string[];
}

/**
 * PAC validation error
 */
export interface PACValidationError {
  /** Error line number */
  line?: number;
  /** Error column number */
  column?: number;
  /** Error message */
  message: string;
  /** Error type */
  type: 'syntax' | 'function' | 'logic' | 'security';
}

/**
 * PAC validation warning
 */
export interface PACValidationWarning {
  /** Warning line number */
  line?: number;
  /** Warning message */
  message: string;
  /** Warning type */
  type: 'performance' | 'compatibility' | 'style';
}

/**
 * PAC script test case
 */
export interface PACTestCase {
  /** Test case ID */
  id: string;
  /** Test case name */
  name: string;
  /** Test URL */
  url: string;
  /** Test host */
  host: string;
  /** Expected result */
  expectedResult: string;
  /** Test description */
  description?: string;
}

/**
 * PAC script test result
 */
export interface PACTestResult {
  /** Test case */
  testCase: PACTestCase;
  /** Actual result from PAC script */
  actualResult: string;
  /** Whether test passed */
  passed: boolean;
  /** Error message if test failed */
  error?: string;
  /** Execution time in milliseconds */
  executionTime: number;
}

/**
 * PAC script test suite
 */
export interface PACTestSuite {
  /** Suite ID */
  id: string;
  /** Suite name */
  name: string;
  /** Test cases */
  testCases: PACTestCase[];
  /** Suite description */
  description?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last run timestamp */
  lastRun?: Date;
}

/**
 * PAC generation options
 */
export interface PACGenerationOptions {
  /** Include comments in generated script */
  includeComments?: boolean;
  /** Minify the generated script */
  minify?: boolean;
  /** Default proxy to use when no rules match */
  defaultProxy?: string;
  /** Include debug logging */
  includeDebug?: boolean;
  /** Custom header comment */
  headerComment?: string;
  /** Optimization level (0-3) */
  optimizationLevel?: number;
}

/**
 * PAC rule conversion mapping
 */
export interface PACRuleMapping {
  /** Original rule */
  rule: Rule;
  /** Generated PAC condition */
  condition: string;
  /** Proxy result */
  proxyResult: string;
  /** Priority for ordering */
  priority: number;
}

/**
 * PAC autocomplete suggestion
 */
export interface PACSuggestion {
  /** Suggestion label */
  label: string;
  /** Suggestion type */
  type: 'function' | 'keyword' | 'proxy' | 'snippet';
  /** Suggestion detail */
  detail?: string;
  /** Documentation */
  documentation?: string;
  /** Insert text */
  insertText: string;
  /** Sort priority */
  sortText?: string;
}

/**
 * PAC editor configuration
 */
export interface PACEditorConfig {
  /** Enable autocomplete */
  enableAutocomplete?: boolean;
  /** Enable syntax highlighting */
  enableSyntaxHighlight?: boolean;
  /** Enable real-time validation */
  enableRealtimeValidation?: boolean;
  /** Validation delay in milliseconds */
  validationDelay?: number;
  /** Editor theme */
  theme?: 'light' | 'dark' | 'auto';
  /** Font size */
  fontSize?: number;
  /** Tab size */
  tabSize?: number;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Word wrap */
  wordWrap?: boolean;
}

/**
 * PAC script metadata
 */
export interface PACMetadata {
  /** Script version */
  version?: string;
  /** Script author */
  author?: string;
  /** Script description */
  description?: string;
  /** Creation date */
  created?: Date;
  /** Last modified date */
  modified?: Date;
  /** Script hash for integrity check */
  hash?: string;
  /** Script size in bytes */
  size?: number;
}

/**
 * PAC script template
 */
export interface PACTemplate {
  /** Template ID */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Template category */
  category: 'basic' | 'advanced' | 'corporate' | 'custom';
  /** Template content */
  content: string;
  /** Template variables */
  variables?: PACTemplateVariable[];
  /** Template tags */
  tags?: string[];
}

/**
 * PAC template variable
 */
export interface PACTemplateVariable {
  /** Variable name */
  name: string;
  /** Variable description */
  description: string;
  /** Variable type */
  type: 'string' | 'number' | 'boolean' | 'proxy' | 'domain';
  /** Default value */
  defaultValue?: any;
  /** Whether variable is required */
  required?: boolean;
  /** Validation pattern */
  pattern?: string;
}

/**
 * PAC execution context for testing
 */
export interface PACExecutionContext {
  /** Mock DNS resolution results */
  dnsResults?: Map<string, string>;
  /** Mock client IP address */
  myIpAddress?: string;
  /** Current date/time for testing */
  currentTime?: Date;
  /** Additional context variables */
  variables?: Record<string, any>;
}

/**
 * PAC optimization result
 */
export interface PACOptimizationResult {
  /** Original script */
  original: string;
  /** Optimized script */
  optimized: string;
  /** Size reduction percentage */
  sizeReduction: number;
  /** Optimization suggestions */
  suggestions: string[];
  /** Performance improvements */
  performanceGain?: number;
}

/**
 * Proxy string format in PAC scripts
 */
export type PACProxyString = 
  | 'DIRECT'
  | `PROXY ${string}:${number}`
  | `SOCKS ${string}:${number}`
  | `SOCKS4 ${string}:${number}`
  | `SOCKS5 ${string}:${number}`
  | `HTTP ${string}:${number}`
  | `HTTPS ${string}:${number}`;

/**
 * PAC function signature definitions
 */
export interface PACFunctionSignatures {
  isInNet: (host: string, pattern: string, mask: string) => boolean;
  dnsDomainIs: (host: string, domain: string) => boolean;
  localHostOrDomainIs: (host: string, hostdom: string) => boolean;
  isResolvable: (host: string) => boolean;
  isPlainHostName: (host: string) => boolean;
  shExpMatch: (str: string, shexp: string) => boolean;
  weekdayRange: (wd1: string, wd2?: string, gmt?: string) => boolean;
  dateRange: (...args: any[]) => boolean;
  timeRange: (...args: any[]) => boolean;
  dnsResolve: (host: string) => string;
  myIpAddress: () => string;
  dnsDomainLevels: (host: string) => number;
}
