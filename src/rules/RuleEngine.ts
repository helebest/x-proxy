/**
 * Rule Engine Implementation
 * Handles rule matching, priority resolution, and profile recommendations
 */

import {
  Rule,
  RuleType,
  RulePriority,
  RuleMatch,
  RuleTestResult,
  URLComponents,
  RuleEngineConfig,
  RuleValidationResult,
  RuleStats,
  RuleCondition
} from './types';

/**
 * Main rule engine class
 */
export class RuleEngine {
  private rules: Map<string, Rule>;
  private rulesByPriority: Rule[];
  private config: RuleEngineConfig;
  private cache: Map<string, RuleTestResult>;
  private cacheTimestamps: Map<string, number>;

  constructor(config?: RuleEngineConfig) {
    this.rules = new Map();
    this.rulesByPriority = [];
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.config = {
      enableCache: true,
      cacheTTL: 60000, // 1 minute default
      maxRules: 1000,
      enableStats: true,
      debug: false,
      ...config
    };
  }

  /**
   * Add a rule to the engine
   */
  addRule(rule: Rule): void {
    const validation = this.validateRule(rule);
    if (!validation.isValid) {
      throw new Error(`Invalid rule: ${validation.errors.join(', ')}`);
    }

    this.rules.set(rule.id, rule);
    this.updatePriorityOrder();
    this.clearCache();
  }

  /**
   * Remove a rule from the engine
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.updatePriorityOrder();
    this.clearCache();
  }

  /**
   * Update an existing rule
   */
  updateRule(ruleId: string, updates: Partial<Rule>): void {
    const existingRule = this.rules.get(ruleId);
    if (!existingRule) {
      throw new Error(`Rule with id ${ruleId} not found`);
    }

    const updatedRule = {
      ...existingRule,
      ...updates,
      id: existingRule.id,
      updatedAt: new Date()
    };

    const validation = this.validateRule(updatedRule);
    if (!validation.isValid) {
      throw new Error(`Invalid rule: ${validation.errors.join(', ')}`);
    }

    this.rules.set(ruleId, updatedRule);
    this.updatePriorityOrder();
    this.clearCache();
  }

  /**
   * Test a URL against all rules
   */
  testURL(url: string): RuleTestResult {
    const startTime = performance.now();

    // Check cache if enabled
    if (this.config.enableCache) {
      const cached = this.getCachedResult(url);
      if (cached) {
        return cached;
      }
    }

    // Parse URL components
    const urlComponents = this.parseURL(url);
    const matches: RuleMatch[] = [];

    // Test against all enabled rules
    for (const rule of this.rulesByPriority) {
      if (!rule.enabled) continue;

      const match = this.matchRule(rule, urlComponents);
      if (match.matched) {
        matches.push(match);
        
        // Update statistics if enabled
        if (this.config.enableStats && rule.stats) {
          this.updateRuleStats(rule, startTime);
        }
      }
    }

    // Determine winning rule (highest priority)
    const winningRule = matches.length > 0 ? matches[0].rule : undefined;

    const result: RuleTestResult = {
      url,
      urlComponents,
      matches,
      winningRule,
      recommendedProfileId: winningRule?.profileId,
      executionTime: performance.now() - startTime,
      timestamp: new Date()
    };

    // Cache result if enabled
    if (this.config.enableCache) {
      this.cacheResult(url, result);
    }

    return result;
  }

  /**
   * Match a single rule against URL components
   */
  private matchRule(rule: Rule, urlComponents: URLComponents): RuleMatch {
    let matched = false;
    let confidence = 0;
    const details: Record<string, any> = {};

    // Check additional conditions first
    if (rule.conditions && rule.conditions.length > 0) {
      const conditionsMatch = this.checkConditions(rule.conditions);
      if (!conditionsMatch) {
        return { matched: false };
      }
    }

    // Match based on rule type
    switch (rule.type) {
      case RuleType.DOMAIN:
        ({ matched, confidence } = this.matchDomain(rule.pattern, urlComponents));
        details.matchType = 'exact_domain';
        break;

      case RuleType.WILDCARD:
        ({ matched, confidence } = this.matchWildcard(rule.pattern, urlComponents));
        details.matchType = 'wildcard';
        break;

      case RuleType.REGEX:
        ({ matched, confidence } = this.matchRegex(rule.pattern, urlComponents));
        details.matchType = 'regex';
        break;

      case RuleType.IP_RANGE:
        ({ matched, confidence } = this.matchIPRange(rule.pattern, urlComponents));
        details.matchType = 'ip_range';
        break;

      case RuleType.SCHEME:
        ({ matched, confidence } = this.matchScheme(rule.pattern, urlComponents));
        details.matchType = 'scheme';
        break;

      default:
        this.log(`Unknown rule type: ${rule.type}`);
    }

    return {
      matched,
      rule: matched ? rule : undefined,
      confidence,
      details
    };
  }

  /**
   * Match domain rule
   */
  private matchDomain(pattern: string, urlComponents: URLComponents): { matched: boolean; confidence: number } {
    const hostname = urlComponents.hostname.toLowerCase();
    const patternLower = pattern.toLowerCase();

    // Exact match
    if (hostname === patternLower) {
      return { matched: true, confidence: 1.0 };
    }

    // Subdomain match (e.g., pattern "example.com" matches "www.example.com")
    if (hostname.endsWith(`.${patternLower}`)) {
      return { matched: true, confidence: 0.9 };
    }

    return { matched: false, confidence: 0 };
  }

  /**
   * Match wildcard pattern
   */
  private matchWildcard(pattern: string, urlComponents: URLComponents): { matched: boolean; confidence: number } {
    const hostname = urlComponents.hostname.toLowerCase();
    const patternLower = pattern.toLowerCase();

    // Convert wildcard pattern to regex
    const regexPattern = patternLower
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars except *
      .replace(/\*/g, '.*'); // Replace * with .*

    const regex = new RegExp(`^${regexPattern}$`);
    const matched = regex.test(hostname);

    // Calculate confidence based on specificity
    const wildcardCount = (pattern.match(/\*/g) || []).length;
    const confidence = matched ? Math.max(0.5, 1 - (wildcardCount * 0.1)) : 0;

    return { matched, confidence };
  }

  /**
   * Match regex pattern
   */
  private matchRegex(pattern: string, urlComponents: URLComponents): { matched: boolean; confidence: number } {
    try {
      const regex = new RegExp(pattern);
      const matched = regex.test(urlComponents.url);
      return { matched, confidence: matched ? 0.8 : 0 };
    } catch (error) {
      this.log(`Invalid regex pattern: ${pattern}`, error);
      return { matched: false, confidence: 0 };
    }
  }

  /**
   * Match IP range
   */
  private matchIPRange(pattern: string, urlComponents: URLComponents): { matched: boolean; confidence: number } {
    const hostname = urlComponents.hostname;

    // Check if hostname is an IP address
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(hostname)) {
      return { matched: false, confidence: 0 };
    }

    // Parse IP range pattern (e.g., "192.168.0.0/24" or "192.168.0.0-192.168.0.255")
    if (pattern.includes('/')) {
      // CIDR notation
      return this.matchCIDR(hostname, pattern);
    } else if (pattern.includes('-')) {
      // Range notation
      return this.matchIPRangeNotation(hostname, pattern);
    } else {
      // Exact IP match
      return {
        matched: hostname === pattern,
        confidence: hostname === pattern ? 1.0 : 0
      };
    }
  }

  /**
   * Match CIDR notation
   */
  private matchCIDR(ip: string, cidr: string): { matched: boolean; confidence: number } {
    const [network, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);

    const ipNum = this.ipToNumber(ip);
    const networkNum = this.ipToNumber(network);
    const mask = (0xffffffff << (32 - prefix)) >>> 0;

    const matched = (ipNum & mask) === (networkNum & mask);
    return { matched, confidence: matched ? 0.9 : 0 };
  }

  /**
   * Match IP range notation
   */
  private matchIPRangeNotation(ip: string, range: string): { matched: boolean; confidence: number } {
    const [start, end] = range.split('-');
    const ipNum = this.ipToNumber(ip);
    const startNum = this.ipToNumber(start);
    const endNum = this.ipToNumber(end);

    const matched = ipNum >= startNum && ipNum <= endNum;
    return { matched, confidence: matched ? 0.9 : 0 };
  }

  /**
   * Convert IP address to number
   */
  private ipToNumber(ip: string): number {
    const parts = ip.split('.');
    return parts.reduce((acc, part, index) => {
      return acc + (parseInt(part, 10) << (8 * (3 - index)));
    }, 0) >>> 0;
  }

  /**
   * Match URL scheme
   */
  private matchScheme(pattern: string, urlComponents: URLComponents): { matched: boolean; confidence: number } {
    const scheme = urlComponents.protocol.replace(':', '').toLowerCase();
    const patterns = pattern.toLowerCase().split(',').map(p => p.trim());
    const matched = patterns.includes(scheme);
    return { matched, confidence: matched ? 1.0 : 0 };
  }

  /**
   * Check additional conditions
   */
  private checkConditions(conditions: RuleCondition[]): boolean {
    for (const condition of conditions) {
      const result = this.evaluateCondition(condition);
      if (condition.required && !result) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: RuleCondition): boolean {
    switch (condition.type) {
      case 'time_range':
        return this.checkTimeRange(condition.params);
      case 'day_of_week':
        return this.checkDayOfWeek(condition.params);
      case 'network':
        return this.checkNetwork(condition.params);
      case 'custom':
        // Custom conditions would be evaluated by external handlers
        return true;
      default:
        return true;
    }
  }

  /**
   * Check time range condition
   */
  private checkTimeRange(params: Record<string, any>): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const startTime = this.parseTime(params.start);
    const endTime = this.parseTime(params.end);

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Handle overnight ranges
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Parse time string (HH:MM) to minutes
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Check day of week condition
   */
  private checkDayOfWeek(params: Record<string, any>): boolean {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const allowedDays = params.days || [];
    return allowedDays.includes(currentDay);
  }

  /**
   * Check network condition
   */
  private checkNetwork(params: Record<string, any>): boolean {
    // This would require network detection APIs
    // For now, return true as a placeholder
    return true;
  }

  /**
   * Parse URL into components
   */
  private parseURL(url: string): URLComponents {
    try {
      const urlObj = new URL(url);
      const domainParts = urlObj.hostname.split('.');

      return {
        url,
        protocol: urlObj.protocol.replace(':', ''),
        hostname: urlObj.hostname,
        port: urlObj.port || undefined,
        pathname: urlObj.pathname,
        search: urlObj.search || undefined,
        hash: urlObj.hash || undefined,
        domainParts
      };
    } catch (error) {
      // Handle invalid URLs
      return {
        url,
        protocol: '',
        hostname: url,
        pathname: '',
        domainParts: url.split('.')
      };
    }
  }

  /**
   * Validate a rule
   */
  private validateRule(rule: Rule): RuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!rule.id) errors.push('Rule ID is required');
    if (!rule.name) errors.push('Rule name is required');
    if (!rule.pattern) errors.push('Rule pattern is required');
    if (!rule.profileId) errors.push('Profile ID is required');
    if (!Object.values(RuleType).includes(rule.type)) {
      errors.push(`Invalid rule type: ${rule.type}`);
    }

    // Type-specific validation
    switch (rule.type) {
      case RuleType.REGEX:
        try {
          new RegExp(rule.pattern);
        } catch (error) {
          errors.push(`Invalid regex pattern: ${rule.pattern}`);
        }
        break;

      case RuleType.IP_RANGE:
        if (!this.isValidIPPattern(rule.pattern)) {
          errors.push(`Invalid IP range pattern: ${rule.pattern}`);
        }
        break;

      case RuleType.WILDCARD:
        if (rule.pattern.includes('**')) {
          warnings.push('Double wildcards (**) are simplified to single wildcards (*)');
        }
        break;
    }

    // Check for rule conflicts
    if (this.rules.size >= (this.config.maxRules || 1000)) {
      warnings.push(`Maximum number of rules (${this.config.maxRules}) reached`);
    }

    // Custom validators
    if (this.config.validators) {
      for (const validator of this.config.validators) {
        const result = validator.validate(rule);
        errors.push(...result.errors);
        if (result.warnings) warnings.push(...result.warnings);
        if (result.suggestions) suggestions.push(...result.suggestions);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  /**
   * Validate IP pattern
   */
  private isValidIPPattern(pattern: string): boolean {
    // Check for CIDR notation
    if (pattern.includes('/')) {
      const [ip, prefix] = pattern.split('/');
      const prefixNum = parseInt(prefix, 10);
      return this.isValidIP(ip) && prefixNum >= 0 && prefixNum <= 32;
    }

    // Check for range notation
    if (pattern.includes('-')) {
      const [start, end] = pattern.split('-');
      return this.isValidIP(start) && this.isValidIP(end);
    }

    // Check for single IP
    return this.isValidIP(pattern);
  }

  /**
   * Validate IP address
   */
  private isValidIP(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;

    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255 && part === num.toString();
    });
  }

  /**
   * Update rule priority order
   */
  private updatePriorityOrder(): void {
    this.rulesByPriority = Array.from(this.rules.values())
      .sort((a, b) => {
        // Sort by priority (descending) then by name (ascending)
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * Update rule statistics
   */
  private updateRuleStats(rule: Rule, startTime: number): void {
    if (!rule.stats) {
      rule.stats = {
        matchCount: 0,
        lastMatched: undefined,
        avgMatchTime: undefined
      };
    }

    const matchTime = performance.now() - startTime;
    rule.stats.matchCount++;
    rule.stats.lastMatched = new Date();

    // Update average match time
    if (rule.stats.avgMatchTime === undefined) {
      rule.stats.avgMatchTime = matchTime;
    } else {
      rule.stats.avgMatchTime = 
        (rule.stats.avgMatchTime * (rule.stats.matchCount - 1) + matchTime) / 
        rule.stats.matchCount;
    }
  }

  /**
   * Get cached result
   */
  private getCachedResult(url: string): RuleTestResult | null {
    const cached = this.cache.get(url);
    if (!cached) return null;

    const timestamp = this.cacheTimestamps.get(url);
    if (!timestamp) return null;

    const age = Date.now() - timestamp;
    if (age > (this.config.cacheTTL || 60000)) {
      this.cache.delete(url);
      this.cacheTimestamps.delete(url);
      return null;
    }

    return cached;
  }

  /**
   * Cache a result
   */
  private cacheResult(url: string, result: RuleTestResult): void {
    this.cache.set(url, result);
    this.cacheTimestamps.set(url, Date.now());

    // Limit cache size
    if (this.cache.size > 1000) {
      const oldestUrl = this.cache.keys().next().value;
      this.cache.delete(oldestUrl);
      this.cacheTimestamps.delete(oldestUrl);
    }
  }

  /**
   * Clear cache
   */
  private clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Log message if debug is enabled
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`[RuleEngine] ${message}`, ...args);
    }
  }

  /**
   * Get all rules
   */
  getRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules by priority
   */
  getRulesByPriority(): Rule[] {
    return [...this.rulesByPriority];
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.rules.clear();
    this.rulesByPriority = [];
    this.clearCache();
  }

  /**
   * Get rule statistics
   */
  getRuleStats(): Map<string, RuleStats> {
    const stats = new Map<string, RuleStats>();
    for (const [id, rule] of this.rules) {
      if (rule.stats) {
        stats.set(id, rule.stats);
      }
    }
    return stats;
  }
}
