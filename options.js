// Options Page JavaScript
class OptionsManager {
  constructor() {
    this.profiles = [];
    this.settings = {};
    this.currentSection = 'profiles';
    this.editingProfile = null;
    this.init();
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.renderProfiles();
    this.loadSettings();
  }

  // Data Management
  async loadData() {
    try {
      // Load data in the same format as background service expects
      const result = await chrome.storage.local.get(['x-proxy-data']);
      const data = result['x-proxy-data'] || this.getDefaultData();
      
      this.profiles = data.profiles || [];
      this.settings = data.settings || this.getDefaultSettings();
      
      // Convert profiles to the correct format if needed
      this.profiles = this.profiles.map(p => this.normalizeProfile(p));
    } catch (error) {
      console.error('Error loading data:', error);
      this.showStatus('Error loading settings', 'error');
    }
  }

  async saveData() {
    try {
      // Save data in the same format as background service expects
      const existingData = await chrome.storage.local.get(['x-proxy-data']);
      const data = existingData['x-proxy-data'] || this.getDefaultData();
      
      // Update the data with our changes
      data.profiles = this.profiles.map(p => this.normalizeProfileForSave(p));
      data.settings = { ...data.settings, ...this.settings };
      
      await chrome.storage.local.set({ 'x-proxy-data': data });
      this.showStatus('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving data:', error);
      this.showStatus('Error saving settings', 'error');
    }
  }

  getDefaultData() {
    return {
      version: 1,
      profiles: [],
      activeProfileId: undefined,
      settings: this.getDefaultSettings()
    };
  }

  normalizeProfile(profile) {
    // Ensure profile has the correct structure
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
        bypassList: profile.bypassList || []
      },
      createdAt: this.safeParseDate(profile.createdAt),
      updatedAt: this.safeParseDate(profile.updatedAt),
      tags: profile.tags || []
    };
  }

  // Safely parse date values to Date objects
  safeParseDate(dateValue) {
    if (!dateValue) return new Date();
    
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? new Date() : dateValue;
    }
    
    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    
    return new Date();
  }

  // Safely normalize date values
  normalizeDate(dateValue) {
    if (!dateValue) return new Date().toISOString();
    
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? new Date().toISOString() : dateValue.toISOString();
    }
    
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    }
    
    // If it's a number (timestamp)
    if (typeof dateValue === 'number') {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    }
    
    // Fallback to current time
    return new Date().toISOString();
  }

  normalizeProfileForSave(profile) {
    // Convert profile for saving
    const config = profile.config || {};
    return {
      id: profile.id,
      name: profile.name,
      description: profile.description || '',
      color: profile.color || '#007AFF',
      isActive: profile.isActive || false,
      isDefault: profile.isDefault || false,
      config: {
        type: config.type || profile.type || 'http',
        host: config.host || profile.host || '',
        port: parseInt(config.port || profile.port) || 8080,
        bypassList: config.bypassList || profile.bypassList || []
      },
      createdAt: this.normalizeDate(profile.createdAt),
      updatedAt: new Date().toISOString(),
      tags: profile.tags || []
    };
  }

  getDefaultSettings() {
    return {
      startupEnable: false,
      defaultProfile: '',
      notifyChange: true,
      notifyError: true,
      showBadge: true,
      connectionTimeout: 30,
      maxRetries: 3,
      bypassList: ['localhost', '127.0.0.1', '*.local'],
      debugMode: false
    };
  }


  // Event Listeners Setup
  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => this.switchSection(item.dataset.section));
    });

    // Profile Management
    document.getElementById('addProfileBtn').addEventListener('click', () => this.showProfileModal());
    document.getElementById('saveProfileBtn').addEventListener('click', () => this.saveProfile());
    document.getElementById('cancelProfileBtn').addEventListener('click', () => this.hideProfileModal());
    document.getElementById('closeProfileModal').addEventListener('click', () => this.hideProfileModal());

    // Proxy type change handler
    document.getElementById('proxyType').addEventListener('change', (e) => this.handleProxyTypeChange(e));
    



    // Import/Export - removed importBtn, exportBtn, backupBtn, restoreBtn (features offline)

    // File inputs - removed (import/export features offline)


    // Save All Button
    document.getElementById('saveAllBtn').addEventListener('click', () => this.saveData());

    // About Section
    document.getElementById('reportBugBtn').addEventListener('click', (e) => {
      e.preventDefault();
      window.open('https://github.com/yourusername/x-proxy/issues/new', '_blank');
    });
    document.getElementById('requestFeatureBtn').addEventListener('click', (e) => {
      e.preventDefault();
      window.open('https://github.com/yourusername/x-proxy/issues/new', '_blank');
    });
  }

  // Section Navigation
  switchSection(section) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === section);
    });

    // Update content
    document.querySelectorAll('.section').forEach(sec => {
      sec.classList.toggle('active', sec.id === `${section}-section`);
    });

    this.currentSection = section;
  }

  // Profile Management
  renderProfiles() {
    const container = document.getElementById('profilesList');
    container.innerHTML = '';

    if (this.profiles.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No proxy profiles configured</p>
          <p>Click "Add Profile" to create your first proxy profile</p>
        </div>
      `;
      return;
    }

    this.profiles.forEach((profile, index) => {
      const card = document.createElement('div');
      card.className = 'profile-card';
      const config = profile.config || {};
      let type = config.type || profile.type || 'http';
      // Normalize deprecated types since they're now combined/removed
      if (type === 'https') type = 'http';
      if (type === 'socks4') type = 'socks5';
      const host = config.host || profile.host || '';
      const port = config.port || profile.port || '';
      
      card.innerHTML = `
        <div class="profile-header">
          <div class="profile-info">
            <div class="profile-name">
              <span class="profile-color-indicator" style="background: ${profile.color}"></span>
              ${profile.name}
            </div>
            <div class="profile-type">${type === 'http' ? 'HTTP/HTTPS' : type.toUpperCase()}</div>
          </div>
        </div>
        <div class="profile-details">
          ${host}:${port}
        </div>
        <div class="profile-actions">
          <button class="btn btn-secondary" data-action="edit" data-index="${index}">Edit</button>
          <button class="btn btn-secondary" data-action="duplicate" data-index="${index}">Duplicate</button>
          <button class="btn btn-danger" data-action="delete" data-index="${index}">Delete</button>
        </div>
      `;
      container.appendChild(card);
    });

    // Add event delegation for profile action buttons
    this.setupProfileActionEvents(container);

  }

  // Setup event delegation for profile action buttons
  setupProfileActionEvents(container) {
    // Remove existing event listeners to avoid duplicates
    container.removeEventListener('click', this.handleProfileAction);
    
    // Add event delegation
    this.handleProfileAction = (e) => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;
      
      const action = button.dataset.action;
      const index = parseInt(button.dataset.index);
      
      switch (action) {
        case 'edit':
          this.editProfile(index);
          break;
        case 'duplicate':
          this.duplicateProfile(index);
          break;
        case 'delete':
          this.deleteProfile(index);
          break;
      }
    };
    
    container.addEventListener('click', this.handleProfileAction);
  }


  showProfileModal(profile = null) {
    this.editingProfile = profile;
    const modal = document.getElementById('profileModal');
    const title = document.getElementById('profileModalTitle');
    
    if (profile) {
      title.textContent = 'Edit Proxy Profile';
      document.getElementById('profileName').value = profile.name || '';
      
      // Handle color palette selection
      const profileColor = profile.color || '#007AFF';
      const colorRadio = document.querySelector(`input[name="profileColor"][value="${profileColor}"]`);
      if (colorRadio) {
        colorRadio.checked = true;
      } else {
        // Default to blue if color not found in palette
        document.getElementById('color-blue').checked = true;
      }
      
      // Access config from either the new nested structure or old flat structure
      const config = profile.config || {};
      let type = config.type || profile.type || 'http';
      // Normalize deprecated types since they're now combined/removed
      if (type === 'https') type = 'http';
      if (type === 'socks4') type = 'socks5';
      document.getElementById('proxyType').value = type;
      
      document.getElementById('proxyHost').value = config.host || profile.host || '';
      document.getElementById('proxyPort').value = config.port || profile.port || '';
    } else {
      title.textContent = 'Add Proxy Profile';
      document.getElementById('profileForm').reset();
    }
    
    this.handleProxyTypeChange({ target: { value: profile?.config?.type || profile?.type || 'http' } });
    modal.classList.add('show');
  }

  hideProfileModal() {
    document.getElementById('profileModal').classList.remove('show');
    this.editingProfile = null;
  }

  handleProxyTypeChange(e) {
    // No need to handle PAC type anymore
    document.getElementById('proxyDetails').style.display = 'block';
  }

  async saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const colorRadio = document.querySelector('input[name="profileColor"]:checked');
    const color = colorRadio ? colorRadio.value : '#007AFF';
    const type = document.getElementById('proxyType').value;
    
    if (!name) {
      alert('Please enter a profile name');
      return;
    }
    
    const profile = {
      id: this.editingProfile?.id || Date.now().toString(),
      name,
      color,
      type,
      createdAt: this.editingProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    profile.host = document.getElementById('proxyHost').value.trim();
    profile.port = document.getElementById('proxyPort').value.trim();
    
    if (!profile.host || !profile.port) {
      alert('Please enter host and port');
      return;
    }
    
    if (this.editingProfile) {
      const index = this.profiles.findIndex(p => p.id === this.editingProfile.id);
      this.profiles[index] = profile;
    } else {
      this.profiles.push(profile);
    }
    
    await this.saveData();
    this.renderProfiles();
    this.hideProfileModal();
  }

  editProfile(index) {
    this.showProfileModal(this.profiles[index]);
  }

  duplicateProfile(index) {
    const original = this.profiles[index];
    
    // Create a proper deep copy with correct structure
    const duplicate = {
      id: Date.now().toString(),
      name: `${original.name} (Copy)`,
      description: original.description || '',
      color: original.color || '#007AFF',
      isActive: false,
      isDefault: false,
      config: {
        type: (() => {
          let t = original.config?.type || original.type || 'http';
          if (t === 'https') t = 'http';
          if (t === 'socks4') t = 'socks5';
          return t;
        })(),
        host: original.config?.host || original.host || '',
        port: parseInt(original.config?.port || original.port) || 8080,
        bypassList: original.config?.bypassList || original.bypassList || []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: original.tags || []
    };
    
    this.profiles.push(duplicate);
    console.log('Created duplicate profile:', duplicate);
    this.saveData();
    this.renderProfiles();
  }

  async deleteProfile(index) {
    const profileToDelete = this.profiles[index];
    if (confirm(`Are you sure you want to delete "${profileToDelete.name}"?`)) {
      // Check if the deleted profile is currently active
      const result = await chrome.storage.local.get(['x-proxy-data']);
      const data = result['x-proxy-data'] || this.getDefaultData();
      const isActiveProfile = data.activeProfileId === profileToDelete.id;
      
      // Remove the profile
      this.profiles.splice(index, 1);
      
      // If the deleted profile was active, deactivate it and switch to system proxy
      if (isActiveProfile) {
        console.log(`Deleted profile ${profileToDelete.name} was active, switching to system proxy`);
        
        // Clear active profile ID
        data.activeProfileId = undefined;
        await chrome.storage.local.set({ 'x-proxy-data': data });
        
        // Send message to background to deactivate proxy
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'DEACTIVATE_PROFILE'
          });
          
          if (response && response.success) {
            console.log('Successfully switched to system proxy');
            this.showStatus(`Deleted active profile "${profileToDelete.name}", switched to system proxy`, 'info');
          } else {
            console.error('Failed to deactivate proxy:', response?.error);
          }
        } catch (error) {
          console.error('Error sending deactivate message:', error);
        }
      }
      
      await this.saveData();
      this.renderProfiles();
    }
  }












  // Settings Management
  loadSettings() {
    // Settings UI removed, but keep default settings in storage
  }

  // Import/Export methods removed (features offline)







  // Utility Functions
  showStatus(message, type = 'info') {
    const status = document.getElementById('saveStatus');
    status.textContent = message;
    status.className = `status ${type}`;
    
    setTimeout(() => {
      status.textContent = '';
      status.className = 'status';
    }, 3000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.optionsManager = new OptionsManager();
});
