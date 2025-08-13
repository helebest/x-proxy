// X-Proxy Background Service Worker
// Simple background script for proxy management

console.log('X-Proxy background service worker loaded');

// Simple proxy management
let activeProfile = null;

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
  try {
    // Get profile data from storage
    const result = await chrome.storage.local.get(['x-proxy-data']);
    const data = result['x-proxy-data'] || {};
    const profile = data.profiles?.find(p => p.id === profileId);
    
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Clear any existing proxy configuration first
    await chrome.proxy.settings.clear({
      scope: 'regular'
    });
    
    // Small delay to ensure clear operation completes
    await new Promise(resolve => setTimeout(resolve, 100));

    // Set Chrome proxy configuration
    const config = {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme: profile.config.type,
          host: profile.config.host,
          port: profile.config.port
        }
      }
    };

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
    return { success: false, error: error.message };
  }
}

// Deactivate proxy (use system proxy)
async function deactivateProxy() {
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
      return { success: false, error: `Primary: ${error.message}, Fallback: ${fallbackError.message}` };
    }
  }
}

// Initialize proxy state from storage
async function initializeProxyState() {
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
    
  } catch (error) {
    console.error('Failed to initialize proxy state:', error);
    // Default to system proxy (gray) on error
    activeProfile = null;
    updateIcon(true);
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

// Handle messages from popup and options
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  switch (request.type) {
    case 'ACTIVATE_PROFILE':
      const activateResult = await activateProxy(request.payload.id);
      sendResponse(activateResult);
      break;
      
    case 'DEACTIVATE_PROFILE':
      const deactivateResult = await deactivateProxy();
      sendResponse(deactivateResult);
      break;

    case 'GET_STATE':
      // Return current state for popup
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
  
  // Return true to indicate we will send response asynchronously
  return true;
});