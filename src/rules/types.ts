/**
 * Rules Engine Types and Interfaces
 * Provides flexible rule matching for automatic profile switching
 */

/**
 * Supported rule types for matching URLs
 */
export enum RuleType {
  /** Exact domain matching (e.g., "example.com") */
  DOMAIN = 'domain',
  /** Wildcard pattern matching (e.g., "*.example.com") */
  WILDCARD = 'wildcard',
  /** Regular expression matching */
  REGEX = 'regex',
  /** Match based on IP address ranges */
  IP_RANGE = 'ip_range',
  /** Match based on URL scheme (http/https) */
  SCHEME = 'scheme'
}

/**
 * Rule priority levels for conflict resolution
 */
export enum RulePriority {
  /** System default rules (lowest priority) */
  DEFAULT = 0,
  /** User-defined low priority rules */
  LOW = 100,
  /** Normal priority rules */
  NORMAL = 500,
  /** High priority rules */
  HIGH = 800,
  /** Critical rules that override all others */
  CRITICAL = 1000
}

/**
 * Rule match result
 */
export interface RuleMatch {
  /** Whether the rule matched */
  matched: boolean;
  /** The rule that matched */
  rule?: Rule;
  /** Match confidence score (0-1) */
  confidence?: number;
  /** Additional match details */
  details?: Record<string, any>;
}

/**
 * Base rule configuration
 */
export interface Rule {
  /** Unique rule identifier */
  id: string;
  /** Rule name for display */
  name: string;
  /** Rule description */
  description?: string;
  /** Rule type */
  type: RuleType;
  /** Pattern to match against */
  pattern: string;
  /** Profile ID to switch to when matched */
  profileId: string;
  /** Rule priority for conflict resolution */
  priority: RulePriority;
  /** Whether the rule is enabled */
  enabled: boolean;
  /** Optional tags for organization */
  tags?: string[];
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Optional conditions for advanced matching */
  conditions?: RuleCondition[];
  /** Statistics about rule usage */
  stats?: RuleStats;
}

/**
 * Additional conditions for rule matching
 */
export interface RuleCondition {
  /** Condition type */
  type: 'time_range' | 'day_of_week' | 'network' | 'custom';
  /** Condition parameters */
  params: Record<string, any>;
  /** Whether this condition is required */
  required?: boolean;
}

/**
 * Rule usage statistics
 */
export interface RuleStats {
  /** Number of times the rule has been matched */
  matchCount: number;
  /** Last time the rule was matched */
  lastMatched?: Date;
  /** Average match time in milliseconds */
  avgMatchTime?: number;
}

/**
 * Rule set configuration
 */
export interface RuleSet {
  /** Unique rule set identifier */
  id: string;
  /** Rule set name */
  name: string;
  /** Rule set description */
  description?: string;
  /** Rules in this set */
  rules: Rule[];
  /** Whether this rule set is active */
  enabled: boolean;
  /** Rule set category */
  category?: RuleCategory;
  /** Whether this is a system rule set */
  isSystem?: boolean;
  /** Rule set version for updates */
  version?: string;
}

/**
 * Predefined rule set categories
 */
export enum RuleCategory {
  /** Rules for local development */
  DEVELOPMENT = 'development',
  /** Rules for corporate/work environments */
  CORPORATE = 'corporate',
  /** Rules for streaming services */
  STREAMING = 'streaming',
  /** Rules for social media */
  SOCIAL_MEDIA = 'social_media',
  /** Rules for privacy/security */
  PRIVACY = 'privacy',
  /** Custom user-defined category */
  CUSTOM = 'custom'
}

/**
 * URL components for matching
 */
export interface URLComponents {
  /** Full URL */
  url: string;
  /** Protocol (http, https, etc.) */
  protocol: string;
  /** Hostname */
  hostname: string;
  /** Port number */
  port?: string;
  /** Path */
  pathname: string;
  /** Query string */
  search?: string;
  /** Hash/fragment */
  hash?: string;
  /** Domain parts (e.g., ['www', 'example', 'com']) */
  domainParts?: string[];
}

/**
 * Rule testing result
 */
export interface RuleTestResult {
  /** Test URL */
  url: string;
  /** Parsed URL components */
  urlComponents: URLComponents;
  /** All matching rules */
  matches: RuleMatch[];
  /** The winning rule (highest priority) */
  winningRule?: Rule;
  /** Recommended profile ID */
  recommendedProfileId?: string;
  /** Test execution time in milliseconds */
  executionTime: number;
  /** Test timestamp */
  timestamp: Date;
}

/**
 * Rule validation result
 */
export interface RuleValidationResult {
  /** Whether the rule is valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings?: string[];
  /** Suggested fixes */
  suggestions?: string[];
}

/**
 * Rule import/export format
 */
export interface RuleExport {
  /** Export format version */
  version: string;
  /** Export timestamp */
  exportedAt: Date;
  /** Exported rules */
  rules: Rule[];
  /** Exported rule sets */
  ruleSets?: RuleSet[];
  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Rule engine configuration
 */
export interface RuleEngineConfig {
  /** Enable rule caching for performance */
  enableCache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Maximum number of rules to evaluate */
  maxRules?: number;
  /** Enable rule statistics tracking */
  enableStats?: boolean;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom rule validators */
  validators?: RuleValidator[];
}

/**
 * Custom rule validator interface
 */
export interface RuleValidator {
  /** Validator name */
  name: string;
  /** Validation function */
  validate: (rule: Rule) => RuleValidationResult;
}
