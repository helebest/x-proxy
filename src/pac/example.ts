/**
 * PAC Script Usage Examples
 * Demonstrates how to use the PAC script functionality
 */

import {
  PACManager,
  PACValidator,
  PACGenerator,
  PACTester,
  PACEditor,
  PACTestCase,
  PACGenerationOptions
} from './index';
import { Rule, RuleType, RulePriority } from '../rules/types';
import { ProxyProfile, ProxyType } from '../types/proxy';

/**
 * Example 1: Basic PAC Script Management
 */
async function basicPACManagement() {
  console.log('=== Basic PAC Management ===\n');
  
  // Create a PAC manager
  const pacManager = new PACManager({
    enabled: true,
    script: '',
    useUrl: false
  });

  // Generate a simple PAC script
  const simpleScript = `
function FindProxyForURL(url, host) {
  if (isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0")) {
    return "DIRECT";
  }
  return "PROXY proxy.example.com:8080";
}`;

  // Validate the script
  const validation = pacManager.validateScript(simpleScript);
  console.log('Script valid:', validation.isValid);
  
  if (!validation.isValid) {
    console.log('Validation errors:', validation.errors);
  }

  // Update configuration
  pacManager.updateConfig({ script: simpleScript });
  
  // Test the script
  const testCase: PACTestCase = {
    id: 'test-1',
    name: 'Test local network',
    url: 'http://192.168.1.100/app',
    host: '192.168.1.100',
    expectedResult: 'DIRECT'
  };
  
  const result = await pacManager.testScript(simpleScript, testCase);
  console.log('Test passed:', result.passed);
  console.log('Actual result:', result.actualResult);
}

/**
 * Example 2: PAC Script Validation
 */
function validatePACScripts() {
  console.log('\n=== PAC Script Validation ===\n');
  
  // Valid script
  const validScript = `
function FindProxyForURL(url, host) {
  if (dnsDomainIs(host, ".internal.com")) {
    return "DIRECT";
  }
  if (shExpMatch(host, "*.example.com")) {
    return "PROXY proxy1.example.com:8080; PROXY proxy2.example.com:8080";
  }
  return "DIRECT";
}`;

  const validResult = PACValidator.validate(validScript);
  console.log('Valid script validation:', {
    isValid: validResult.isValid,
    functions: validResult.functions,
    proxies: validResult.proxies
  });

  // Invalid script with security issues
  const invalidScript = `
function FindProxyForURL(url, host) {
  eval("return 'PROXY evil.com:8080'"); // Security issue!
  return "DIRECT";
}`;

  const invalidResult = PACValidator.validate(invalidScript);
  console.log('\nInvalid script validation:', {
    isValid: invalidResult.isValid,
    errors: invalidResult.errors
  });

  // Script with performance warnings
  const slowScript = `
function FindProxyForURL(url, host) {
  for (var i = 0; i < 100; i++) {
    if (isResolvable(host + i)) { // DNS in loop!
      return "DIRECT";
    }
  }
  return "PROXY proxy.example.com:8080";
}`;

  const slowResult = PACValidator.validate(slowScript);
  console.log('\nSlow script validation:', {
    isValid: slowResult.isValid,
    warnings: slowResult.warnings
  });
}

/**
 * Example 3: Generate PAC from Rules
 */
function generatePACFromRules() {
  console.log('\n=== PAC Generation from Rules ===\n');
  
  // Create sample proxy profiles
  const profiles: ProxyProfile[] = [
    {
      id: 'corp-proxy',
      name: 'Corporate Proxy',
      isActive: true,
      config: {
        host: 'corp-proxy.company.com',
        port: 8080,
        type: ProxyType.HTTP
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'dev-proxy',
      name: 'Development Proxy',
      isActive: false,
      config: {
        host: 'dev-proxy.company.com',
        port: 3128,
        type: ProxyType.HTTP
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Create sample rules
  const rules: Rule[] = [
    {
      id: 'rule-1',
      name: 'Internal domains',
      type: RuleType.DOMAIN,
      pattern: '.internal.company.com',
      profileId: 'direct',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'rule-2',
      name: 'Development servers',
      type: RuleType.WILDCARD,
      pattern: '*.dev.company.com',
      profileId: 'dev-proxy',
      priority: RulePriority.NORMAL,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'rule-3',
      name: 'External sites',
      type: RuleType.WILDCARD,
      pattern: '*',
      profileId: 'corp-proxy',
      priority: RulePriority.LOW,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Create generator
  const generator = new PACGenerator(profiles);
  
  // Generation options
  const options: PACGenerationOptions = {
    includeComments: true,
    minify: false,
    defaultProxy: 'DIRECT',
    includeDebug: false,
    headerComment: 'Generated for Company Network',
    optimizationLevel: 2
  };
  
  // Generate PAC script
  const pacScript = generator.generate(rules, options);
  console.log('Generated PAC Script:');
  console.log(pacScript);
  
  // Generate minified version
  const minifiedOptions = { ...options, minify: true, includeComments: false };
  const minifiedScript = generator.generate(rules, minifiedOptions);
  console.log('\nMinified version size:', minifiedScript.length, 'bytes');
}

/**
 * Example 4: Test PAC Scripts
 */
async function testPACScripts() {
  console.log('\n=== PAC Script Testing ===\n');
  
  const script = `
function FindProxyForURL(url, host) {
  if (host === "localhost" || host === "127.0.0.1") {
    return "DIRECT";
  }
  if (dnsDomainIs(host, ".internal.com")) {
    return "DIRECT";
  }
  if (shExpMatch(host, "*.example.com")) {
    return "PROXY proxy.example.com:8080";
  }
  return "PROXY default.proxy.com:3128";
}`;

  // Create tester
  const tester = new PACTester(script);
  
  // Set mock context
  tester.setContext({
    myIpAddress: '10.0.0.100',
    dnsResults: new Map([
      ['server.internal.com', '10.0.0.50'],
      ['www.example.com', '93.184.216.34']
    ])
  });
  
  // Test various URLs
  const testUrls = [
    { url: 'http://localhost/api', expected: 'DIRECT' },
    { url: 'https://app.internal.com/', expected: 'DIRECT' },
    { url: 'https://www.example.com/', expected: 'PROXY proxy.example.com:8080' },
    { url: 'https://www.google.com/', expected: 'PROXY default.proxy.com:3128' }
  ];
  
  const results = [];
  for (const test of testUrls) {
    const result = await tester.testURL(test.url, test.expected);
    results.push(result);
    console.log(`${result.passed ? '✓' : '✗'} ${test.url}`);
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Actual: ${result.actualResult}`);
  }
  
  // Generate test report
  const report = tester.generateTestReport(results);
  console.log('\nTest Report:\n', report);
}

/**
 * Example 5: PAC Editor with Autocomplete
 */
function usePACEditor() {
  console.log('\n=== PAC Editor Features ===\n');
  
  // Create editor
  const editor = new PACEditor({
    enableAutocomplete: true,
    enableSyntaxHighlight: true,
    enableRealtimeValidation: true,
    theme: 'dark',
    fontSize: 14
  });
  
  // Get autocomplete suggestions
  const code = 'function FindProxyForURL(url, host) {\n  if (is';
  const cursorPosition = code.length;
  
  const suggestions = editor.getAutocompleteSuggestions(code, cursorPosition);
  console.log('Autocomplete suggestions for "is":');
  suggestions.slice(0, 5).forEach(s => {
    console.log(`  ${s.label} - ${s.detail}`);
  });
  
  // Get all templates
  const templates = editor.getAllTemplates();
  console.log('\nAvailable templates:');
  templates.forEach(t => {
    console.log(`  ${t.name} (${t.category}): ${t.description}`);
  });
  
  // Apply a template
  const pacScript = editor.applyTemplate('corporate', {
    corpProxy: 'proxy.mycompany.com:8080',
    backupProxy: 'backup.mycompany.com:8080',
    internalDomain: '.mycompany.local'
  });
  console.log('\nGenerated from corporate template:');
  console.log(pacScript);
}

/**
 * Example 6: External PAC Script Support
 */
async function handleExternalPAC() {
  console.log('\n=== External PAC Script Support ===\n');
  
  const pacManager = new PACManager({
    enabled: true,
    url: 'http://proxy.company.com/proxy.pac',
    useUrl: true,
    updateInterval: 60 // Update every hour
  });
  
  try {
    // Fetch external PAC script
    const externalScript = await pacManager.fetchExternalScript('http://proxy.company.com/proxy.pac');
    console.log('Fetched external PAC script');
    
    // Validate the external script
    const validation = PACValidator.validate(externalScript);
    if (validation.isValid) {
      console.log('External script is valid');
      console.log('Detected functions:', validation.functions);
      console.log('Detected proxies:', validation.proxies);
    } else {
      console.log('External script validation failed:', validation.errors);
    }
  } catch (error) {
    console.log('Note: External PAC fetch will fail in this example (no actual URL)');
  }
}

/**
 * Run all examples
 */
export async function runPACExamples() {
  console.log('===================================');
  console.log('     PAC Script Examples');
  console.log('===================================\n');
  
  await basicPACManagement();
  validatePACScripts();
  generatePACFromRules();
  await testPACScripts();
  usePACEditor();
  await handleExternalPAC();
  
  console.log('\n===================================');
  console.log('     Examples Complete');
  console.log('===================================');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runPACExamples().catch(console.error);
}
