/**
 * Example usage of the proxy management module
 */

import {
  ProxyManager,
  getProxyManager,
  ProxyType,
  ProxyEvent,
  ProxyProfile,
  ProxyConfig,
  validateProxyConfig,
  getDefaultBypassList
} from '../core';

async function exampleUsage() {
  // Get the proxy manager instance
  const proxyManager = getProxyManager();

  // Initialize the manager
  await proxyManager.initialize();

  // Subscribe to events
  proxyManager.on(ProxyEvent.PROFILE_CREATED, (profile: ProxyProfile) => {
    console.log('Profile created:', profile.name);
  });

  proxyManager.on(ProxyEvent.PROFILE_ACTIVATED, (profile: ProxyProfile) => {
    console.log('Profile activated:', profile.name);
  });

  proxyManager.on(ProxyEvent.CONNECTION_TESTED, (result) => {
    console.log('Connection test result:', result);
  });

  // Example 1: Create a simple HTTP proxy profile
  const httpProfile = await proxyManager.createProfile(
    'Work Proxy',
    {
      type: ProxyType.HTTP,
      host: 'proxy.company.com',
      port: 8080,
      bypassList: getDefaultBypassList()
    },
    {
      description: 'Company HTTP proxy',
      color: '#4CAF50',
      tags: ['work', 'http']
    }
  );
  console.log('Created HTTP profile:', httpProfile);

  // Example 2: Create a SOCKS5 proxy with authentication
  const socks5Profile = await proxyManager.createProfile(
    'VPN Proxy',
    {
      type: ProxyType.SOCKS5,
      host: 'vpn.example.com',
      port: 1080,
      auth: {
        username: 'user123',
        password: 'secure_password'
      },
      bypassList: ['*.local', '192.168.*', '10.0.0.0/8']
    },
    {
      description: 'SOCKS5 proxy for VPN connection',
      color: '#2196F3',
      tags: ['vpn', 'socks5', 'secure']
    }
  );
  console.log('Created SOCKS5 profile:', socks5Profile);

  // Example 3: Create a direct connection profile
  const directProfile = await proxyManager.createProfile(
    'Direct Connection',
    {
      type: ProxyType.DIRECT,
      host: '',
      port: 0
    },
    {
      description: 'Bypass all proxies',
      color: '#FF9800',
      isDefault: true
    }
  );

  // Example 4: Validate a proxy configuration before creating
  const testConfig: Partial<ProxyConfig> = {
    type: ProxyType.HTTPS,
    host: 'secure-proxy.example.com',
    port: 443
  };

  const validation = validateProxyConfig(testConfig);
  if (validation.isValid) {
    console.log('Configuration is valid');
  } else {
    console.log('Configuration errors:', validation.errors);
  }

  // Example 5: Get all profiles
  const allProfiles = proxyManager.getAllProfiles();
  console.log('Total profiles:', allProfiles.length);
  allProfiles.forEach(profile => {
    console.log(`- ${profile.name} (${profile.config.type})`);
  });

  // Example 6: Activate a profile
  await proxyManager.activateProfile(httpProfile.id);
  console.log('Activated profile:', httpProfile.name);

  // Example 7: Test proxy connection
  const testResult = await proxyManager.testProxy(httpProfile.id);
  console.log('Proxy test result:', {
    success: testResult.success,
    latency: testResult.latency,
    error: testResult.error
  });

  // Example 8: Update a profile
  const updatedProfile = await proxyManager.updateProfile(httpProfile.id, {
    name: 'Updated Work Proxy',
    config: {
      ...httpProfile.config,
      port: 8888
    }
  });
  console.log('Updated profile:', updatedProfile);

  // Example 9: Export profiles for backup
  const exportedProfiles = proxyManager.exportProfiles();
  const exportJson = JSON.stringify(exportedProfiles, null, 2);
  console.log('Exported profiles:', exportJson);

  // Example 10: Deactivate current proxy
  await proxyManager.deactivateProfile();
  console.log('Proxy deactivated');

  // Example 11: Get proxy templates
  const templates = ProxyManager.getProxyTemplates();
  console.log('Available templates:');
  templates.forEach(template => {
    console.log(`- ${template.name}: ${template.config.type}`);
  });

  // Example 12: Delete a profile
  await proxyManager.deleteProfile(directProfile.id);
  console.log('Deleted profile:', directProfile.name);
}

// Advanced usage examples
async function advancedExamples() {
  const proxyManager = new ProxyManager();
  await proxyManager.initialize();

  // Example: Batch import profiles
  const profilesToImport: ProxyProfile[] = [
    {
      id: 'temp_1',
      name: 'Import Test 1',
      isActive: false,
      config: {
        type: ProxyType.HTTP,
        host: 'proxy1.example.com',
        port: 8080
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'temp_2',
      name: 'Import Test 2',
      isActive: false,
      config: {
        type: ProxyType.SOCKS5,
        host: 'proxy2.example.com',
        port: 1080
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  await proxyManager.importProfiles(profilesToImport);
  console.log('Imported profiles successfully');

  // Example: Complex event handling
  const eventHandler = (profile: ProxyProfile) => {
    console.log(`Event fired for profile: ${profile.name}`);
    // Perform additional actions like updating UI, sending notifications, etc.
  };

  proxyManager.on(ProxyEvent.PROFILE_UPDATED, eventHandler);

  // Later, unsubscribe from the event
  proxyManager.off(ProxyEvent.PROFILE_UPDATED, eventHandler);

  // Example: Profile search/filter
  const profiles = proxyManager.getAllProfiles();
  
  // Filter by type
  const httpProfiles = profiles.filter(p => p.config.type === ProxyType.HTTP);
  console.log('HTTP profiles:', httpProfiles.length);

  // Filter by tags
  const workProfiles = profiles.filter(p => p.tags?.includes('work'));
  console.log('Work profiles:', workProfiles.length);

  // Find default profile
  const defaultProfile = profiles.find(p => p.isDefault);
  console.log('Default profile:', defaultProfile?.name);
}

// Run examples (uncomment to test)
// exampleUsage().catch(console.error);
// advancedExamples().catch(console.error);

export { exampleUsage, advancedExamples };
