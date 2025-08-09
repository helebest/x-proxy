/**
 * PAC Script Validator
 * Provides comprehensive validation and parsing for PAC scripts
 */

import {
  PACValidationResult,
  PACValidationError,
  PACValidationWarning,
  PACFunction
} from './types';

/**
 * PAC Script Validator
 */
export class PACValidator {
  private static readonly REQUIRED_FUNCTION = 'FindProxyForURL';
  private static readonly PAC_FUNCTIONS = Object.values(PACFunction);
  
  // Security patterns to detect potentially dangerous code
  private static readonly DANGEROUS_PATTERNS = [
    /eval\s*\(/gi,
    /new\s+Function\s*\(/gi,
    /document\./gi,
    /window\./gi,
    /import\s*\(/gi,
    /require\s*\(/gi,
    /process\./gi,
    /child_process/gi,
    /fs\./gi,
    /__proto__/gi,
    /constructor\s*\[/gi
  ];

  // Common proxy return formats
  private static readonly PROXY_PATTERNS = [
    /^DIRECT$/i,
    /^PROXY\s+[\w.-]+:\d+$/i,
    /^SOCKS\s+[\w.-]+:\d+$/i,
    /^SOCKS4\s+[\w.-]+:\d+$/i,
    /^SOCKS5\s+[\w.-]+:\d+$/i,
    /^HTTP\s+[\w.-]+:\d+$/i,
    /^HTTPS\s+[\w.-]+:\d+$/i
  ];

  /**
   * Validate a PAC script
   */
  static validate(script: string): PACValidationResult {
    const errors: PACValidationError[] = [];
    const warnings: PACValidationWarning[] = [];
    const detectedFunctions: Set<string> = new Set();
    const detectedProxies: Set<string> = new Set();

    // Check for empty script
    if (!script || script.trim().length === 0) {
      errors.push({
        message: 'PAC script is empty',
        type: 'syntax'
      });
      return { isValid: false, errors, warnings };
    }

    // Check for required FindProxyForURL function
    if (!this.hasFindProxyForURL(script)) {
      errors.push({
        message: `PAC script must contain a ${this.REQUIRED_FUNCTION} function`,
        type: 'function',
        line: 1
      });
    }

    // Check function signature
    const signatureErrors = this.validateFunctionSignature(script);
    errors.push(...signatureErrors);

    // Check for security issues
    const securityErrors = this.checkSecurityIssues(script);
    errors.push(...securityErrors);

    // Check syntax errors
    const syntaxErrors = this.checkSyntax(script);
    errors.push(...syntaxErrors);

    // Detect PAC functions used
    const functions = this.detectPACFunctions(script);
    functions.forEach(func => detectedFunctions.add(func));

    // Detect proxy configurations
    const proxies = this.detectProxyConfigurations(script);
    proxies.forEach(proxy => detectedProxies.add(proxy));

    // Check for performance issues
    const performanceWarnings = this.checkPerformanceIssues(script);
    warnings.push(...performanceWarnings);

    // Check for compatibility issues
    const compatibilityWarnings = this.checkCompatibilityIssues(script);
    warnings.push(...compatibilityWarnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
      functions: Array.from(detectedFunctions),
      proxies: Array.from(detectedProxies)
    };
  }

  /**
   * Check if script contains FindProxyForURL function
   */
  private static hasFindProxyForURL(script: string): boolean {
    const pattern = /function\s+FindProxyForURL\s*\(/i;
    return pattern.test(script);
  }

  /**
   * Validate FindProxyForURL function signature
   */
  private static validateFunctionSignature(script: string): PACValidationError[] {
    const errors: PACValidationError[] = [];
    const signaturePattern = /function\s+FindProxyForURL\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/i;
    const match = script.match(signaturePattern);

    if (match) {
      const [, param1, param2] = match;
      
      // Check for conventional parameter names
      if (param1 !== 'url' || param2 !== 'host') {
        const line = this.getLineNumber(script, match.index || 0);
        errors.push({
          message: `Function parameters should be (url, host), found (${param1}, ${param2})`,
          type: 'function',
          line
        });
      }
    } else if (this.hasFindProxyForURL(script)) {
      errors.push({
        message: 'Invalid FindProxyForURL function signature',
        type: 'syntax'
      });
    }

    return errors;
  }

  /**
   * Check for security issues in the script
   */
  private static checkSecurityIssues(script: string): PACValidationError[] {
    const errors: PACValidationError[] = [];

    for (const pattern of this.DANGEROUS_PATTERNS) {
      const matches = [...script.matchAll(pattern)];
      for (const match of matches) {
        const line = this.getLineNumber(script, match.index || 0);
        errors.push({
          message: `Potentially dangerous code detected: ${match[0]}`,
          type: 'security',
          line
        });
      }
    }

    return errors;
  }

  /**
   * Check basic syntax errors
   */
  private static checkSyntax(script: string): PACValidationError[] {
    const errors: PACValidationError[] = [];

    try {
      // Basic syntax check using Function constructor
      // Note: This is for validation only, not execution
      new Function('url', 'host', script);
    } catch (error: any) {
      const match = error.message.match(/line (\d+)/i);
      const line = match ? parseInt(match[1], 10) : undefined;
      
      errors.push({
        message: `Syntax error: ${error.message}`,
        type: 'syntax',
        line
      });
    }

    // Check for balanced braces
    const braceBalance = this.checkBraceBalance(script);
    if (braceBalance !== 0) {
      errors.push({
        message: `Unbalanced braces: ${braceBalance > 0 ? 'missing closing' : 'extra closing'} brace(s)`,
        type: 'syntax'
      });
    }

    // Check for return statements
    if (!script.includes('return')) {
      errors.push({
        message: 'FindProxyForURL function must return a proxy configuration',
        type: 'logic'
      });
    }

    return errors;
  }

  /**
   * Detect PAC functions used in the script
   */
  private static detectPACFunctions(script: string): string[] {
    const functions: string[] = [];

    for (const func of this.PAC_FUNCTIONS) {
      const pattern = new RegExp(`\\b${func}\\s*\\(`, 'gi');
      if (pattern.test(script)) {
        functions.push(func);
      }
    }

    return functions;
  }

  /**
   * Detect proxy configurations in the script
   */
  private static detectProxyConfigurations(script: string): string[] {
    const proxies: Set<string> = new Set();

    // Look for return statements
    const returnPattern = /return\s+["']([^"']+)["']/gi;
    const matches = [...script.matchAll(returnPattern)];

    for (const match of matches) {
      const proxyString = match[1];
      
      // Split by semicolon for multiple proxy fallback
      const proxyParts = proxyString.split(';').map(p => p.trim());
      
      for (const part of proxyParts) {
        // Check if it matches known proxy patterns
        for (const pattern of this.PROXY_PATTERNS) {
          if (pattern.test(part)) {
            proxies.add(part);
            break;
          }
        }
      }
    }

    return Array.from(proxies);
  }

  /**
   * Check for performance issues
   */
  private static checkPerformanceIssues(script: string): PACValidationWarning[] {
    const warnings: PACValidationWarning[] = [];

    // Check for DNS resolution in loops
    if (/for\s*\([^)]*\)[^{]*{[^}]*dnsResolve/i.test(script)) {
      warnings.push({
        message: 'DNS resolution inside loops can cause performance issues',
        type: 'performance'
      });
    }

    // Check for excessive DNS lookups
    const dnsCount = (script.match(/dnsResolve|isResolvable|isInNet/gi) || []).length;
    if (dnsCount > 5) {
      warnings.push({
        message: `High number of DNS operations (${dnsCount}) may impact performance`,
        type: 'performance'
      });
    }

    // Check for complex regular expressions
    const regexPattern = /\/[^\/]+\/[gim]*/g;
    const regexMatches = script.match(regexPattern) || [];
    for (const regex of regexMatches) {
      if (regex.length > 100) {
        const line = this.getLineNumber(script, script.indexOf(regex));
        warnings.push({
          message: 'Complex regular expression may impact performance',
          type: 'performance',
          line
        });
      }
    }

    return warnings;
  }

  /**
   * Check for compatibility issues
   */
  private static checkCompatibilityIssues(script: string): PACValidationWarning[] {
    const warnings: PACValidationWarning[] = [];

    // Check for ES6+ syntax
    const es6Patterns = [
      { pattern: /=>/g, message: 'Arrow functions are not supported in all PAC environments' },
      { pattern: /`[^`]*`/g, message: 'Template literals are not supported in all PAC environments' },
      { pattern: /\blet\b|\bconst\b/g, message: 'let/const declarations are not supported in all PAC environments' },
      { pattern: /\.\.\./g, message: 'Spread operator is not supported in all PAC environments' }
    ];

    for (const { pattern, message } of es6Patterns) {
      if (pattern.test(script)) {
        warnings.push({
          message,
          type: 'compatibility'
        });
      }
    }

    return warnings;
  }

  /**
   * Check brace balance
   */
  private static checkBraceBalance(script: string): number {
    let balance = 0;
    let inString = false;
    let stringChar = '';
    let escaped = false;

    for (let i = 0; i < script.length; i++) {
      const char = script[i];
      const prevChar = i > 0 ? script[i - 1] : '';

      // Handle escape sequences
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      // Handle strings
      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && inString) {
        inString = false;
        stringChar = '';
      }

      // Count braces only outside strings
      if (!inString) {
        if (char === '{') balance++;
        if (char === '}') balance--;
      }
    }

    return balance;
  }

  /**
   * Get line number for a given position in the script
   */
  private static getLineNumber(script: string, position: number): number {
    const lines = script.substring(0, position).split('\n');
    return lines.length;
  }

  /**
   * Validate a proxy return string
   */
  static validateProxyString(proxyString: string): boolean {
    // Split by semicolon for multiple proxy fallback
    const proxyParts = proxyString.split(';').map(p => p.trim());
    
    for (const part of proxyParts) {
      let isValid = false;
      
      // Check if it matches any known proxy pattern
      for (const pattern of this.PROXY_PATTERNS) {
        if (pattern.test(part)) {
          isValid = true;
          break;
        }
      }
      
      if (!isValid) {
        return false;
      }
    }
    
    return true;
  }
}
