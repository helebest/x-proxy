// X-Proxy Background Service Worker
// Background script for proxy management with lifecycle management

import { migrateData, SCHEMA_VERSION } from './lib/storage-migration.js';
import { resolveIconPaths } from './lib/icon-paths.js';

console.log('X-Proxy background service worker loaded');

// Service worker state management
let activeProfile = null;
let currentMode = 'system'; // 'direct' | 'system' | 'profile'
let isInitialized = false;
let keepAliveTimeout = null;
// Exposed via GET_STATE so tests can assert toolbar-icon repaint without
// needing a real chrome.action.getIcon API.
let lastIconColor = null;
let lastIconMode = null;
let lastIconPaths = null;

// Read x-proxy-data and normalize to the canonical v2 shape.
async function readData() {
  const result = await chrome.storage.local.get(['x-proxy-data']);
  return migrateData(result['x-proxy-data']);
}

// Persist the given v2-shaped data back to storage.
async function writeData(data) {
  await chrome.storage.local.set({ 'x-proxy-data': { ...data, version: SCHEMA_VERSION } });
}

/**
 * Convert user-provided PAC URL or file path to Chrome proxy API format.
 * @param {string} input - URL, file:// URL, or local file path
 * @returns {{ url: string } | null}
 */
function toPacUrl(input) {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed) || /^file:\/\//i.test(trimmed)) return { url: trimmed };
  if (/^[a-zA-Z]:[\\\/]/.test(trimmed)) return { url: 'file:///' + trimmed.replace(/\\/g, '/') };
  if (trimmed.startsWith('/')) return { url: 'file://' + trimmed };
  return null;
}

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

function updateIcon(profileColor = null, mode = null) {
  // Short-circuit if the resolved icon hasn't changed — onActivated/onUpdated/
  // onFocusChanged fire constantly and chrome.action.setIcon is real IPC.
  if (profileColor === lastIconColor && mode === lastIconMode) return;

  lastIconColor = profileColor;
  lastIconMode = mode;
  const path = resolveIconPaths(profileColor, mode);
  lastIconPaths = path;

  chrome.action
    .setIcon({ path })
    .catch((error) => {
      console.error("Failed to update icon:", error);
    });
}

// Shell-glob pattern matching, replicating PAC shExpMatch behavior
function matchesShExp(hostname, pattern) {
  const regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${regex}$`, 'i').test(hostname);
}

// Returns true if hostname is effectively routed through the active proxy profile.
// For user-provided PAC profiles the script cannot be evaluated here, so we assume proxied.
// For HTTP/SOCKS5 profiles without routing rules all traffic is proxied.
// For HTTP/SOCKS5 profiles with routing rules the whitelist/blacklist is evaluated.
function isHostProxied(hostname, profile) {
  const proxyType = profile.config?.type || profile.type;
  if (proxyType === 'pac') return true;

  const routingRules = profile.config?.routingRules;
  if (!routingRules?.enabled || !routingRules?.domains?.length) return true;

  const { domains, mode } = routingRules;
  const matched = domains.some(p => matchesShExp(hostname, p));
  return (mode || 'whitelist') === 'whitelist' ? matched : !matched;
}

// Returns the active tab from the last-focused NORMAL browser window.
// An extension popup is a window of type 'popup' and carries no browsing tabs,
// so chrome.tabs.query({currentWindow:true}) invoked while our popup has focus
// returns nothing — which is why the toolbar icon used to stay gray until the
// user interacted with the address bar (closing the popup) and fired onUpdated.
async function getActiveBrowserTab() {
  try {
    const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
    if (!win || win.id === chrome.windows.WINDOW_ID_NONE) return null;
    const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
    return tab || null;
  } catch {
    return null;
  }
}

// Update the toolbar icon.
// When a profile is active without per-domain routing rules, the proxy applies
// globally and the icon always shows the profile color — matches user
// expectation of immediate "proxy is on" feedback, including when the active
// tab is chrome://newtab, about:blank, or any other non-http page.
// When routing rules ARE enabled, the icon is per-tab: profile color if the
// current site is matched by the rules, gray otherwise — the point of the
// per-tab indicator is to tell the user which sites are actually going through
// the proxy vs direct.
async function updateIconForActiveTab() {
  if (!isInitialized) {
    try {
      const data = await readData();
      currentMode = data.mode;
      activeProfile = data.mode === 'profile' && data.activeProfileId
        ? (data.profiles.find(p => p.id === data.activeProfileId) || null)
        : null;
    } catch {
      activeProfile = null;
      currentMode = 'system';
    }
    isInitialized = true;
  }

  if (!activeProfile) {
    // Direct and system both lack an active profile but need distinct icons,
    // so pass currentMode through rather than a blanket null.
    updateIcon(null, currentMode);
    return;
  }

  const routingRules = activeProfile.config?.routingRules;
  const hasRoutingRules = routingRules?.enabled && routingRules?.domains?.length > 0;

  if (!hasRoutingRules) {
    // Simple proxy (or PAC) without per-domain routing: show profile color
    // regardless of current tab URL.
    updateIcon(activeProfile.color, 'profile');
    return;
  }

  try {
    const tab = await getActiveBrowserTab();
    const url = tab?.url || tab?.pendingUrl || '';

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Non-http pages are never routed through per-domain rules — show
      // inactive gray even though a profile is "active" because no traffic
      // is flowing through it on this tab.
      updateIcon(null, 'system');
      return;
    }

    const hostname = new URL(url).hostname;
    const proxied = isHostProxied(hostname, activeProfile);
    updateIcon(proxied ? activeProfile.color : null, proxied ? 'profile' : 'system');
  } catch (error) {
    console.error('Failed to determine proxy state for active tab:', error);
    updateIcon(activeProfile.color, 'profile');
  }
}

// Activate proxy profile
async function activateProxy(profileId) {
  keepAlive(); // Keep service worker alive during operation

  try {
    // Get profile data from storage (normalized to v2)
    const data = await readData();
    const profile = data.profiles?.find(p => p.id === profileId);

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Normalize profile structure (support both old flat and new nested structure)
    const proxyType = profile.config?.type || profile.type || 'http';

    // Clear any existing proxy configuration first
    await chrome.proxy.settings.clear({
      scope: 'regular'
    });

    // Small delay to ensure clear operation completes
    await new Promise(resolve => setTimeout(resolve, 100));

    let config;

    if (proxyType === 'pac') {
      // PAC profile: use user-provided PAC URL/file path
      const pacUrl = profile.config?.pacUrl;
      if (!pacUrl) {
        throw new Error('Invalid PAC configuration: missing PAC URL');
      }
      const resolved = toPacUrl(pacUrl);
      if (!resolved) {
        throw new Error('Invalid PAC URL format');
      }
      config = {
        mode: "pac_script",
        pacScript: {
          url: resolved.url
        }
      };
      console.log('Using PAC URL mode for:', profile.name, resolved.url);
    } else {
      // HTTP/SOCKS5 profiles
      const proxyHost = profile.config?.host || profile.host;
      const proxyPort = profile.config?.port || profile.port;

      if (!proxyHost || !proxyPort) {
        throw new Error('Invalid proxy configuration: missing host or port');
      }

      // Check if routing rules are enabled
      const routingRules = profile.config?.routingRules;
      const useRouting = routingRules?.enabled && routingRules?.domains?.length > 0;

      if (useRouting) {
        // Use PAC script mode for domain-based routing
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
    }

    await chrome.proxy.settings.set({
      value: config,
      scope: 'regular'
    });

    // Update storage with active profile in mode='profile'
    data.mode = 'profile';
    data.activeProfileId = profileId;
    await writeData(data);

    // Update internal state and icon
    activeProfile = profile;
    currentMode = 'profile';
    updateIconForActiveTab();

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

    // Update storage: mode='system', no active profile
    const data = await readData();
    data.mode = 'system';
    data.activeProfileId = undefined;
    await writeData(data);

    // Update internal state and icon
    activeProfile = null;
    currentMode = 'system';
    updateIcon(null, 'system'); // Gray icon for system proxy

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
      const data = await readData();
      data.mode = 'system';
      data.activeProfileId = undefined;
      await writeData(data);

      activeProfile = null;
      currentMode = 'system';
      updateIcon(null, 'system');

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

// Switch Chrome to direct mode — bypasses OS proxy and PAC.
async function setDirectMode() {
  keepAlive();

  try {
    await chrome.proxy.settings.clear({ scope: 'regular' });
    await new Promise(resolve => setTimeout(resolve, 100));
    await chrome.proxy.settings.set({
      value: { mode: 'direct' },
      scope: 'regular'
    });

    const data = await readData();
    data.mode = 'direct';
    data.activeProfileId = undefined;
    await writeData(data);

    activeProfile = null;
    currentMode = 'direct';
    updateIcon(null, 'direct');

    console.log('Switched to direct mode (no proxy)');
    return { success: true };
  } catch (error) {
    console.error('Failed to set direct mode:', error);
    return { success: false, error: error?.message || String(error) || 'Unknown error' };
  }
}

// Initialize proxy state from storage
async function initializeProxyState() {
  if (isInitialized) return; // Prevent multiple initializations

  keepAlive();
  console.log('Initializing proxy state...');

  try {
    const data = await readData();
    currentMode = data.mode;

    if (data.mode === 'profile' && data.activeProfileId) {
      const profile = data.profiles.find(p => p.id === data.activeProfileId);
      if (profile) {
        activeProfile = profile;
        isInitialized = true;
        updateIconForActiveTab();
        console.log('Restored active proxy:', profile.name);
        return;
      }
    }

    // Pass the stored mode so Direct renders its own icon family instead of
    // falling back to gray.
    activeProfile = null;
    updateIcon(null, currentMode);
    console.log(`Initialized in ${data.mode} mode`);

    isInitialized = true;
    console.log('Proxy state initialization completed');

  } catch (error) {
    console.error('Failed to initialize proxy state:', error);
    // Default to system proxy (gray) on error
    activeProfile = null;
    currentMode = 'system';
    updateIcon(null, 'system');
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

// Handle proxy authentication requests
// Uses asyncBlocking because service worker may restart and lose in-memory activeProfile
chrome.webRequest.onAuthRequired.addListener(
  (details, asyncCallback) => {
    if (!details.isProxy) {
      asyncCallback({});
      return;
    }

    // Try in-memory profile first (fast path)
    if (activeProfile) {
      const auth = activeProfile.config?.auth;
      if (auth && auth.username) {
        console.log('Auth provided from memory for:', activeProfile.name);
        asyncCallback({ authCredentials: { username: auth.username, password: auth.password } });
        return;
      }
      asyncCallback({});
      return;
    }

    // Fallback: read from storage (service worker may have restarted)
    readData().then(data => {
      if (data.mode === 'profile' && data.activeProfileId) {
        const profile = data.profiles.find(p => p.id === data.activeProfileId);
        if (profile) {
          activeProfile = profile; // Restore in-memory state
          currentMode = 'profile';
          const auth = profile.config?.auth;
          if (auth && auth.username) {
            console.log('Auth provided from storage for:', profile.name);
            asyncCallback({ authCredentials: { username: auth.username, password: auth.password } });
            return;
          }
        }
      }
      asyncCallback({});
    }).catch(() => {
      asyncCallback({});
    });
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);

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

        case 'SET_DIRECT_MODE':
          const directResult = await setDirectMode();
          sendResponse(directResult);
          break;

        case 'GET_STATE':
          // Ensure initialization before returning state
          if (!isInitialized) {
            await initializeProxyState();
          }
          sendResponse({
            success: true,
            mode: currentMode,
            activeProfile: activeProfile,
            isSystemProxy: currentMode === 'system',
            isDirectMode: currentMode === 'direct',
            lastIconColor: lastIconColor,
            lastIconMode: lastIconMode,
            lastIconPaths: lastIconPaths
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

// Recheck icon whenever the active tab changes or navigates
chrome.tabs.onActivated.addListener(() => {
  updateIconForActiveTab();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url) return;
  getActiveBrowserTab().then(tab => {
    if (tab?.id === tabId) updateIconForActiveTab();
  }).catch(() => {});
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) updateIconForActiveTab();
});