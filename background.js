// X-Proxy Background Service Worker
// Background script for proxy management with lifecycle management

console.log('X-Proxy background service worker loaded');

// Service worker state management
let activeProfile = null;
let isInitialized = false;
let keepAliveTimeout = null;

/**
 * Generate PAC (Proxy Auto-Configuration) script for domain-based routing
 * @param {Object} profile - Proxy profile configuration
 * @returns {string} PAC script content
 */
function generatePAC(profile) {
  const { type, host, port } = profile.config;
  const { domains, mode } = profile.config.routingRules;

  // Default to whitelist mode for backward compatibility
  const routingMode = mode || 'whitelist';

  // Determine proxy server string based on type
  const proxyServer = type === 'socks5'
    ? `SOCKS5 ${host}:${port}`
    : `PROXY ${host}:${port}`;

  if (routingMode === 'whitelist') {
    // Whitelist mode: only listed domains use proxy, all others go direct
    return `
function FindProxyForURL(url, host) {
  // Whitelist domains - only these use proxy
  var whitelist = ${JSON.stringify(domains)};

  // Check if host matches any whitelist pattern
  for (var i = 0; i < whitelist.length; i++) {
    if (shExpMatch(host, whitelist[i])) {
      return "${proxyServer}";
    }
  }

  // All other traffic goes direct
  return "DIRECT";
}`.trim();
  } else {
    // Blacklist mode: listed domains bypass proxy, all others use proxy
    return `
function FindProxyForURL(url, host) {
  // Blacklist domains - these bypass proxy (go direct)
  var blacklist = ${JSON.stringify(domains)};

  // Check if host matches any blacklist pattern
  for (var i = 0; i < blacklist.length; i++) {
    if (shExpMatch(host, blacklist[i])) {
      return "DIRECT";
    }
  }

  // All other traffic uses proxy
  return "${proxyServer}";
}`.trim();
  }
}

// Keep service worker alive during active operations
function keepAlive() {
  if (keepAliveTimeout) {
    clearTimeout(keepAliveTimeout);
  }
  keepAliveTimeout = setTimeout(() => {
    // Service worker can be terminated after inactivity
    keepAliveTimeout = null;
  }, 25000); // Chrome terminates service workers after 30s of inactivity
}

// Update extension icon based on proxy state
function updateIcon(isSystemProxy = true) {
  const iconState = isSystemProxy ? 'inactive' : 'active';
  
  chrome.action.setIcon({
    path: {
      "16": `icons/icon-${iconState}-16.png`,
      "32": `icons/icon-${iconState}-32.png`,
      "48": `icons/icon-${iconState}-48.png`,
      "128": `icons/icon-${iconState}-128.png`
    }
  }).catch(error => {
    console.error('Failed to update icon:', error);
  });
}

// Activate proxy profile
async function activateProxy(profileId) {
  keepAlive(); // Keep service worker alive during operation

  try {
    // Get profile data from storage
    const result = await chrome.storage.local.get(['x-proxy-data']);
    const data = result['x-proxy-data'] || {};
    const profile = data.profiles?.find(p => p.id === profileId);

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Normalize profile structure (support both old flat and new nested structure)
    const proxyType = profile.config?.type || profile.type || 'http';
    const proxyHost = profile.config?.host || profile.host;
    const proxyPort = profile.config?.port || profile.port;

    if (!proxyHost || !proxyPort) {
      throw new Error('Invalid proxy configuration: missing host or port');
    }

    // Clear any existing proxy configuration first
    await chrome.proxy.settings.clear({
      scope: 'regular'
    });

    // Small delay to ensure clear operation completes
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if routing rules are enabled
    const routingRules = profile.config?.routingRules;
    const useRouting = routingRules?.enabled && routingRules?.domains?.length > 0;

    let config;

    if (useRouting) {
      // Use PAC script mode for domain-based routing
      // Create normalized profile for PAC generation
      const normalizedProfile = {
        ...profile,
        config: {
          type: proxyType,
          host: proxyHost,
          port: parseInt(proxyPort),
          routingRules: routingRules
        }
      };
      const pacScript = generatePAC(normalizedProfile);
      config = {
        mode: "pac_script",
        pacScript: {
          data: pacScript
        }
      };
      console.log('Using PAC mode with routing rules for:', profile.name);
      console.log('PAC script:', pacScript);
    } else {
      // Use fixed_servers mode (all traffic through proxy)
      config = {
        mode: "fixed_servers",
        rules: {
          singleProxy: {
            scheme: proxyType,
            host: proxyHost,
            port: parseInt(proxyPort)
          }
        }
      };
      console.log('Using fixed_servers mode for:', profile.name);
      console.log('Proxy config:', { scheme: proxyType, host: proxyHost, port: proxyPort });
    }

    await chrome.proxy.settings.set({
      value: config,
      scope: 'regular'
    });

    // Update storage with active profile
    data.activeProfileId = profileId;
    await chrome.storage.local.set({ 'x-proxy-data': data });

    // Update internal state and icon
    activeProfile = profile;
    updateIcon(false); // Blue icon for active proxy

    console.log('Activated proxy:', profile.name);
    return { success: true };

  } catch (error) {
    console.error('Failed to activate proxy:', error);
    const errorMessage = error?.message || String(error) || 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// Deactivate proxy (use system proxy)
async function deactivateProxy() {
  keepAlive(); // Keep service worker alive during operation
  
  try {
    // Clear any existing proxy configuration first
    await chrome.proxy.settings.clear({
      scope: 'regular'
    });
    
    // Small delay to ensure clear operation completes
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Set Chrome to use system proxy
    await chrome.proxy.settings.set({
      value: { mode: "system" },
      scope: 'regular'
    });

    // Update storage to clear active profile
    const result = await chrome.storage.local.get(['x-proxy-data']);
    const data = result['x-proxy-data'] || {};
    data.activeProfileId = undefined;
    await chrome.storage.local.set({ 'x-proxy-data': data });
    
    // Update internal state and icon
    activeProfile = null;
    updateIcon(true); // Gray icon for system proxy
    
    console.log('Deactivated proxy, using system settings');
    return { success: true };
    
  } catch (error) {
    console.error('Failed to deactivate proxy:', error);
    
    // Try fallback approach - just clear the proxy settings
    try {
      await chrome.proxy.settings.clear({
        scope: 'regular'
      });
      
      // Update storage and state even if system mode failed
      const result = await chrome.storage.local.get(['x-proxy-data']);
      const data = result['x-proxy-data'] || {};
      data.activeProfileId = undefined;
      await chrome.storage.local.set({ 'x-proxy-data': data });
      
      activeProfile = null;
      updateIcon(true);
      
      console.log('Fallback: Cleared proxy settings');
      return { success: true };
      
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      const primaryError = error?.message || String(error) || 'Unknown primary error';
      const fallbackErrorMsg = fallbackError?.message || String(fallbackError) || 'Unknown fallback error';
      return { success: false, error: `Primary: ${primaryError}, Fallback: ${fallbackErrorMsg}` };
    }
  }
}

// Initialize proxy state from storage
async function initializeProxyState() {
  if (isInitialized) return; // Prevent multiple initializations
  
  keepAlive();
  console.log('Initializing proxy state...');
  
  try {
    const result = await chrome.storage.local.get(['x-proxy-data']);
    const data = result['x-proxy-data'] || {};
    
    // Check if there's an active profile
    if (data.activeProfileId && data.profiles) {
      const profile = data.profiles.find(p => p.id === data.activeProfileId);
      if (profile) {
        activeProfile = profile;
        updateIcon(false); // Blue icon for active proxy
        console.log('Restored active proxy:', profile.name);
        return;
      }
    }
    
    // No active profile, use system proxy
    activeProfile = null;
    updateIcon(true); // Gray icon for system proxy
    console.log('No active proxy, using system settings');
    
    isInitialized = true;
    console.log('Proxy state initialization completed');
    
  } catch (error) {
    console.error('Failed to initialize proxy state:', error);
    // Default to system proxy (gray) on error
    activeProfile = null;
    updateIcon(true);
    isInitialized = true; // Mark as initialized even on error
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('X-Proxy installed');
  initializeProxyState();
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('X-Proxy starting up');
  initializeProxyState();
});

// Handle messages from popup and options with improved error handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  keepAlive(); // Keep service worker alive during message processing
  
  // Wrap all operations in try-catch to prevent service worker crashes
  (async () => {
    try {
      // Ensure initialization is complete before processing requests
      if (!isInitialized && request.type !== 'GET_STATE') {
        console.log('Service worker not initialized, initializing now...');
        await initializeProxyState();
      }
      
      switch (request.type) {
        case 'ACTIVATE_PROFILE':
          if (!request.payload?.id) {
            sendResponse({ success: false, error: 'Profile ID is required' });
            return;
          }
          const activateResult = await activateProxy(request.payload.id);
          sendResponse(activateResult);
          break;
          
        case 'DEACTIVATE_PROFILE':
          const deactivateResult = await deactivateProxy();
          sendResponse(deactivateResult);
          break;

        case 'GET_STATE':
          // Ensure initialization before returning state
          if (!isInitialized) {
            await initializeProxyState();
          }
          sendResponse({
            success: true,
            activeProfile: activeProfile,
            isSystemProxy: !activeProfile
          });
          break;
          
        default:
          sendResponse({ success: true });
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
      const errorMessage = error?.message || String(error) || 'Unknown error';
      sendResponse({ success: false, error: errorMessage });
    }
  })();
  
  // Return true to indicate we will send response asynchronously
  return true;
});