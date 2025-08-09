/**
 * Default Rule Sets
 * Pre-configured rule sets for common proxy scenarios
 */

import {
  RuleSet,
  Rule,
  RuleType,
  RulePriority,
  RuleCategory
} from './types';

/**
 * Generate a unique rule ID
 */
const generateRuleId = (setId: string, index: number): string => {
  return `${setId}-rule-${index}`;
};

/**
 * Local Development Rule Set
 * Rules for local development environments
 */
export const localDevelopmentRuleSet: RuleSet = {
  id: 'local-development',
  name: 'Local Development',
  description: 'Rules for local development servers and tools',
  category: RuleCategory.DEVELOPMENT,
  enabled: true,
  isSystem: true,
  version: '1.0.0',
  rules: [
    {
      id: generateRuleId('local-development', 1),
      name: 'Localhost',
      description: 'Direct connection for localhost',
      type: RuleType.DOMAIN,
      pattern: 'localhost',
      profileId: 'direct',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['localhost', 'development']
    },
    {
      id: generateRuleId('local-development', 2),
      name: 'Local IP Range',
      description: 'Direct connection for local network',
      type: RuleType.IP_RANGE,
      pattern: '192.168.0.0/16',
      profileId: 'direct',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['local-network', 'development']
    },
    {
      id: generateRuleId('local-development', 3),
      name: 'Docker Internal',
      description: 'Direct connection for Docker internal network',
      type: RuleType.IP_RANGE,
      pattern: '172.17.0.0/16',
      profileId: 'direct',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['docker', 'development']
    },
    {
      id: generateRuleId('local-development', 4),
      name: 'Local Development Domains',
      description: 'Common local development domains',
      type: RuleType.WILDCARD,
      pattern: '*.local',
      profileId: 'direct',
      priority: RulePriority.NORMAL,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['local', 'development']
    },
    {
      id: generateRuleId('local-development', 5),
      name: 'Development Ports',
      description: 'Common development server ports',
      type: RuleType.REGEX,
      pattern: '^https?://[^/:]+(:(3000|3001|4200|5000|5173|8000|8080|8081|8888|9000))',
      profileId: 'direct',
      priority: RulePriority.NORMAL,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['ports', 'development']
    }
  ]
};

/**
 * Corporate/Work Rule Set
 * Rules for corporate environments
 */
export const corporateRuleSet: RuleSet = {
  id: 'corporate',
  name: 'Corporate Network',
  description: 'Rules for corporate and work environments',
  category: RuleCategory.CORPORATE,
  enabled: false,
  isSystem: true,
  version: '1.0.0',
  rules: [
    {
      id: generateRuleId('corporate', 1),
      name: 'Internal Corporate Sites',
      description: 'Use corporate proxy for internal sites',
      type: RuleType.WILDCARD,
      pattern: '*.internal.company.com',
      profileId: 'corporate-proxy',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['corporate', 'internal']
    },
    {
      id: generateRuleId('corporate', 2),
      name: 'Corporate VPN Range',
      description: 'Corporate VPN IP range',
      type: RuleType.IP_RANGE,
      pattern: '10.0.0.0/8',
      profileId: 'corporate-proxy',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['corporate', 'vpn']
    },
    {
      id: generateRuleId('corporate', 3),
      name: 'Office 365',
      description: 'Microsoft Office 365 services',
      type: RuleType.WILDCARD,
      pattern: '*.office365.com',
      profileId: 'corporate-proxy',
      priority: RulePriority.NORMAL,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['corporate', 'office365']
    },
    {
      id: generateRuleId('corporate', 4),
      name: 'Slack Workspace',
      description: 'Slack corporate workspace',
      type: RuleType.WILDCARD,
      pattern: '*.slack.com',
      profileId: 'corporate-proxy',
      priority: RulePriority.NORMAL,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['corporate', 'slack']
    },
    {
      id: generateRuleId('corporate', 5),
      name: 'Work Hours Only',
      description: 'Use corporate proxy during work hours',
      type: RuleType.WILDCARD,
      pattern: '*',
      profileId: 'corporate-proxy',
      priority: RulePriority.LOW,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['corporate', 'time-based'],
      conditions: [
        {
          type: 'time_range',
          params: { start: '09:00', end: '18:00' },
          required: true
        },
        {
          type: 'day_of_week',
          params: { days: [1, 2, 3, 4, 5] }, // Monday to Friday
          required: true
        }
      ]
    }
  ]
};

/**
 * Streaming Services Rule Set
 * Rules for streaming platforms
 */
export const streamingRuleSet: RuleSet = {
  id: 'streaming',
  name: 'Streaming Services',
  description: 'Rules for video and music streaming services',
  category: RuleCategory.STREAMING,
  enabled: false,
  isSystem: true,
  version: '1.0.0',
  rules: [
    {
      id: generateRuleId('streaming', 1),
      name: 'Netflix',
      description: 'Netflix streaming service',
      type: RuleType.WILDCARD,
      pattern: '*.netflix.com',
      profileId: 'streaming-proxy',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['streaming', 'netflix']
    },
    {
      id: generateRuleId('streaming', 2),
      name: 'YouTube',
      description: 'YouTube and YouTube TV',
      type: RuleType.WILDCARD,
      pattern: '*.youtube.com',
      profileId: 'streaming-proxy',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['streaming', 'youtube']
    },
    {
      id: generateRuleId('streaming', 3),
      name: 'Spotify',
      description: 'Spotify music streaming',
      type: RuleType.WILDCARD,
      pattern: '*.spotify.com',
      profileId: 'streaming-proxy',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['streaming', 'spotify', 'music']
    },
    {
      id: generateRuleId('streaming', 4),
      name: 'Disney Plus',
      description: 'Disney+ streaming service',
      type: RuleType.WILDCARD,
      pattern: '*.disneyplus.com',
      profileId: 'streaming-proxy',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['streaming', 'disney']
    },
    {
      id: generateRuleId('streaming', 5),
      name: 'Amazon Prime Video',
      description: 'Amazon Prime Video streaming',
      type: RuleType.WILDCARD,
      pattern: '*.primevideo.com',
      profileId: 'streaming-proxy',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['streaming', 'amazon', 'prime']
    },
    {
      id: generateRuleId('streaming', 6),
      name: 'Hulu',
      description: 'Hulu streaming service',
      type: RuleType.WILDCARD,
      pattern: '*.hulu.com',
      profileId: 'streaming-proxy',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['streaming', 'hulu']
    },
    {
      id: generateRuleId('streaming', 7),
      name: 'HBO Max',
      description: 'HBO Max streaming service',
      type: RuleType.WILDCARD,
      pattern: '*.hbomax.com',
      profileId: 'streaming-proxy',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['streaming', 'hbo']
    },
    {
      id: generateRuleId('streaming', 8),
      name: 'Twitch',
      description: 'Twitch live streaming',
      type: RuleType.WILDCARD,
      pattern: '*.twitch.tv',
      profileId: 'streaming-proxy',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['streaming', 'twitch', 'gaming']
    }
  ]
};

/**
 * Social Media Rule Set
 * Rules for social media platforms
 */
export const socialMediaRuleSet: RuleSet = {
  id: 'social-media',
  name: 'Social Media',
  description: 'Rules for social media platforms',
  category: RuleCategory.SOCIAL_MEDIA,
  enabled: false,
  isSystem: true,
  version: '1.0.0',
  rules: [
    {
      id: generateRuleId('social-media', 1),
      name: 'Facebook',
      description: 'Facebook and Messenger',
      type: RuleType.WILDCARD,
      pattern: '*.facebook.com',
      profileId: 'social-proxy',
      priority: RulePriority.NORMAL,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['social', 'facebook']
    },
    {
      id: generateRuleId('social-media', 2),
      name: 'Twitter/X',
      description: 'Twitter/X platform',
      type: RuleType.WILDCARD,
      pattern: '*.twitter.com',
      profileId: 'social-proxy',
      priority: RulePriority.NORMAL,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['social', 'twitter']
    },
    {
      id: generateRuleId('social-media', 3),
      name: 'Instagram',
      description: 'Instagram',
      type: RuleType.WILDCARD,
      pattern: '*.instagram.com',
      profileId: 'social-proxy',
      priority: RulePriority.NORMAL,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['social', 'instagram']
    },
    {
      id: generateRuleId('social-media', 4),
      name: 'LinkedIn',
      description: 'LinkedIn professional network',
      type: RuleType.WILDCARD,
      pattern: '*.linkedin.com',
      profileId: 'social-proxy',
      priority: RulePriority.NORMAL,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['social', 'linkedin', 'professional']
    },
    {
      id: generateRuleId('social-media', 5),
      name: 'Reddit',
      description: 'Reddit',
      type: RuleType.WILDCARD,
      pattern: '*.reddit.com',
      profileId: 'social-proxy',
      priority: RulePriority.NORMAL,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['social', 'reddit']
    },
    {
      id: generateRuleId('social-media', 6),
      name: 'TikTok',
      description: 'TikTok',
      type: RuleType.WILDCARD,
      pattern: '*.tiktok.com',
      profileId: 'social-proxy',
      priority: RulePriority.NORMAL,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['social', 'tiktok']
    }
  ]
};

/**
 * Privacy & Security Rule Set
 * Rules for enhanced privacy and security
 */
export const privacyRuleSet: RuleSet = {
  id: 'privacy-security',
  name: 'Privacy & Security',
  description: 'Rules for enhanced privacy and security',
  category: RuleCategory.PRIVACY,
  enabled: false,
  isSystem: true,
  version: '1.0.0',
  rules: [
    {
      id: generateRuleId('privacy-security', 1),
      name: 'Banking Sites',
      description: 'Direct connection for banking sites',
      type: RuleType.REGEX,
      pattern: '^https://[^/]*(bank|banking|chase|wellsfargo|bofa|citi|capital)',
      profileId: 'direct',
      priority: RulePriority.CRITICAL,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['banking', 'security']
    },
    {
      id: generateRuleId('privacy-security', 2),
      name: 'Government Sites',
      description: 'Direct connection for government sites',
      type: RuleType.WILDCARD,
      pattern: '*.gov',
      profileId: 'direct',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['government', 'security']
    },
    {
      id: generateRuleId('privacy-security', 3),
      name: 'Tracking Domains',
      description: 'Block common tracking domains',
      type: RuleType.WILDCARD,
      pattern: '*.doubleclick.net',
      profileId: 'privacy-proxy',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['tracking', 'privacy']
    },
    {
      id: generateRuleId('privacy-security', 4),
      name: 'Google Analytics',
      description: 'Route analytics through privacy proxy',
      type: RuleType.WILDCARD,
      pattern: '*.google-analytics.com',
      profileId: 'privacy-proxy',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['analytics', 'privacy']
    },
    {
      id: generateRuleId('privacy-security', 5),
      name: 'Facebook Tracking',
      description: 'Block Facebook tracking',
      type: RuleType.WILDCARD,
      pattern: '*.facebook.com/tr',
      profileId: 'privacy-proxy',
      priority: RulePriority.HIGH,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['facebook', 'tracking', 'privacy']
    },
    {
      id: generateRuleId('privacy-security', 6),
      name: 'HTTPS Only',
      description: 'Force HTTPS connections through secure proxy',
      type: RuleType.SCHEME,
      pattern: 'http',
      profileId: 'secure-proxy',
      priority: RulePriority.LOW,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['https', 'security']
    }
  ]
};

/**
 * Get all default rule sets
 */
export function getAllDefaultRuleSets(): RuleSet[] {
  return [
    localDevelopmentRuleSet,
    corporateRuleSet,
    streamingRuleSet,
    socialMediaRuleSet,
    privacyRuleSet
  ];
}

/**
 * Get default rule set by ID
 */
export function getDefaultRuleSetById(id: string): RuleSet | undefined {
  return getAllDefaultRuleSets().find(set => set.id === id);
}

/**
 * Get default rule sets by category
 */
export function getDefaultRuleSetsByCategory(category: RuleCategory): RuleSet[] {
  return getAllDefaultRuleSets().filter(set => set.category === category);
}

/**
 * Create a custom rule set from template
 */
export function createCustomRuleSet(
  name: string,
  description: string,
  baseRuleSet?: RuleSet
): RuleSet {
  const id = `custom-${Date.now()}`;
  const now = new Date();

  if (baseRuleSet) {
    // Clone and customize the base rule set
    return {
      ...baseRuleSet,
      id,
      name,
      description,
      category: RuleCategory.CUSTOM,
      isSystem: false,
      enabled: false,
      rules: baseRuleSet.rules.map((rule, index) => ({
        ...rule,
        id: generateRuleId(id, index + 1),
        createdAt: now,
        updatedAt: now
      }))
    };
  }

  // Create empty custom rule set
  return {
    id,
    name,
    description,
    category: RuleCategory.CUSTOM,
    enabled: false,
    isSystem: false,
    version: '1.0.0',
    rules: []
  };
}

/**
 * Common bypass domains that should always use direct connection
 */
export const commonBypassDomains: string[] = [
  'localhost',
  '127.0.0.1',
  '::1',
  '*.local',
  '169.254.*',
  '10.*',
  '172.16.*',
  '172.17.*',
  '172.18.*',
  '172.19.*',
  '172.20.*',
  '172.21.*',
  '172.22.*',
  '172.23.*',
  '172.24.*',
  '172.25.*',
  '172.26.*',
  '172.27.*',
  '172.28.*',
  '172.29.*',
  '172.30.*',
  '172.31.*',
  '192.168.*'
];
