/**
 * Rule Testing Interface
 * Provides utilities for testing URL patterns and validating rules
 */

import { RuleEngine } from './RuleEngine';
import {
  Rule,
  RuleType,
  RulePriority,
  RuleTestResult,
  URLComponents,
  RuleValidationResult
} from './types';

/**
 * Test scenario for batch testing
 */
export interface TestScenario {
  /** Scenario name */
  name: string;
  /** Test URL */
  url: string;
  /** Expected profile ID */
  expectedProfileId?: string;
  /** Expected to match */
  shouldMatch: boolean;
  /** Additional test metadata */
  metadata?: Record<string, any>;
}

/**
 * Batch test result
 */
export interface BatchTestResult {
  /** Total tests run */
  totalTests: number;
  /** Number of passed tests */
  passed: number;
  /** Number of failed tests */
  failed: number;
  /** Individual test results */
  results: TestScenarioResult[];
  /** Execution time in milliseconds */
  executionTime: number;
}

/**
 * Individual test scenario result
 */
export interface TestScenarioResult {
  /** Test scenario */
  scenario: TestScenario;
  /** Test result */
  result: RuleTestResult;
  /** Whether the test passed */
  passed: boolean;
  /** Failure reason if test failed */
  failureReason?: string;
}

/**
 * Rule pattern examples
 */
export interface PatternExample {
  /** Pattern string */
  pattern: string;
  /** Pattern description */
  description: string;
  /** Example URLs that match */
  matchingUrls: string[];
  /** Example URLs that don't match */
  nonMatchingUrls: string[];
}

/**
 * Rule tester class
 */
export class RuleTester {
  private engine: RuleEngine;

  constructor(engine: RuleEngine) {
    this.engine = engine;
  }

  /**
   * Test a single URL
   */
  testURL(url: string): RuleTestResult {
    return this.engine.testURL(url);
  }

  /**
   * Run batch tests
   */
  runBatchTests(scenarios: TestScenario[]): BatchTestResult {
    const startTime = performance.now();
    const results: TestScenarioResult[] = [];

    for (const scenario of scenarios) {
      const result = this.engine.testURL(scenario.url);
      const passed = this.evaluateScenario(scenario, result);
      
      results.push({
        scenario,
        result,
        passed,
        failureReason: passed ? undefined : this.getFailureReason(scenario, result)
      });
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;

    return {
      totalTests: results.length,
      passed,
      failed,
      results,
      executionTime: performance.now() - startTime
    };
  }

  /**
   * Evaluate if a test scenario passed
   */
  private evaluateScenario(scenario: TestScenario, result: RuleTestResult): boolean {
    const hasMatch = result.winningRule !== undefined;

    // Check if match status is as expected
    if (scenario.shouldMatch !== hasMatch) {
      return false;
    }

    // If expecting a specific profile, check it
    if (scenario.expectedProfileId && result.recommendedProfileId !== scenario.expectedProfileId) {
      return false;
    }

    return true;
  }

  /**
   * Get failure reason for a test
   */
  private getFailureReason(scenario: TestScenario, result: RuleTestResult): string {
    const hasMatch = result.winningRule !== undefined;

    if (scenario.shouldMatch && !hasMatch) {
      return `Expected to match but no rules matched`;
    }

    if (!scenario.shouldMatch && hasMatch) {
      return `Expected no match but rule "${result.winningRule?.name}" matched`;
    }

    if (scenario.expectedProfileId && result.recommendedProfileId !== scenario.expectedProfileId) {
      return `Expected profile ${scenario.expectedProfileId} but got ${result.recommendedProfileId}`;
    }

    return 'Unknown failure reason';
  }

  /**
   * Validate a rule pattern
   */
  validatePattern(type: RuleType, pattern: string): RuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    switch (type) {
      case RuleType.DOMAIN:
        this.validateDomainPattern(pattern, errors, warnings, suggestions);
        break;

      case RuleType.WILDCARD:
        this.validateWildcardPattern(pattern, errors, warnings, suggestions);
        break;

      case RuleType.REGEX:
        this.validateRegexPattern(pattern, errors, warnings, suggestions);
        break;

      case RuleType.IP_RANGE:
        this.validateIPRangePattern(pattern, errors, warnings, suggestions);
        break;

      case RuleType.SCHEME:
        this.validateSchemePattern(pattern, errors, warnings, suggestions);
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  /**
   * Validate domain pattern
   */
  private validateDomainPattern(
    pattern: string,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    if (!pattern) {
      errors.push('Domain pattern cannot be empty');
      return;
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9.-]+$/.test(pattern)) {
      errors.push('Domain pattern contains invalid characters');
    }

    // Check for proper domain structure
    if (pattern.startsWith('.') || pattern.endsWith('.')) {
      errors.push('Domain cannot start or end with a dot');
    }

    if (pattern.includes('..')) {
      errors.push('Domain cannot contain consecutive dots');
    }

    // Suggestions
    if (pattern.includes('*')) {
      suggestions.push('Use wildcard rule type for patterns with asterisks');
    }

    if (pattern.startsWith('http://') || pattern.startsWith('https://')) {
      warnings.push('Domain pattern should not include protocol');
      suggestions.push(`Use "${pattern.replace(/^https?:\/\//, '')}" instead`);
    }
  }

  /**
   * Validate wildcard pattern
   */
  private validateWildcardPattern(
    pattern: string,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    if (!pattern) {
      errors.push('Wildcard pattern cannot be empty');
      return;
    }

    // Check for valid wildcard usage
    if (!pattern.includes('*')) {
      warnings.push('Wildcard pattern does not contain any wildcards');
      suggestions.push('Consider using domain rule type for exact matches');
    }

    if (pattern.includes('**')) {
      warnings.push('Double wildcards (**) are treated as single wildcards (*)');
    }

    // Check for common mistakes
    if (pattern === '*') {
      warnings.push('Pattern "*" matches all domains');
    }

    if (pattern.startsWith('http://') || pattern.startsWith('https://')) {
      warnings.push('Wildcard pattern should not include protocol');
    }
  }

  /**
   * Validate regex pattern
   */
  private validateRegexPattern(
    pattern: string,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    if (!pattern) {
      errors.push('Regex pattern cannot be empty');
      return;
    }

    try {
      new RegExp(pattern);
    } catch (error) {
      errors.push(`Invalid regex: ${error.message}`);
      return;
    }

    // Check for common regex issues
    if (pattern.includes('.*') && !pattern.includes('\\.')) {
      warnings.push('Pattern may be too broad - consider escaping dots');
    }

    if (!pattern.startsWith('^') || !pattern.endsWith('$')) {
      suggestions.push('Consider using ^ and $ anchors for exact matching');
    }

    // Performance warnings
    if (pattern.includes('.*.*') || pattern.includes('.+.+')) {
      warnings.push('Pattern may cause performance issues due to backtracking');
    }
  }

  /**
   * Validate IP range pattern
   */
  private validateIPRangePattern(
    pattern: string,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    if (!pattern) {
      errors.push('IP range pattern cannot be empty');
      return;
    }

    if (pattern.includes('/')) {
      // CIDR notation
      const [ip, prefix] = pattern.split('/');
      if (!this.isValidIP(ip)) {
        errors.push('Invalid IP address in CIDR notation');
      }
      const prefixNum = parseInt(prefix, 10);
      if (isNaN(prefixNum) || prefixNum < 0 || prefixNum > 32) {
        errors.push('Invalid CIDR prefix (must be 0-32)');
      }
    } else if (pattern.includes('-')) {
      // Range notation
      const [start, end] = pattern.split('-');
      if (!this.isValidIP(start)) {
        errors.push('Invalid start IP address');
      }
      if (!this.isValidIP(end)) {
        errors.push('Invalid end IP address');
      }
      if (this.isValidIP(start) && this.isValidIP(end)) {
        const startNum = this.ipToNumber(start);
        const endNum = this.ipToNumber(end);
        if (startNum > endNum) {
          errors.push('Start IP must be less than or equal to end IP');
        }
      }
    } else {
      // Single IP
      if (!this.isValidIP(pattern)) {
        errors.push('Invalid IP address');
      }
    }
  }

  /**
   * Validate scheme pattern
   */
  private validateSchemePattern(
    pattern: string,
    errors: string[],
    warnings: string[],
    suggestions: string[]
  ): void {
    if (!pattern) {
      errors.push('Scheme pattern cannot be empty');
      return;
    }

    const validSchemes = ['http', 'https', 'ftp', 'ftps', 'ws', 'wss', 'file'];
    const schemes = pattern.toLowerCase().split(',').map(s => s.trim());

    for (const scheme of schemes) {
      if (!validSchemes.includes(scheme)) {
        warnings.push(`Unknown scheme: ${scheme}`);
      }
    }

    if (schemes.length === 1 && schemes[0] === 'http') {
      suggestions.push('Consider including both http and https');
    }
  }

  /**
   * Check if IP address is valid
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
   * Convert IP to number for comparison
   */
  private ipToNumber(ip: string): number {
    const parts = ip.split('.');
    return parts.reduce((acc, part, index) => {
      return acc + (parseInt(part, 10) << (8 * (3 - index)));
    }, 0) >>> 0;
  }

  /**
   * Get pattern examples for a rule type
   */
  getPatternExamples(type: RuleType): PatternExample[] {
    switch (type) {
      case RuleType.DOMAIN:
        return [
          {
            pattern: 'example.com',
            description: 'Matches example.com and all subdomains',
            matchingUrls: [
              'https://example.com',
              'https://www.example.com',
              'https://api.example.com'
            ],
            nonMatchingUrls: [
              'https://example.org',
              'https://notexample.com'
            ]
          },
          {
            pattern: 'api.github.com',
            description: 'Matches only api.github.com',
            matchingUrls: [
              'https://api.github.com/users',
              'https://api.github.com/repos'
            ],
            nonMatchingUrls: [
              'https://github.com',
              'https://www.github.com'
            ]
          }
        ];

      case RuleType.WILDCARD:
        return [
          {
            pattern: '*.example.com',
            description: 'Matches all subdomains of example.com',
            matchingUrls: [
              'https://www.example.com',
              'https://api.example.com',
              'https://blog.example.com'
            ],
            nonMatchingUrls: [
              'https://example.com',
              'https://example.org'
            ]
          },
          {
            pattern: '*google*',
            description: 'Matches any domain containing "google"',
            matchingUrls: [
              'https://google.com',
              'https://mail.google.com',
              'https://googleanalytics.com'
            ],
            nonMatchingUrls: [
              'https://bing.com',
              'https://yahoo.com'
            ]
          }
        ];

      case RuleType.REGEX:
        return [
          {
            pattern: '^https://[^/]*\\.example\\.com/api/.*',
            description: 'Matches API endpoints on example.com subdomains',
            matchingUrls: [
              'https://api.example.com/api/users',
              'https://www.example.com/api/v1/data'
            ],
            nonMatchingUrls: [
              'https://example.com/home',
              'https://api.example.com/docs'
            ]
          },
          {
            pattern: '.*\\.(jpg|jpeg|png|gif)$',
            description: 'Matches image URLs',
            matchingUrls: [
              'https://example.com/image.jpg',
              'https://cdn.site.com/photo.png'
            ],
            nonMatchingUrls: [
              'https://example.com/document.pdf',
              'https://example.com/page.html'
            ]
          }
        ];

      case RuleType.IP_RANGE:
        return [
          {
            pattern: '192.168.1.0/24',
            description: 'Matches local network 192.168.1.x',
            matchingUrls: [
              'http://192.168.1.1',
              'http://192.168.1.100',
              'http://192.168.1.255'
            ],
            nonMatchingUrls: [
              'http://192.168.2.1',
              'http://10.0.0.1'
            ]
          },
          {
            pattern: '10.0.0.1-10.0.0.100',
            description: 'Matches IP range from 10.0.0.1 to 10.0.0.100',
            matchingUrls: [
              'http://10.0.0.1',
              'http://10.0.0.50',
              'http://10.0.0.100'
            ],
            nonMatchingUrls: [
              'http://10.0.0.101',
              'http://10.0.1.1'
            ]
          }
        ];

      case RuleType.SCHEME:
        return [
          {
            pattern: 'https',
            description: 'Matches only HTTPS URLs',
            matchingUrls: [
              'https://example.com',
              'https://secure.site.com'
            ],
            nonMatchingUrls: [
              'http://example.com',
              'ftp://files.com'
            ]
          },
          {
            pattern: 'http,https',
            description: 'Matches both HTTP and HTTPS URLs',
            matchingUrls: [
              'http://example.com',
              'https://secure.site.com'
            ],
            nonMatchingUrls: [
              'ftp://files.com',
              'ws://websocket.com'
            ]
          }
        ];

      default:
        return [];
    }
  }

  /**
   * Generate test scenarios from pattern examples
   */
  generateTestScenarios(
    type: RuleType,
    pattern: string,
    profileId: string
  ): TestScenario[] {
    const examples = this.getPatternExamples(type);
    const scenarios: TestScenario[] = [];

    // Find matching example
    const matchingExample = examples.find(e => e.pattern === pattern);
    
    if (matchingExample) {
      // Add matching scenarios
      for (const url of matchingExample.matchingUrls) {
        scenarios.push({
          name: `Should match: ${url}`,
          url,
          expectedProfileId: profileId,
          shouldMatch: true
        });
      }

      // Add non-matching scenarios
      for (const url of matchingExample.nonMatchingUrls) {
        scenarios.push({
          name: `Should not match: ${url}`,
          url,
          shouldMatch: false
        });
      }
    }

    return scenarios;
  }

  /**
   * Test pattern against multiple URLs
   */
  testPattern(
    type: RuleType,
    pattern: string,
    urls: string[]
  ): { url: string; matches: boolean }[] {
    // Create temporary rule for testing
    const tempRule: Rule = {
      id: 'temp-test-rule',
      name: 'Test Rule',
      type,
      pattern,
      profileId: 'test-profile',
      priority: RulePriority.NORMAL,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add temporary rule
    this.engine.addRule(tempRule);

    const results = urls.map(url => {
      const testResult = this.engine.testURL(url);
      return {
        url,
        matches: testResult.winningRule?.id === 'temp-test-rule'
      };
    });

    // Remove temporary rule
    this.engine.removeRule('temp-test-rule');

    return results;
  }
}
