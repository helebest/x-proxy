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
    attachEventListeners();
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

// Load data from background service or fallback to direct storage
async function loadData() {
    try {
        // First try to get data from background service
        const profilesResponse = await sendMessage({
            type: 'GET_PROFILES'
        });
        
        if (profilesResponse && profilesResponse.success) {
            profiles = profilesResponse.data || [];
            console.log('Loaded profiles from background:', profiles);
            
            // Get active profile from background
            const activeResponse = await sendMessage({
                type: 'GET_ACTIVE_PROFILE'
            });
            
            if (activeResponse && activeResponse.success) {
                activeProfile = activeResponse.data;
                console.log('Active profile from background:', activeProfile);
            } else {
                activeProfile = null;
            }
        } else {
            // Fallback: Load directly from chrome.storage if background service fails
            console.log('Background service not available, loading from storage directly');
            await loadDataFromStorage();
        }
    } catch (error) {
        console.error('Error loading data from background:', error);
        // Fallback to direct storage access
        await loadDataFromStorage();
    }
}

// Fallback method to load data directly from chrome.storage
async function loadDataFromStorage() {
    try {
        const result = await chrome.storage.local.get(['x-proxy-data']);
        const data = result['x-proxy-data'] || getDefaultData();
        
        profiles = (data.profiles || []).map(p => normalizeProfile(p));
        
        // Find active profile by ID
        const activeProfileId = data.activeProfileId;
        if (activeProfileId) {
            activeProfile = profiles.find(p => p.id === activeProfileId) || null;
        } else {
            activeProfile = null;
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

// Send message to background service (with retry to handle bg init race)
function sendMessage(message, { retries = 5, delay = 150 } = {}) {
    function attempt(remaining) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, (response) => {
                const lastErr = chrome.runtime.lastError;
                const noResponse = !response || response.success === undefined;
                const initError = response && response.success === false &&
                    typeof response.error === 'string' && response.error.includes('ProxyManager not initialized');

                if (lastErr || noResponse || initError) {
                    if (remaining > 0) {
                        // Retry after a short delay (background may still be booting)
                        setTimeout(() => resolve(attempt(remaining - 1)), delay);
                    } else {
                        if (lastErr) {
                            console.error('Message error:', lastErr);
                            resolve({ success: false, error: lastErr.message });
                        } else if (noResponse) {
                            resolve({ success: false, error: 'No response from background' });
                        } else {
                            resolve(response);
                        }
                    }
                } else {
                    resolve(response);
                }
            });
        });
    }
    return attempt(retries);
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
        chrome.tabs.create({ url: 'https://github.com' });
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
        showNotification('Failed to set system proxy', 'error');
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
        showNotification('Failed to activate profile', 'error');
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
        elements.statusText.textContent = 'System Proxy';
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

// Show notification
function showNotification(message, type = 'success') {
    if (type === 'success') {
        return; // Do not show success notifications
    }

    // Remove existing notification
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#f44336' : type === 'info' ? '#2196F3' : '#4CAF50'};
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Refresh data when popup is shown
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        loadData().then(() => updateUI());
    }
});
