/**
 * PAC Script Tester
 * Provides comprehensive testing functionality for PAC scripts
 */

import {
  PACTestCase,
  PACTestResult,
  PACTestSuite,
  PACExecutionContext,
  PACFunctionSignatures
} from './types';
import { PACValidator } from './PACValidator';

/**
 * PAC Script Tester
 */
export class PACTester {
  private script: string;
  private context: PACExecutionContext;
  private testSuites: Map<string, PACTestSuite>;

  constructor(script?: string) {
    this.script = script || '';
    this.context = {};
    this.testSuites = new Map();
  }

  /**
   * Set the PAC script to test
   */
  setScript(script: string): void {
    this.script = script;
  }

  /**
   * Set execution context for testing
   */
  setContext(context: PACExecutionContext): void {
    this.context = context;
  }

  /**
   * Test a single URL
   */
  async testURL(url: string, expectedResult?: string): Promise<PACTestResult> {
    const host = this.extractHost(url);
    const testCase: PACTestCase = {
      id: `test-${Date.now()}`,
      name: `Test for ${url}`,
      url,
      host,
      expectedResult: expectedResult || 'DIRECT'
    };

    return this.runTestCase(testCase);
  }

  /**
   * Run a single test case
   */
  async runTestCase(testCase: PACTestCase): Promise<PACTestResult> {
    const startTime = performance.now();
    
    try {
      // Validate script first
      const validation = PACValidator.validate(this.script);
      if (!validation.isValid) {
        throw new Error(`Invalid PAC script: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Create sandboxed environment with PAC functions
      const sandbox = this.createSandbox();
      
      // Execute PAC script in sandbox
      const findProxyForURL = this.compilePACScript(this.script, sandbox);
      
      // Run the test
      const actualResult = findProxyForURL(testCase.url, testCase.host);
      
      // Validate the result
      if (!PACValidator.validateProxyString(actualResult)) {
        throw new Error(`Invalid proxy string returned: ${actualResult}`);
      }

      const passed = testCase.expectedResult 
        ? actualResult === testCase.expectedResult
        : true;

      return {
        testCase,
        actualResult,
        passed,
        executionTime: performance.now() - startTime
      };
    } catch (error: any) {
      return {
        testCase,
        actualResult: '',
        passed: false,
        error: error.message,
        executionTime: performance.now() - startTime
      };
    }
  }

  /**
   * Run a test suite
   */
  async runTestSuite(suite: PACTestSuite): Promise<PACTestResult[]> {
    const results: PACTestResult[] = [];
    
    for (const testCase of suite.testCases) {
      const result = await this.runTestCase(testCase);
      results.push(result);
    }
    
    // Update suite last run time
    suite.lastRun = new Date();
    
    return results;
  }

  /**
   * Create a sandboxed environment with PAC functions
   */
  private createSandbox(): any {
    const sandbox: any = {};
    const context = this.context;

    // Implement PAC functions
    sandbox.isInNet = (host: string, pattern: string, mask: string): boolean => {
      const hostIP = context.dnsResults?.get(host) || this.mockDnsResolve(host);
      return this.isInNetImplementation(hostIP, pattern, mask);
    };

    sandbox.dnsDomainIs = (host: string, domain: string): boolean => {
      return host.endsWith(domain);
    };

    sandbox.localHostOrDomainIs = (host: string, hostdom: string): boolean => {
      return host === hostdom || host === hostdom.split('.')[0];
    };

    sandbox.isResolvable = (host: string): boolean => {
      const ip = context.dnsResults?.get(host) || this.mockDnsResolve(host);
      return ip !== '';
    };

    sandbox.isPlainHostName = (host: string): boolean => {
      return !host.includes('.');
    };

    sandbox.shExpMatch = (str: string, shexp: string): boolean => {
      const regex = this.shellExpressionToRegex(shexp);
      return regex.test(str);
    };

    sandbox.weekdayRange = (wd1: string, wd2?: string, gmt?: string): boolean => {
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const now = context.currentTime || new Date();
      const currentDay = days[gmt === 'GMT' ? now.getUTCDay() : now.getDay()];
      
      if (!wd2) {
        return currentDay === wd1;
      }
      
      const start = days.indexOf(wd1);
      const end = days.indexOf(wd2);
      const current = days.indexOf(currentDay);
      
      if (start <= end) {
        return current >= start && current <= end;
      } else {
        return current >= start || current <= end;
      }
    };

    sandbox.dateRange = (...args: any[]): boolean => {
      // Simplified implementation
      const now = context.currentTime || new Date();
      // This would need a more complex implementation for all date range formats
      return true;
    };

    sandbox.timeRange = (...args: any[]): boolean => {
      // Simplified implementation
      const now = context.currentTime || new Date();
      const currentHour = now.getHours();
      
      if (args.length >= 2) {
        const startHour = parseInt(args[0], 10);
        const endHour = parseInt(args[1], 10);
        return currentHour >= startHour && currentHour <= endHour;
      }
      
      return true;
    };

    sandbox.dnsResolve = (host: string): string => {
      return context.dnsResults?.get(host) || this.mockDnsResolve(host);
    };

    sandbox.myIpAddress = (): string => {
      return context.myIpAddress || '127.0.0.1';
    };

    sandbox.dnsDomainLevels = (host: string): number => {
      return host.split('.').length - 1;
    };

    // Add alert for debugging (no-op in test environment)
    sandbox.alert = (msg: string): void => {
      console.log('PAC Alert:', msg);
    };

    return sandbox;
  }

  /**
   * Compile PAC script with sandbox
   */
  private compilePACScript(script: string, sandbox: any): (url: string, host: string) => string {
    // Create a function that executes the PAC script with the sandbox context
    // Note: In a production environment, this should use a proper sandboxing solution
    // like vm2 or a Web Worker for security
    
    const funcBody = `
      ${Object.keys(sandbox).map(key => `var ${key} = sandbox.${key};`).join('\n')}
      ${script}
      return FindProxyForURL(url, host);
    `;
    
    const func = new Function('sandbox', 'url', 'host', funcBody);
    
    return (url: string, host: string) => {
      return func(sandbox, url, host);
    };
  }

  /**
   * Extract host from URL
   */
  private extractHost(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      // Fallback for invalid URLs
      const match = url.match(/^(?:https?:\/\/)?([^\/]+)/);
      return match ? match[1] : url;
    }
  }

  /**
   * Mock DNS resolution for testing
   */
  private mockDnsResolve(host: string): string {
    // Return mock IPs for common patterns
    if (host === 'localhost') return '127.0.0.1';
    if (host.endsWith('.local')) return '192.168.1.100';
    if (host.includes('internal')) return '10.0.0.100';
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return host; // Already an IP
    
    // Return a mock public IP for other hosts
    return '8.8.8.8';
  }

  /**
   * Implementation of isInNet function
   */
  private isInNetImplementation(host: string, pattern: string, mask: string): boolean {
    const hostParts = host.split('.').map(p => parseInt(p, 10));
    const patternParts = pattern.split('.').map(p => parseInt(p, 10));
    const maskParts = mask.split('.').map(p => parseInt(p, 10));
    
    if (hostParts.length !== 4 || patternParts.length !== 4 || maskParts.length !== 4) {
      return false;
    }
    
    for (let i = 0; i < 4; i++) {
      if ((hostParts[i] & maskParts[i]) !== (patternParts[i] & maskParts[i])) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Convert shell expression to regex
   */
  private shellExpressionToRegex(shexp: string): RegExp {
    let regex = shexp
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*/g, '.*') // * matches any string
      .replace(/\?/g, '.'); // ? matches any single character
    
    return new RegExp(`^${regex}$`, 'i');
  }

  /**
   * Add a test suite
   */
  addTestSuite(suite: PACTestSuite): void {
    this.testSuites.set(suite.id, suite);
  }

  /**
   * Get all test suites
   */
  getTestSuites(): PACTestSuite[] {
    return Array.from(this.testSuites.values());
  }

  /**
   * Create a default test suite
   */
  static createDefaultTestSuite(): PACTestSuite {
    return {
      id: 'default',
      name: 'Default PAC Tests',
      description: 'Common test cases for PAC scripts',
      createdAt: new Date(),
      testCases: [
        {
          id: 'test-direct',
          name: 'Direct connection',
          url: 'http://localhost/test',
          host: 'localhost',
          expectedResult: 'DIRECT',
          description: 'Local connections should be direct'
        },
        {
          id: 'test-internal',
          name: 'Internal network',
          url: 'http://internal.company.com/app',
          host: 'internal.company.com',
          expectedResult: 'DIRECT',
          description: 'Internal network should bypass proxy'
        },
        {
          id: 'test-external',
          name: 'External website',
          url: 'https://www.example.com/',
          host: 'www.example.com',
          expectedResult: 'PROXY proxy.company.com:8080',
          description: 'External sites should use proxy'
        },
        {
          id: 'test-ip-direct',
          name: 'IP address',
          url: 'http://192.168.1.100/',
          host: '192.168.1.100',
          expectedResult: 'DIRECT',
          description: 'Private IP ranges should be direct'
        },
        {
          id: 'test-https',
          name: 'HTTPS site',
          url: 'https://secure.example.com/',
          host: 'secure.example.com',
          expectedResult: 'PROXY proxy.company.com:8080',
          description: 'HTTPS sites should use proxy'
        }
      ]
    };
  }

  /**
   * Generate test report
   */
  generateTestReport(results: PACTestResult[]): string {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / total;
    
    let report = '=== PAC Script Test Report ===\n\n';
    report += `Total Tests: ${total}\n`;
    report += `Passed: ${passed} (${((passed / total) * 100).toFixed(1)}%)\n`;
    report += `Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)\n`;
    report += `Average Execution Time: ${avgTime.toFixed(2)}ms\n\n`;
    
    report += '=== Test Results ===\n\n';
    
    for (const result of results) {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      report += `${status} | ${result.testCase.name}\n`;
      report += `  URL: ${result.testCase.url}\n`;
      report += `  Expected: ${result.testCase.expectedResult}\n`;
      report += `  Actual: ${result.actualResult}\n`;
      
      if (result.error) {
        report += `  Error: ${result.error}\n`;
      }
      
      report += `  Time: ${result.executionTime.toFixed(2)}ms\n\n`;
    }
    
    return report;
  }
}
