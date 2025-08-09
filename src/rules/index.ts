/**
 * Rules Engine Module
 * Main entry point for the rules engine functionality
 */

// Export types
export * from './types';

// Export main classes
export { RuleEngine } from './RuleEngine';
export { RuleTester } from './RuleTester';

// Export default rule sets
export {
  localDevelopmentRuleSet,
  corporateRuleSet,
  streamingRuleSet,
  socialMediaRuleSet,
  privacyRuleSet,
  getAllDefaultRuleSets,
  getDefaultRuleSetById,
  getDefaultRuleSetsByCategory,
  createCustomRuleSet,
  commonBypassDomains
} from './defaultRuleSets';

// Re-export specific types for convenience
export type {
  TestScenario,
  BatchTestResult,
  TestScenarioResult,
  PatternExample
} from './RuleTester';

// Import types needed for functions
import { RuleEngineConfig, Rule, RuleType, RulePriority, RuleCategory, RuleCondition } from './types';
import { RuleEngine } from './RuleEngine';
import { RuleTester } from './RuleTester';
import { getDefaultRuleSetsByCategory, getAllDefaultRuleSets } from './defaultRuleSets';

/**
 * Create a pre-configured rule engine with default settings
 */
export function createRuleEngine(config?: Partial<RuleEngineConfig>): RuleEngine {
  return new RuleEngine({
    enableCache: true,
    cacheTTL: 60000,
    maxRules: 1000,
    enableStats: true,
    debug: false,
    ...config
  });
}

/**
 * Create a rule tester with a new engine
 */
export function createRuleTester(engine?: RuleEngine): RuleTester {
  return new RuleTester(engine || createRuleEngine());
}

/**
 * Quick test function for pattern matching
 */
export function quickTestPattern(
  type: RuleType,
  pattern: string,
  url: string
): boolean {
  const engine = createRuleEngine({ enableCache: false });
  const rule: Rule = {
    id: 'test-rule',
    name: 'Test Rule',
    type,
    pattern,
    profileId: 'test',
    priority: RulePriority.NORMAL,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  engine.addRule(rule);
  const result = engine.testURL(url);
  return result.winningRule?.id === 'test-rule';
}

/**
 * Load default rule sets into an engine
 */
export function loadDefaultRuleSets(
  engine: RuleEngine,
  categories?: RuleCategory[]
): void {
  const ruleSets = categories 
    ? categories.flatMap(cat => getDefaultRuleSetsByCategory(cat))
    : getAllDefaultRuleSets();

  for (const ruleSet of ruleSets) {
    if (ruleSet.enabled) {
      for (const rule of ruleSet.rules) {
        if (rule.enabled) {
          engine.addRule(rule);
        }
      }
    }
  }
}

/**
 * Convert a simple domain list to wildcard rules
 */
export function domainsToRules(
  domains: string[],
  profileId: string,
  priority: RulePriority = RulePriority.NORMAL
): Rule[] {
  return domains.map((domain, index) => ({
    id: `domain-rule-${index}`,
    name: `Rule for ${domain}`,
    type: domain.includes('*') ? RuleType.WILDCARD : RuleType.DOMAIN,
    pattern: domain,
    profileId,
    priority,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
}

/**
 * Helper to create a rule from common parameters
 */
export function createRule(
  name: string,
  pattern: string,
  profileId: string,
  options?: {
    type?: RuleType;
    priority?: RulePriority;
    description?: string;
    tags?: string[];
    conditions?: RuleCondition[];
  }
): Rule {
  // Auto-detect type if not provided
  let type = options?.type;
  if (!type) {
    if (pattern.includes('*')) {
      type = RuleType.WILDCARD;
    } else if (pattern.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
      type = RuleType.IP_RANGE;
    } else if (pattern.startsWith('^') || pattern.includes('.*')) {
      type = RuleType.REGEX;
    } else {
      type = RuleType.DOMAIN;
    }
  }

  return {
    id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description: options?.description,
    type: type || RuleType.DOMAIN, // Provide default to ensure non-undefined
    pattern,
    profileId,
    priority: options?.priority || RulePriority.NORMAL,
    enabled: true,
    tags: options?.tags,
    conditions: options?.conditions,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}
