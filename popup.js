// X-Proxy Popup Script
// Handles UI interactions and communicates with the background service

let profiles = [];
let activeProfile = null;

// Cache DOM elements
const elements = {};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize system proxy flag
    window.systemProxyActive = false;
    cacheElements();
    await loadData();
    await syncStateWithBackground(); // Sync with background service
    attachEventListeners();
    setupStorageListener();
    updateUI();
});

// Cache DOM elements
function cacheElements() {
    elements.statusIndicator = document.getElementById('statusIndicator');
    elements.statusText = document.getElementById('statusText');
    elements.directConnection = document.getElementById('directConnection');
    elements.systemProxy = document.getElementById('systemProxy');
    elements.profilesList = document.getElementById('profilesList');
    elements.emptyState = document.getElementById('emptyState');
    elements.addProfileBtn = document.getElementById('addProfileBtn');
    elements.settingsBtn = document.getElementById('settingsBtn');
    elements.importBtn = document.getElementById('importBtn');
    elements.exportBtn = document.getElementById('exportBtn');
    elements.helpBtn = document.getElementById('helpBtn');
}

// Load data directly from storage (bypassing background service cache)
async function loadData() {
    console.log('Loading data directly from storage...');
    await loadDataFromStorage();
}

// Load data directly from chrome.storage
async function loadDataFromStorage() {
    try {
        const result = await chrome.storage.local.get(['x-proxy-data']);
        console.log('Raw storage data:', result);
        
        const data = result['x-proxy-data'] || getDefaultData();
        console.log('Parsed data:', data);
        
        profiles = (data.profiles || []).map(p => normalizeProfile(p));
        console.log('Normalized profiles:', profiles);
        
        // Find active profile by ID
        const activeProfileId = data.activeProfileId;
        if (activeProfileId) {
            activeProfile = profiles.find(p => p.id === activeProfileId) || null;
            
            // If active profile ID exists but profile not found, it was deleted
            if (!activeProfile && activeProfileId) {
                console.log('Active profile was deleted, clearing active profile ID');
                // Clear the stale active profile ID
                data.activeProfileId = undefined;
                await chrome.storage.local.set({ 'x-proxy-data': data });
                
                // Ensure system proxy is active
                window.systemProxyActive = true;
                
                // Send deactivate message to background
                try {
                    await sendMessage({ type: 'DEACTIVATE_PROFILE' });
                } catch (error) {
                    console.error('Error deactivating proxy:', error);
                }
            }
        } else {
            activeProfile = null;
            window.systemProxyActive = true;
        }
        
        console.log('Loaded from storage - Profiles:', profiles.length, 'Active:', activeProfile?.name);
    } catch (error) {
        console.error('Error loading from storage:', error);
        profiles = [];
        activeProfile = null;
    }
}

// Get default data structure (same as options.js)
function getDefaultData() {
    return {
        version: 1,
        profiles: [],
        activeProfileId: undefined,
        settings: {
            startupEnable: false,
            defaultProfile: '',
            notifyChange: true,
            notifyError: true,
            showBadge: true,
            connectionTimeout: 30,
            maxRetries: 3,
            bypassList: ['localhost', '127.0.0.1', '*.local'],
            debugMode: false,
            autoSwitchEnabled: false
        },
        rules: [],
        pacScript: ''
    };
}

// Normalize profile data format (handle different storage formats)
function normalizeProfile(profile) {
    if (!profile) return null;
    
    // Handle both new format (with config object) and old format (flat structure)
    return {
        id: profile.id,
        name: profile.name || 'Unnamed',
        description: profile.description || '',
        color: profile.color || '#007AFF',
        isActive: profile.isActive || false,
        isDefault: profile.isDefault || false,
        config: profile.config || {
            type: profile.type || 'http',
            host: profile.host || '',
            port: parseInt(profile.port) || 8080,
            auth: profile.auth ? {
                username: profile.username || '',
                password: profile.password || ''
            } : undefined,
            bypassList: profile.bypassList || [],
            pacUrl: profile.pacUrl
        },
        createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
        updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : new Date(),
        tags: profile.tags || []
    };
}

// Sync state with background service
async function syncStateWithBackground() {
    try {
        const response = await sendMessage({ type: 'GET_STATE' });
        if (response.success) {
            // Update local state based on background service
            if (response.activeProfile) {
                activeProfile = response.activeProfile;
                window.systemProxyActive = false;
            } else {
                activeProfile = null;
                window.systemProxyActive = true;
            }
            console.log('Synced state with background:', { activeProfile: activeProfile?.name, systemProxy: window.systemProxyActive });
        }
    } catch (error) {
        console.error('Failed to sync state with background:', error);
    }
}

// Send message to background service with improved timeout and retry handling
function sendMessage(message, { retries = 3, delay = 200, timeout = 5000 } = {}) {
    function attemptWithTimeout(remaining) {
        return new Promise((resolve) => {
            let isResolved = false;
            
            // Set up timeout
            const timeoutId = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    console.warn('Message timeout after', timeout, 'ms:', message.type);
                    if (remaining > 0) {
                        console.log(`Retrying... (${retries - remaining + 1}/${retries + 1})`);
                        setTimeout(() => resolve(attemptWithTimeout(remaining - 1)), delay);
                    } else {
                        resolve({ success: false, error: 'Request timeout - background service may be busy' });
                    }
                }
            }, timeout);
            
            try {
                chrome.runtime.sendMessage(message, (response) => {
                    if (isResolved) return; // Already handled by timeout
                    
                    clearTimeout(timeoutId);
                    isResolved = true;
                    
                    const lastErr = chrome.runtime.lastError;
                    const noResponse = !response || response.success === undefined;
                    
                    if (lastErr || noResponse) {
                        if (remaining > 0) {
                            console.log(`Message failed, retrying... (${retries - remaining + 1}/${retries + 1})`, lastErr?.message || 'No response');
                            setTimeout(() => resolve(attemptWithTimeout(remaining - 1)), delay);
                        } else {
                            const errorMsg = lastErr?.message || 'No response from background service';
                            console.error('Final message error:', errorMsg);
                            resolve({ success: false, error: errorMsg });
                        }
                    } else {
                        resolve(response);
                    }
                });
            } catch (error) {
                clearTimeout(timeoutId);
                if (!isResolved) {
                    isResolved = true;
                    console.error('Exception in sendMessage:', error);
                    resolve({ success: false, error: error?.message || 'Message send failed' });
                }
            }
        });
    }
    
    return attemptWithTimeout(retries);
}

// Attach event listeners
function attachEventListeners() {
    // Quick actions
    elements.systemProxy?.addEventListener('click', handleSystemProxy);
    
    // Buttons
    elements.addProfileBtn?.addEventListener('click', () => chrome.runtime.openOptionsPage());
    elements.settingsBtn?.addEventListener('click', () => chrome.runtime.openOptionsPage());
    elements.importBtn?.addEventListener('click', handleImport);
    elements.exportBtn?.addEventListener('click', handleExport);
    elements.helpBtn?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://github.com/helebest/x-proxy' });
    });
    
    // Empty state button
    const emptyBtn = document.querySelector('.empty-state-btn');
    if (emptyBtn) {
        emptyBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
    }
}



// Handle system proxy
async function handleSystemProxy() {
    const response = await sendMessage({
        type: 'DEACTIVATE_PROFILE'
    });
    
    if (response.success) {
        activeProfile = null;
        // Set a flag to indicate system proxy is active
        window.systemProxyActive = true;
        updateUI();
        showNotification('Using system proxy');
    } else {
        console.error('Failed to set system proxy:', response);
        const errorMsg = getDisplayError(response.error);
        showNotification(`Failed to set system proxy: ${errorMsg}`, 'error');
    }
}

// Handle profile click
async function handleProfileClick(profileId) {
    const response = await sendMessage({
        type: 'ACTIVATE_PROFILE',
        payload: { id: profileId }
    });
    
    if (response.success) {
        activeProfile = profiles.find(p => p.id === profileId);
        // Reset system proxy flag when activating a profile
        window.systemProxyActive = false;
        updateUI();
        showNotification(`Activated ${activeProfile?.name || 'profile'}`);
    } else {
        console.error('Failed to activate profile:', response);
        const errorMsg = getDisplayError(response.error);
        showNotification(`Failed to activate profile: ${errorMsg}`, 'error');
    }
}

// Handle profile edit
function handleProfileEdit(profileId) {
    chrome.storage.local.set({ editProfileId: profileId }, () => {
        chrome.runtime.openOptionsPage();
    });
}

// Handle import
async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            const response = await sendMessage({
                type: 'IMPORT_PROFILES',
                payload: { profiles: Array.isArray(data) ? data : data.profiles || [] }
            });
            
            if (response.success) {
                await loadData();
                updateUI();
                showNotification('Imported successfully');
            } else {
                showNotification('Import failed', 'error');
            }
        } catch (error) {
            showNotification('Invalid file', 'error');
        }
    };
    
    input.click();
}

// Handle export
async function handleExport() {
    const response = await sendMessage({
        type: 'EXPORT_PROFILES'
    });
    
    if (response.success && response.data) {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'x-proxy-profiles.json';
        a.click();
        
        URL.revokeObjectURL(url);
        showNotification('Exported successfully');
    } else {
        showNotification('Export failed', 'error');
    }
}

// Update UI
function updateUI() {
    updateStatusIndicator();
    updateQuickActions();
    updateProfilesList();
}

// Update status indicator
function updateStatusIndicator() {
    if (!elements.statusIndicator || !elements.statusText) return;
    
    elements.statusIndicator.classList.remove('active', 'inactive', 'proxy');
    
    if (activeProfile) {
        elements.statusIndicator.classList.add('proxy');
        elements.statusText.textContent = activeProfile.name;
    } else {
        elements.statusIndicator.classList.add('inactive');
        elements.statusText.textContent = 'System';
    }
}

// Update quick actions
function updateQuickActions() {
    elements.systemProxy?.classList.toggle('selected', !activeProfile);
}

// Update profiles list
function updateProfilesList() {
    const container = elements.profilesList;
    if (!container) return;
    
    // Clear all existing profile items
    container.innerHTML = '';
    
    // If we have profiles, show them
    if (profiles.length > 0) {
        profiles.forEach(profile => {
            const element = createProfileElement(profile);
            container.appendChild(element);
        });
        
        container.style.display = 'flex';
        if (elements.emptyState) {
            elements.emptyState.style.display = 'none';
        }
    } else {
        // Show empty state if no profiles
        container.style.display = 'none';
        if (elements.emptyState) {
            elements.emptyState.style.display = 'flex';
        }
    }
}

// Create profile element
function createProfileElement(profile) {
    const div = document.createElement('div');
    div.className = 'profile-item';
    div.dataset.profileId = profile.id;
    
    if (activeProfile && activeProfile.id === profile.id) {
        div.classList.add('active');
    }
    
    const type = profile.config?.type || 'PROXY';
    const host = profile.config?.host || '';
    const port = profile.config?.port || '';
    
    div.innerHTML = `
        <div class="profile-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
        </div>
        <div class="profile-content">
            <h4>${escapeHtml(profile.name)}</h4>
            <p>${type} • ${host}:${port}</p>
        </div>
        <div class="profile-actions">
            <button class="profile-edit" title="Edit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            </button>
        </div>
    `;
    
    // Add click listener
    div.addEventListener('click', (e) => {
        if (!e.target.closest('.profile-edit')) {
            handleProfileClick(profile.id);
        }
    });
    
    // Add edit listener
    const editBtn = div.querySelector('.profile-edit');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleProfileEdit(profile.id);
        });
    }
    
    return div;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// Convert technical errors to user-friendly messages
function getDisplayError(error) {
    if (!error) return 'Unknown error';
    
    // Convert common technical errors to user-friendly messages
    const errorString = String(error).toLowerCase();
    
    if (errorString.includes('timeout') || errorString.includes('port closed')) {
        return 'Connection timeout - please try again';
    }
    if (errorString.includes('no response')) {
        return 'Service unavailable - please try again';
    }
    if (errorString.includes('profile not found')) {
        return 'Profile not found - it may have been deleted';
    }
    if (errorString.includes('invalid proxy')) {
        return 'Invalid proxy configuration';
    }
    if (errorString.includes('connection refused')) {
        return 'Unable to connect to proxy server';
    }
    if (errorString.includes('permission')) {
        return 'Permission denied - check proxy settings';
    }
    
    // Return original error if it's already user-friendly (short and clear)
    if (error.length < 100 && !errorString.includes('object') && !errorString.includes('undefined')) {
        return error;
    }
    
    return 'Operation failed - please check your settings and try again';
}

// Show notification with improved styling and auto-dismiss
function showNotification(message, type = 'success') {
    if (type === 'success') {
        return; // Do not show success notifications
    }

    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#dc2626' : type === 'info' ? '#0ea5e9' : '#059669'};
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 280px;
        text-align: center;
        line-height: 1.4;
        animation: slideDown 0.3s ease-out;
    `;
    
    // Add slide animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
    `;
    document.head.appendChild(style);
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-dismiss with fade out
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-10px)';
        notification.style.transition = 'all 0.3s ease-in';
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 300);
    }, type === 'error' ? 5000 : 3000); // Show errors longer
}

// Setup storage change listener for real-time updates
function setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes['x-proxy-data']) {
            console.log('Storage changed, reloading data...', changes);
            loadData().then(() => {
                console.log('Data reloaded, profiles:', profiles.length);
                updateUI();
            });
        }
    });
}

// Refresh data when popup is shown
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
        console.log('Popup became visible, reloading data...');
        await loadData();
        await syncStateWithBackground();
        updateUI();
    }
});

// Also reload data when the popup is focused (more reliable for extensions)
window.addEventListener('focus', async () => {
    console.log('Popup focused, reloading data...');
    await loadData();
    await syncStateWithBackground();
    updateUI();
});
