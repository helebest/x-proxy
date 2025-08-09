/**
 * Rules Engine Usage Example
 * Demonstrates how to use the rules engine for automatic proxy switching
 */

import {
  createRuleEngine,
  createRuleTester,
  createRule,
  loadDefaultRuleSets,
  quickTestPattern,
  RuleType,
  RulePriority,
  RuleCategory
} from './index';

// Example 1: Basic rule engine setup
function basicExample() {
  console.log('=== Basic Rule Engine Example ===\n');

  // Create a new rule engine
  const engine = createRuleEngine({
    debug: true,
    enableStats: true
  });

  // Add some simple rules
  engine.addRule(createRule(
    'GitHub',
    '*.github.com',
    'work-proxy',
    { 
      type: RuleType.WILDCARD,
      priority: RulePriority.HIGH,
      description: 'Route GitHub through work proxy'
    }
  ));

  engine.addRule(createRule(
    'Local Development',
    'localhost',
    'direct',
    {
      type: RuleType.DOMAIN,
      priority: RulePriority.CRITICAL,
      description: 'Direct connection for localhost'
    }
  ));

  engine.addRule(createRule(
    'Corporate VPN',
    '10.0.0.0/8',
    'corporate-proxy',
    {
      type: RuleType.IP_RANGE,
      priority: RulePriority.HIGH,
      description: 'Corporate network range'
    }
  ));

  // Test some URLs
  const testUrls = [
    'https://github.com/user/repo',
    'http://localhost:3000',
    'http://10.0.1.50:8080/api',
    'https://google.com'
  ];

  for (const url of testUrls) {
    const result = engine.testURL(url);
    console.log(`URL: ${url}`);
    console.log(`  Matched: ${result.winningRule ? 'Yes' : 'No'}`);
    if (result.winningRule) {
      console.log(`  Rule: ${result.winningRule.name}`);
      console.log(`  Profile: ${result.recommendedProfileId}`);
    }
    console.log();
  }
}

// Example 2: Using default rule sets
function defaultRuleSetsExample() {
  console.log('=== Default Rule Sets Example ===\n');

  const engine = createRuleEngine();

  // Load only development and corporate rule sets
  loadDefaultRuleSets(engine, [
    RuleCategory.DEVELOPMENT,
    RuleCategory.CORPORATE
  ]);

  // Test development URLs
  const devUrls = [
    'http://localhost:3000',
    'http://192.168.1.100:8080',
    'http://myapp.local',
    'http://172.17.0.2:5000' // Docker
  ];

  console.log('Development URLs:');
  for (const url of devUrls) {
    const result = engine.testURL(url);
    console.log(`  ${url} -> ${result.recommendedProfileId || 'no match'}`);
  }
}

// Example 3: Pattern testing and validation
function patternTestingExample() {
  console.log('\n=== Pattern Testing Example ===\n');

  const tester = createRuleTester();

  // Validate patterns
  const patterns = [
    { type: RuleType.DOMAIN, pattern: 'example.com' },
    { type: RuleType.WILDCARD, pattern: '*.example.com' },
    { type: RuleType.REGEX, pattern: '^https://.*\\.example\\.com/api' },
    { type: RuleType.IP_RANGE, pattern: '192.168.0.0/24' },
    { type: RuleType.REGEX, pattern: '[invalid regex' } // Invalid
  ];

  for (const { type, pattern } of patterns) {
    const validation = tester.validatePattern(type, pattern);
    console.log(`Pattern: ${pattern} (${type})`);
    console.log(`  Valid: ${validation.isValid}`);
    if (!validation.isValid) {
      console.log(`  Errors: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings) {
      console.log(`  Warnings: ${validation.warnings.join(', ')}`);
    }
    console.log();
  }
}

// Example 4: Batch testing with scenarios
function batchTestingExample() {
  console.log('=== Batch Testing Example ===\n');

  const engine = createRuleEngine();
  const tester = createRuleTester(engine);

  // Add test rules
  engine.addRule(createRule(
    'Streaming Services',
    '*.netflix.com',
    'streaming-proxy',
    { type: RuleType.WILDCARD }
  ));

  engine.addRule(createRule(
    'Social Media',
    '*.facebook.com',
    'social-proxy',
    { type: RuleType.WILDCARD }
  ));

  // Define test scenarios
  const scenarios = [
    {
      name: 'Netflix should use streaming proxy',
      url: 'https://www.netflix.com/browse',
      expectedProfileId: 'streaming-proxy',
      shouldMatch: true
    },
    {
      name: 'Facebook should use social proxy',
      url: 'https://www.facebook.com',
      expectedProfileId: 'social-proxy',
      shouldMatch: true
    },
    {
      name: 'Google should not match',
      url: 'https://www.google.com',
      shouldMatch: false
    }
  ];

  // Run batch tests
  const results = tester.runBatchTests(scenarios);

  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log();

  // Show failed tests
  if (results.failed > 0) {
    console.log('Failed Tests:');
    for (const result of results.results) {
      if (!result.passed) {
        console.log(`  - ${result.scenario.name}`);
        console.log(`    Reason: ${result.failureReason}`);
      }
    }
  }
}

// Example 5: Time-based rules
function timeBasedRulesExample() {
  console.log('\n=== Time-Based Rules Example ===\n');

  const engine = createRuleEngine();

  // Add a rule that only applies during work hours
  const workHoursRule = createRule(
    'Work Hours Proxy',
    '*',
    'work-proxy',
    {
      type: RuleType.WILDCARD,
      priority: RulePriority.LOW,
      description: 'Use work proxy during business hours',
      conditions: [
        {
          type: 'time_range',
          params: { start: '09:00', end: '17:00' },
          required: true
        },
        {
          type: 'day_of_week',
          params: { days: [1, 2, 3, 4, 5] }, // Monday to Friday
          required: true
        }
      ]
    }
  );

  engine.addRule(workHoursRule);

  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const isWorkTime = hour >= 9 && hour < 17 && day >= 1 && day <= 5;

  console.log(`Current time: ${now.toLocaleString()}`);
  console.log(`Is work time: ${isWorkTime}`);
  console.log();

  const result = engine.testURL('https://example.com');
  console.log('Testing https://example.com');
  console.log(`  Matched: ${result.winningRule ? 'Yes' : 'No'}`);
  if (result.winningRule) {
    console.log(`  Profile: ${result.recommendedProfileId}`);
  }
}

// Example 6: Quick pattern testing
function quickTestExample() {
  console.log('\n=== Quick Pattern Test Example ===\n');

  const tests = [
    {
      type: RuleType.WILDCARD,
      pattern: '*.google.com',
      url: 'https://mail.google.com',
      expected: true
    },
    {
      type: RuleType.DOMAIN,
      pattern: 'google.com',
      url: 'https://google.com',
      expected: true
    },
    {
      type: RuleType.IP_RANGE,
      pattern: '192.168.0.0/16',
      url: 'http://192.168.1.100',
      expected: true
    },
    {
      type: RuleType.REGEX,
      pattern: '.*\\.pdf$',
      url: 'https://example.com/document.pdf',
      expected: true
    }
  ];

  for (const test of tests) {
    const matches = quickTestPattern(test.type, test.pattern, test.url);
    const status = matches === test.expected ? '✓' : '✗';
    console.log(`${status} ${test.pattern} vs ${test.url}: ${matches}`);
  }
}

// Example 7: Rule statistics
function statisticsExample() {
  console.log('\n=== Rule Statistics Example ===\n');

  const engine = createRuleEngine({ enableStats: true });

  // Add rules
  const githubRule = createRule('GitHub', '*.github.com', 'dev-proxy');
  const googleRule = createRule('Google', '*.google.com', 'general-proxy');
  
  engine.addRule(githubRule);
  engine.addRule(googleRule);

  // Simulate traffic
  const urls = [
    'https://github.com/user/repo',
    'https://api.github.com/users',
    'https://google.com',
    'https://github.com/trending',
    'https://mail.google.com',
    'https://github.com'
  ];

  for (const url of urls) {
    engine.testURL(url);
  }

  // Get statistics
  const stats = engine.getRuleStats();
  
  console.log('Rule Statistics:');
  for (const [ruleId, stat] of stats) {
    const rule = engine.getRules().find(r => r.id === ruleId);
    console.log(`  ${rule?.name}:`);
    console.log(`    Match count: ${stat.matchCount}`);
    console.log(`    Avg match time: ${stat.avgMatchTime?.toFixed(2)}ms`);
    console.log(`    Last matched: ${stat.lastMatched?.toLocaleString()}`);
  }
}

// Run all examples
export function runAllExamples() {
  basicExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  defaultRuleSetsExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  patternTestingExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  batchTestingExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  timeBasedRulesExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  quickTestExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  statisticsExample();
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}
