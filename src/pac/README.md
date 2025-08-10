# PAC Script Module

Last updated: 2025-08-10

A comprehensive TypeScript module for working with Proxy Auto-Configuration (PAC) scripts. This module provides functionality for parsing, validating, generating, testing, and editing PAC scripts.

## Features

### 1. **PAC Script Parser and Validator** (`PACValidator`)
- Comprehensive syntax validation
- Security issue detection (eval, Function constructor, etc.)
- Performance warning detection
- Compatibility checking for different PAC environments
- Function signature validation
- Brace balance checking
- Proxy string validation

### 2. **PAC Script Generator** (`PACGenerator`)
- Convert proxy rules to PAC scripts
- Support for multiple proxy types (HTTP, HTTPS, SOCKS4, SOCKS5)
- Script optimization (3 levels)
- Script minification
- DNS caching optimization
- Template-based generation
- Helper function generation

### 3. **PAC Script Editor** (`PACEditor`)
- Intelligent autocomplete suggestions
- PAC function documentation
- Code snippets
- Built-in templates (Basic, Corporate, Advanced)
- Template variable substitution
- Context-aware suggestions

### 4. **PAC Script Testing** (`PACTester`)
- Sandboxed script execution
- Mock DNS resolution
- Test suite management
- Batch testing support
- Test report generation
- Custom execution contexts
- Performance metrics

### 5. **External PAC Script Support** (`PACManager`)
- Fetch external PAC scripts
- URL-based PAC configuration
- Auto-update intervals
- Script caching
- Validation of external scripts

## Installation

```typescript
import {
  PACManager,
  PACValidator,
  PACGenerator,
  PACTester,
  PACEditor
} from './pac';
```

## Usage Examples

### Basic PAC Script Management

```typescript
// Create a PAC manager
const pacManager = new PACManager({
  enabled: true,
  script: '',
  useUrl: false
});

// Validate a PAC script
const script = `
function FindProxyForURL(url, host) {
  if (isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0")) {
    return "DIRECT";
  }
  return "PROXY proxy.example.com:8080";
}`;

const validation = pacManager.validateScript(script);
if (validation.isValid) {
  console.log('Script is valid!');
}
```

### Generate PAC from Rules

```typescript
// Create proxy profiles
const profiles: ProxyProfile[] = [
  {
    id: 'corp-proxy',
    name: 'Corporate Proxy',
    isActive: true,
    config: {
      host: 'proxy.company.com',
      port: 8080,
      type: ProxyType.HTTP
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Create rules
const rules: Rule[] = [
  {
    id: 'rule-1',
    name: 'Internal domains',
    type: RuleType.DOMAIN,
    pattern: '.internal.com',
    profileId: 'direct',
    priority: RulePriority.HIGH,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Generate PAC script
const generator = new PACGenerator(profiles);
const pacScript = generator.generate(rules, {
  includeComments: true,
  minify: false,
  defaultProxy: 'DIRECT',
  optimizationLevel: 2
});
```

### Test PAC Scripts

```typescript
const tester = new PACTester(script);

// Set mock context
tester.setContext({
  myIpAddress: '10.0.0.100',
  dnsResults: new Map([
    ['server.internal.com', '10.0.0.50'],
    ['www.example.com', '93.184.216.34']
  ])
});

// Test a URL
const result = await tester.testURL(
  'https://www.example.com/',
  'PROXY proxy.example.com:8080'
);

if (result.passed) {
  console.log('Test passed!');
}
```

### Use PAC Editor with Autocomplete

```typescript
const editor = new PACEditor({
  enableAutocomplete: true,
  theme: 'dark'
});

// Get autocomplete suggestions
const code = 'function FindProxyForURL(url, host) {\n  if (is';
const suggestions = editor.getAutocompleteSuggestions(code, code.length);

// Apply a template
const pacScript = editor.applyTemplate('corporate', {
  corpProxy: 'proxy.mycompany.com:8080',
  backupProxy: 'backup.mycompany.com:8080',
  internalDomain: '.mycompany.local'
});
```

## PAC Functions Reference

The module supports all standard PAC functions:

### Network Functions
- `isInNet(host, pattern, mask)` - Check if IP is in network range
- `dnsResolve(host)` - Resolve hostname to IP
- `myIpAddress()` - Get client IP address

### Domain Functions
- `dnsDomainIs(host, domain)` - Check if host is in domain
- `localHostOrDomainIs(host, hostdom)` - Check exact or unqualified match
- `isPlainHostName(host)` - Check if hostname has no dots
- `dnsDomainLevels(host)` - Count domain levels

### Pattern Matching
- `shExpMatch(str, pattern)` - Shell expression matching
- `isResolvable(host)` - Check if host can be resolved

### Date/Time Functions
- `weekdayRange(wd1, wd2?, gmt?)` - Check day of week
- `dateRange(...args)` - Check date range
- `timeRange(...args)` - Check time range

## Templates

### Basic Template
Simple PAC script with local network detection.

### Corporate Template
PAC script for corporate environments with multiple proxies and failover.

### Advanced Template
PAC script with load balancing and complex routing logic.

## Validation Features

### Security Checks
- Detects dangerous functions (eval, Function constructor)
- Identifies potential XSS vulnerabilities
- Checks for prototype pollution attempts

### Performance Warnings
- DNS resolution in loops
- Excessive DNS lookups
- Complex regular expressions
- Inefficient patterns

### Compatibility Checks
- ES6+ syntax detection
- Browser compatibility warnings
- PAC environment compatibility

## Testing Features

### Test Suites
Create and manage test suites with multiple test cases:

```typescript
const suite: PACTestSuite = {
  id: 'integration-tests',
  name: 'Integration Tests',
  testCases: [
    {
      id: 'test-1',
      name: 'Local network test',
      url: 'http://192.168.1.100/',
      host: '192.168.1.100',
      expectedResult: 'DIRECT'
    }
  ],
  createdAt: new Date()
};

const results = await tester.runTestSuite(suite);
const report = tester.generateTestReport(results);
```

### Mock Context
Set up mock DNS resolution and client configuration:

```typescript
tester.setContext({
  dnsResults: new Map([
    ['localhost', '127.0.0.1'],
    ['server.local', '192.168.1.100']
  ]),
  myIpAddress: '10.0.0.100',
  currentTime: new Date('2025-08-10T10:00:00Z')
});
```

## Best Practices

1. **Always validate PAC scripts** before deployment
2. **Test with representative URLs** from your environment
3. **Use optimization** for better performance
4. **Implement caching** for DNS lookups
5. **Avoid complex logic** in PAC scripts
6. **Use templates** as starting points
7. **Monitor performance** of PAC scripts
8. **Keep scripts simple** and maintainable

## License

MIT
