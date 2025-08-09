/**
 * PAC Script Editor
 * Provides autocomplete, templates, and helper functions for PAC script editing
 */

import {
  PACSuggestion,
  PACEditorConfig,
  PACTemplate,
  PACTemplateVariable,
  PACFunction
} from './types';

/**
 * PAC Script Editor Helper
 */
export class PACEditor {
  private config: PACEditorConfig;
  private templates: Map<string, PACTemplate>;

  constructor(config?: PACEditorConfig) {
    this.config = config || {
      enableAutocomplete: true,
      enableSyntaxHighlight: true,
      enableRealtimeValidation: true,
      validationDelay: 500,
      theme: 'auto',
      fontSize: 14,
      tabSize: 2,
      showLineNumbers: true,
      wordWrap: false
    };
    
    this.templates = new Map();
    this.initializeTemplates();
  }

  /**
   * Get autocomplete suggestions for a given context
   */
  getAutocompleteSuggestions(
    code: string,
    cursorPosition: number
  ): PACSuggestion[] {
    const suggestions: PACSuggestion[] = [];
    
    // Get the current line and word being typed
    const { currentWord, lineContent, inFunction } = this.analyzeContext(code, cursorPosition);
    
    // Add function suggestions
    if (this.shouldSuggestFunctions(currentWord, lineContent)) {
      suggestions.push(...this.getFunctionSuggestions(currentWord));
    }
    
    // Add keyword suggestions
    suggestions.push(...this.getKeywordSuggestions(currentWord));
    
    // Add proxy type suggestions
    if (this.shouldSuggestProxyTypes(lineContent)) {
      suggestions.push(...this.getProxyTypeSuggestions(currentWord));
    }
    
    // Add snippet suggestions
    if (!inFunction || lineContent.trim() === '') {
      suggestions.push(...this.getSnippetSuggestions(currentWord));
    }
    
    // Sort suggestions by relevance
    return this.sortSuggestions(suggestions, currentWord);
  }

  /**
   * Analyze the context at cursor position
   */
  private analyzeContext(code: string, cursorPosition: number): {
    currentWord: string;
    lineContent: string;
    inFunction: boolean;
  } {
    const lines = code.substring(0, cursorPosition).split('\n');
    const currentLine = lines[lines.length - 1];
    
    // Get the current word being typed
    const words = currentLine.split(/\s+/);
    const currentWord = words[words.length - 1] || '';
    
    // Check if we're inside a function
    const beforeCursor = code.substring(0, cursorPosition);
    const functionDepth = (beforeCursor.match(/{/g) || []).length - 
                          (beforeCursor.match(/}/g) || []).length;
    
    return {
      currentWord,
      lineContent: currentLine,
      inFunction: functionDepth > 0
    };
  }

  /**
   * Get function suggestions
   */
  private getFunctionSuggestions(prefix: string): PACSuggestion[] {
    const functions: PACSuggestion[] = [
      {
        label: 'isInNet',
        type: 'function',
        detail: 'isInNet(host, pattern, mask)',
        documentation: 'Returns true if the IP address of the host matches the specified pattern and mask.',
        insertText: 'isInNet(${1:host}, "${2:10.0.0.0}", "${3:255.0.0.0}")',
        sortText: '1'
      },
      {
        label: 'dnsDomainIs',
        type: 'function',
        detail: 'dnsDomainIs(host, domain)',
        documentation: 'Returns true if the domain of hostname matches the specified domain.',
        insertText: 'dnsDomainIs(${1:host}, "${2:.example.com}")',
        sortText: '2'
      },
      {
        label: 'shExpMatch',
        type: 'function',
        detail: 'shExpMatch(str, pattern)',
        documentation: 'Returns true if the string matches the shell expression pattern.',
        insertText: 'shExpMatch(${1:host}, "${2:*.example.com}")',
        sortText: '3'
      },
      {
        label: 'isPlainHostName',
        type: 'function',
        detail: 'isPlainHostName(host)',
        documentation: 'Returns true if the hostname contains no dots.',
        insertText: 'isPlainHostName(${1:host})',
        sortText: '4'
      },
      {
        label: 'localHostOrDomainIs',
        type: 'function',
        detail: 'localHostOrDomainIs(host, hostdom)',
        documentation: 'Returns true if the hostname matches exactly or is an unqualified hostname.',
        insertText: 'localHostOrDomainIs(${1:host}, "${2:www.example.com}")',
        sortText: '5'
      },
      {
        label: 'isResolvable',
        type: 'function',
        detail: 'isResolvable(host)',
        documentation: 'Returns true if the hostname can be resolved to an IP address.',
        insertText: 'isResolvable(${1:host})',
        sortText: '6'
      },
      {
        label: 'dnsResolve',
        type: 'function',
        detail: 'dnsResolve(host)',
        documentation: 'Resolves the hostname to an IP address.',
        insertText: 'dnsResolve(${1:host})',
        sortText: '7'
      },
      {
        label: 'myIpAddress',
        type: 'function',
        detail: 'myIpAddress()',
        documentation: 'Returns the IP address of the client machine.',
        insertText: 'myIpAddress()',
        sortText: '8'
      },
      {
        label: 'dnsDomainLevels',
        type: 'function',
        detail: 'dnsDomainLevels(host)',
        documentation: 'Returns the number of DNS domain levels (dots) in the hostname.',
        insertText: 'dnsDomainLevels(${1:host})',
        sortText: '9'
      },
      {
        label: 'weekdayRange',
        type: 'function',
        detail: 'weekdayRange(wd1, wd2?, gmt?)',
        documentation: 'Returns true if the current day is within the specified range.',
        insertText: 'weekdayRange("${1:MON}", "${2:FRI}")',
        sortText: '10'
      },
      {
        label: 'dateRange',
        type: 'function',
        detail: 'dateRange(...args)',
        documentation: 'Returns true if the current date is within the specified range.',
        insertText: 'dateRange(${1:1}, "${2:JAN}", ${3:31}, "${4:DEC}")',
        sortText: '11'
      },
      {
        label: 'timeRange',
        type: 'function',
        detail: 'timeRange(...args)',
        documentation: 'Returns true if the current time is within the specified range.',
        insertText: 'timeRange(${1:8}, ${2:17})',
        sortText: '12'
      }
    ];
    
    return functions.filter(f => 
      !prefix || f.label.toLowerCase().startsWith(prefix.toLowerCase())
    );
  }

  /**
   * Get keyword suggestions
   */
  private getKeywordSuggestions(prefix: string): PACSuggestion[] {
    const keywords: PACSuggestion[] = [
      {
        label: 'function',
        type: 'keyword',
        detail: 'Function declaration',
        insertText: 'function',
        sortText: '20'
      },
      {
        label: 'return',
        type: 'keyword',
        detail: 'Return statement',
        insertText: 'return',
        sortText: '21'
      },
      {
        label: 'if',
        type: 'keyword',
        detail: 'If statement',
        insertText: 'if (${1:condition}) {\n  ${2}\n}',
        sortText: '22'
      },
      {
        label: 'else',
        type: 'keyword',
        detail: 'Else statement',
        insertText: 'else {\n  ${1}\n}',
        sortText: '23'
      },
      {
        label: 'else if',
        type: 'keyword',
        detail: 'Else if statement',
        insertText: 'else if (${1:condition}) {\n  ${2}\n}',
        sortText: '24'
      },
      {
        label: 'var',
        type: 'keyword',
        detail: 'Variable declaration',
        insertText: 'var ${1:name} = ${2:value};',
        sortText: '25'
      },
      {
        label: 'for',
        type: 'keyword',
        detail: 'For loop',
        insertText: 'for (var ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n  ${3}\n}',
        sortText: '26'
      }
    ];
    
    return keywords.filter(k => 
      !prefix || k.label.toLowerCase().startsWith(prefix.toLowerCase())
    );
  }

  /**
   * Get proxy type suggestions
   */
  private getProxyTypeSuggestions(prefix: string): PACSuggestion[] {
    const proxyTypes: PACSuggestion[] = [
      {
        label: 'DIRECT',
        type: 'proxy',
        detail: 'Direct connection (no proxy)',
        insertText: '"DIRECT"',
        sortText: '30'
      },
      {
        label: 'PROXY',
        type: 'proxy',
        detail: 'HTTP proxy',
        insertText: '"PROXY ${1:proxy.example.com}:${2:8080}"',
        sortText: '31'
      },
      {
        label: 'SOCKS',
        type: 'proxy',
        detail: 'SOCKS proxy',
        insertText: '"SOCKS ${1:socks.example.com}:${2:1080}"',
        sortText: '32'
      },
      {
        label: 'SOCKS4',
        type: 'proxy',
        detail: 'SOCKS4 proxy',
        insertText: '"SOCKS4 ${1:socks4.example.com}:${2:1080}"',
        sortText: '33'
      },
      {
        label: 'SOCKS5',
        type: 'proxy',
        detail: 'SOCKS5 proxy',
        insertText: '"SOCKS5 ${1:socks5.example.com}:${2:1080}"',
        sortText: '34'
      },
      {
        label: 'HTTP',
        type: 'proxy',
        detail: 'HTTP proxy',
        insertText: '"HTTP ${1:http.example.com}:${2:8080}"',
        sortText: '35'
      },
      {
        label: 'HTTPS',
        type: 'proxy',
        detail: 'HTTPS proxy',
        insertText: '"HTTPS ${1:https.example.com}:${2:8443}"',
        sortText: '36'
      }
    ];
    
    return proxyTypes.filter(p => 
      !prefix || p.label.toLowerCase().startsWith(prefix.toLowerCase())
    );
  }

  /**
   * Get snippet suggestions
   */
  private getSnippetSuggestions(prefix: string): PACSuggestion[] {
    const snippets: PACSuggestion[] = [
      {
        label: 'FindProxyForURL',
        type: 'snippet',
        detail: 'Main PAC function',
        documentation: 'The main function that determines the proxy for a URL',
        insertText: `function FindProxyForURL(url, host) {
  // Local/internal addresses
  if (isPlainHostName(host) ||
      dnsDomainIs(host, ".local") ||
      isInNet(dnsResolve(host), "10.0.0.0", "255.0.0.0") ||
      isInNet(dnsResolve(host), "172.16.0.0", "255.240.0.0") ||
      isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0")) {
    return "DIRECT";
  }
  
  // Default proxy
  return "\${1:PROXY proxy.example.com:8080}";
}`,
        sortText: '40'
      },
      {
        label: 'checkLocalNetwork',
        type: 'snippet',
        detail: 'Check if host is on local network',
        insertText: `// Check for local network
if (isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0")) {
  return "DIRECT";
}`,
        sortText: '41'
      },
      {
        label: 'domainCheck',
        type: 'snippet',
        detail: 'Check if host matches domain',
        insertText: `// Check domain
if (dnsDomainIs(host, ".\${1:example.com}")) {
  return "\${2:DIRECT}";
}`,
        sortText: '42'
      },
      {
        label: 'wildcardMatch',
        type: 'snippet',
        detail: 'Wildcard pattern matching',
        insertText: `// Wildcard match
if (shExpMatch(host, "\${1:*.example.com}")) {
  return "\${2:PROXY proxy.example.com:8080}";
}`,
        sortText: '43'
      },
      {
        label: 'timeBasedProxy',
        type: 'snippet',
        detail: 'Time-based proxy selection',
        insertText: `// Use different proxy during work hours
if (timeRange(8, 17)) {
  return "PROXY work-proxy.example.com:8080";
} else {
  return "DIRECT";
}`,
        sortText: '44'
      }
    ];
    
    return snippets.filter(s => 
      !prefix || s.label.toLowerCase().includes(prefix.toLowerCase())
    );
  }

  /**
   * Check if we should suggest functions
   */
  private shouldSuggestFunctions(currentWord: string, lineContent: string): boolean {
    // Suggest functions after 'if (', 'else if (', or at the start of a condition
    return /(?:if\s*\(|else\s+if\s*\(|\|\||&&)\s*$/.test(lineContent) ||
           (currentWord.length > 0 && /^[a-zA-Z]/.test(currentWord));
  }

  /**
   * Check if we should suggest proxy types
   */
  private shouldSuggestProxyTypes(lineContent: string): boolean {
    // Suggest proxy types after 'return'
    return /return\s+["']?$/.test(lineContent);
  }

  /**
   * Sort suggestions by relevance
   */
  private sortSuggestions(suggestions: PACSuggestion[], prefix: string): PACSuggestion[] {
    return suggestions.sort((a, b) => {
      // Exact match first
      const aExact = a.label.toLowerCase() === prefix.toLowerCase();
      const bExact = b.label.toLowerCase() === prefix.toLowerCase();
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then by sort text
      if (a.sortText && b.sortText) {
        return a.sortText.localeCompare(b.sortText);
      }
      
      // Finally by label
      return a.label.localeCompare(b.label);
    });
  }

  /**
   * Initialize built-in templates
   */
  private initializeTemplates(): void {
    const templates: PACTemplate[] = [
      {
        id: 'basic',
        name: 'Basic PAC Script',
        description: 'Simple PAC script with local network detection',
        category: 'basic',
        content: this.getBasicTemplate(),
        variables: [
          {
            name: 'proxyServer',
            description: 'Proxy server address',
            type: 'proxy',
            defaultValue: 'proxy.example.com:8080',
            required: true
          }
        ]
      },
      {
        id: 'corporate',
        name: 'Corporate PAC Script',
        description: 'PAC script for corporate environments with multiple proxies',
        category: 'corporate',
        content: this.getCorporateTemplate(),
        variables: [
          {
            name: 'corpProxy',
            description: 'Corporate proxy server',
            type: 'proxy',
            defaultValue: 'corp-proxy.company.com:8080',
            required: true
          },
          {
            name: 'backupProxy',
            description: 'Backup proxy server',
            type: 'proxy',
            defaultValue: 'backup-proxy.company.com:8080',
            required: false
          },
          {
            name: 'internalDomain',
            description: 'Internal domain suffix',
            type: 'domain',
            defaultValue: '.company.local',
            required: true
          }
        ]
      },
      {
        id: 'advanced',
        name: 'Advanced PAC Script',
        description: 'Advanced PAC script with load balancing and failover',
        category: 'advanced',
        content: this.getAdvancedTemplate()
      }
    ];
    
    templates.forEach(t => this.templates.set(t.id, t));
  }

  /**
   * Get basic template content
   */
  private getBasicTemplate(): string {
    return `function FindProxyForURL(url, host) {
  // Direct connection for localhost
  if (host === "localhost" || host === "127.0.0.1") {
    return "DIRECT";
  }
  
  // Direct connection for local networks
  if (isInNet(dnsResolve(host), "10.0.0.0", "255.0.0.0") ||
      isInNet(dnsResolve(host), "172.16.0.0", "255.240.0.0") ||
      isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0")) {
    return "DIRECT";
  }
  
  // Use proxy for everything else
  return "PROXY {{proxyServer}}";
}`;
  }

  /**
   * Get corporate template content
   */
  private getCorporateTemplate(): string {
    return `function FindProxyForURL(url, host) {
  // Direct connection for localhost
  if (host === "localhost" || host === "127.0.0.1") {
    return "DIRECT";
  }
  
  // Direct connection for internal domains
  if (dnsDomainIs(host, "{{internalDomain}}")) {
    return "DIRECT";
  }
  
  // Direct connection for local networks
  if (isInNet(dnsResolve(host), "10.0.0.0", "255.0.0.0") ||
      isInNet(dnsResolve(host), "172.16.0.0", "255.240.0.0") ||
      isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0")) {
    return "DIRECT";
  }
  
  // Use corporate proxy with failover
  return "PROXY {{corpProxy}}; PROXY {{backupProxy}}; DIRECT";
}`;
  }

  /**
   * Get advanced template content
   */
  private getAdvancedTemplate(): string {
    return `// Advanced PAC Script with Load Balancing and Failover
var proxies = [
  "proxy1.example.com:8080",
  "proxy2.example.com:8080",
  "proxy3.example.com:8080"
];

var counter = 0;

function FindProxyForURL(url, host) {
  // Direct connection for localhost
  if (host === "localhost" || host === "127.0.0.1") {
    return "DIRECT";
  }
  
  // Direct connection for local networks
  if (isPlainHostName(host) ||
      dnsDomainIs(host, ".local") ||
      isInNet(dnsResolve(host), "10.0.0.0", "255.0.0.0") ||
      isInNet(dnsResolve(host), "172.16.0.0", "255.240.0.0") ||
      isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0")) {
    return "DIRECT";
  }
  
  // Load balance between proxies
  var proxy = proxies[counter % proxies.length];
  counter++;
  
  // Build failover chain
  var result = "PROXY " + proxy;
  for (var i = 0; i < proxies.length; i++) {
    if (proxies[i] !== proxy) {
      result += "; PROXY " + proxies[i];
    }
  }
  result += "; DIRECT";
  
  return result;
}`;
  }

  /**
   * Get a template by ID
   */
  getTemplate(id: string): PACTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): PACTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Apply a template with variables
   */
  applyTemplate(templateId: string, variables: Record<string, any>): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    let content = template.content;
    
    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(pattern, value);
    }
    
    return content;
  }
}
