// Options Page JavaScript

import { PROFILE_COLORS } from './lib/icon-paths.js';

function createPacConfig(pacUrl) {
  return {
    type: 'pac',
    pacUrl,
    host: '',
    port: 0,
    auth: { username: '', password: '' },
    bypassList: [],
    routingRules: { enabled: false, mode: 'whitelist', domains: [] }
  };
}

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
      version: 2,
      mode: 'system',
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
      config: profile.config ? { ...profile.config, pacUrl: profile.config.pacUrl || '' } : {
        type: profile.type || 'http',
        host: profile.host || '',
        port: parseInt(profile.port) || 8080,
        auth: profile.config?.auth || { username: '', password: '' },
        bypassList: profile.bypassList || [],
        pacUrl: '',
        routingRules: profile.config?.routingRules || {
          enabled: false,
          mode: 'whitelist',
          domains: []
        }
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
        auth: config.auth || { username: '', password: '' },
        bypassList: config.bypassList || profile.bypassList || [],
        pacUrl: config.pacUrl || '',
        routingRules: config.routingRules || profile.routingRules || {
          enabled: false,
          mode: 'whitelist',
          domains: []
        }
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

    // Keyboard handling for the profile modal.
    //   Escape  → close the modal. Previously there was no way out without
    //             pointer or Tab-hunting for Cancel; this clears the WCAG
    //             2.1.2 "No Keyboard Trap" bar.
    //   Tab     → wrap focus inside the modal (WAI-ARIA dialog pattern).
    //             Without this, Tab from Save leaks to #saveAllBtn / sidebar
    //             so the user is visually inside the modal but typing into
    //             the page behind it.
    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('profileModal');
      if (!modal || !modal.classList.contains('show')) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.hideProfileModal();
        return;
      }

      if (e.key === 'Tab') {
        const focusables = this.getModalFocusables(modal);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    // Proxy type change handler
    document.getElementById('proxyType').addEventListener('change', (e) => this.handleProxyTypeChange(e));

    // Password visibility toggle
    document.getElementById('togglePassword').addEventListener('click', () => {
      const input = document.getElementById('proxyPassword');
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      document.getElementById('eyeIcon').style.display = isPassword ? 'none' : 'inline';
      document.getElementById('eyeOffIcon').style.display = isPassword ? 'inline' : 'none';
      document.getElementById('toggleText').textContent = isPassword ? 'Hide' : 'Show';
    });

    // Routing rules toggle
    document.getElementById('enableRoutingRules').addEventListener('change', (e) => {
      const isEnabled = e.target.checked;
      document.getElementById('routingRulesPanel').style.display = isEnabled ? 'block' : 'none';

      // Clear textarea when disabled
      if (!isEnabled) {
        document.getElementById('domainListTextarea').value = '';
      }
    });

    // Routing mode radio button change handler
    document.querySelectorAll('input[name="routingMode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.updateDomainListLabel(e.target.value);
      });
    });

    // Import/Export
    document.getElementById('exportProfilesBtn').addEventListener('click', () => this.exportProfiles());
    document.getElementById('importProfilesBtn').addEventListener('click', () => {
      document.getElementById('importFileInput').click();
    });
    document.getElementById('importFileInput').addEventListener('change', (e) => this.handleImportFile(e));


    // Save All Button
    document.getElementById('saveAllBtn').addEventListener('click', () => this.saveData());

    // About Section
    document.getElementById('reportBugBtn').addEventListener('click', (e) => {
      e.preventDefault();
      const bugReportUrl = 'https://github.com/helebest/x-proxy/issues/new?' + 
        'labels=bug&template=bug_report.md&title=' + encodeURIComponent('[Bug Report] ');
      window.open(bugReportUrl, '_blank');
    });
    document.getElementById('requestFeatureBtn').addEventListener('click', (e) => {
      e.preventDefault();
      const featureRequestUrl = 'https://github.com/helebest/x-proxy/issues/new?' + 
        'labels=enhancement&template=feature_request.md&title=' + encodeURIComponent('[Feature Request] ');
      window.open(featureRequestUrl, '_blank');
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

      let displayType, displayDetails;
      if (type === 'pac') {
        displayType = 'PAC';
        const pacUrl = config.pacUrl || '';
        displayDetails = pacUrl.length > 50 ? pacUrl.substring(0, 47) + '...' : pacUrl;
      } else {
        displayType = type === 'http' ? 'HTTP/HTTPS' : type.toUpperCase();
        const host = config.host || profile.host || '';
        const port = config.port || profile.port || '';
        displayDetails = `${host}:${port}`;
      }

      card.innerHTML = `
        <div class="profile-header">
          <div class="profile-info">
            <div class="profile-name">
              <span class="profile-color-indicator" style="background: ${profile.color}"></span>
              ${profile.name}
            </div>
            <div class="profile-type">${displayType}</div>
          </div>
        </div>
        <div class="profile-details">
          ${displayDetails}
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
    // Remember which element was focused before the modal opened so we can
    // return focus there on close (WCAG 2.4.3 focus order).
    this.lastFocusedBeforeModal = document.activeElement;
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

      // Load routing rules
      const routingRules = config.routingRules || { enabled: false, mode: 'whitelist', domains: [] };
      document.getElementById('enableRoutingRules').checked = routingRules.enabled || false;
      document.getElementById('routingRulesPanel').style.display = routingRules.enabled ? 'block' : 'none';

      // Set routing mode radio button
      const routingMode = routingRules.mode || 'whitelist';
      const modeRadio = document.getElementById(routingMode === 'blacklist' ? 'routingModeBlacklist' : 'routingModeWhitelist');
      if (modeRadio) modeRadio.checked = true;
      this.updateDomainListLabel(routingMode);

      document.getElementById('domainListTextarea').value = (routingRules.domains || []).join('\n');

      // Load auth fields
      const auth = config.auth || { username: '', password: '' };
      document.getElementById('proxyUsername').value = auth.username || '';
      document.getElementById('proxyPassword').value = auth.password || '';

      // Load PAC URL
      document.getElementById('pacUrl').value = config.pacUrl || '';
    } else {
      title.textContent = 'Add Proxy Profile';
      document.getElementById('profileForm').reset();
      // Reset routing rules for new profile
      document.getElementById('enableRoutingRules').checked = false;
      document.getElementById('routingRulesPanel').style.display = 'none';
      document.getElementById('routingModeWhitelist').checked = true;
      this.updateDomainListLabel('whitelist');
      document.getElementById('domainListTextarea').value = '';
      document.getElementById('pacUrl').value = '';
    }

    this.handleProxyTypeChange({ target: { value: profile?.config?.type || profile?.type || 'http' } });
    modal.classList.add('show');
    // Land the user on the first input so they can type immediately instead
    // of being stranded behind the modal. .focus() moves activeElement
    // synchronously even if the element is not yet painted.
    document.getElementById('profileName').focus();
  }

  hideProfileModal() {
    document.getElementById('profileModal').classList.remove('show');
    this.editingProfile = null;
    // Return focus to the element that opened the modal (typically
    // #addProfileBtn or an Edit button). Falls through quietly if that
    // element was removed in the meantime.
    const returnTo = this.lastFocusedBeforeModal;
    this.lastFocusedBeforeModal = null;
    if (returnTo && typeof returnTo.focus === 'function' && document.contains(returnTo)) {
      returnTo.focus();
    }
  }

  // Enumerate visible, enabled tabbable elements inside the modal in DOM
  // order, for the Tab / Shift+Tab focus-trap handler. offsetParent === null
  // filters out elements hidden by display:none on themselves or an ancestor
  // — this matters because #pacDetails / #proxyDetails / #routingRulesPanel
  // toggle visibility based on proxy type, and #domainListTextarea is hidden
  // unless the routing toggle is on.
  getModalFocusables(modal) {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    return Array.from(modal.querySelectorAll(selector))
      .filter(el => el.offsetParent !== null);
  }

  handleProxyTypeChange(e) {
    const isPac = e.target.value === 'pac';
    document.getElementById('proxyDetails').style.display = isPac ? 'none' : 'block';
    document.getElementById('pacDetails').style.display = isPac ? 'block' : 'none';
    document.getElementById('authSection').style.display = isPac ? 'none' : 'block';
    document.getElementById('routingSection').style.display = isPac ? 'none' : 'block';
  }

  // Validate domain/IP format (supports wildcards, CIDR, localhost, etc.)
  // Credit: Pattern contributed by @jasonliaotw in issue #9
  isValidDomain(domain) {
    // IPv4 address with optional wildcard segments or CIDR notation
    // Examples: 127.0.0.1, 192.168.*, 192.168.0.0/24, 10.*
    const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d|\*)){0,3}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)\/(?:[0-9]|[1-2][0-9]|3[0-2]))$/;

    // IPv6 address (simplified pattern for common formats)
    // Examples: ::1, fe80::1, 2001:db8::1
    const ipv6Pattern = /^(?:[0-9A-Fa-f]{0,4}:){2,7}[0-9A-Fa-f]{0,4}(?:\/\d{1,3})?$/;

    // Domain name pattern (supports wildcards, localhost, *.local, etc.)
    // Examples: localhost, *.google.com, github.com, *.local, example.*
    const domainPattern = /^(?:\*|(?:\*\.)?[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(?:\.\*)?)$/;

    return ipv4Pattern.test(domain) || ipv6Pattern.test(domain) || domainPattern.test(domain);
  }

  // Update the domain list label and placeholder based on routing mode
  updateDomainListLabel(mode) {
    const label = document.getElementById('domainListLabel');
    const textarea = document.getElementById('domainListTextarea');

    if (mode === 'blacklist') {
      label.textContent = 'Blacklist Domains (these sites bypass proxy)';
      textarea.placeholder = `Enter one domain per line:
localhost
127.0.0.1
192.168.*
*.local`;
    } else {
      label.textContent = 'Whitelist Domains (only these sites use proxy)';
      textarea.placeholder = `Enter one domain per line:
*.google.com
github.com
*.youtube.com`;
    }
  }

  async saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const colorRadio = document.querySelector('input[name="profileColor"]:checked');
    const color = colorRadio ? colorRadio.value : '#007AFF';
    const type = document.getElementById('proxyType').value;
    const host = document.getElementById('proxyHost').value.trim();
    const port = document.getElementById('proxyPort').value.trim();

    if (!name) {
      alert('Please enter a profile name');
      return;
    }

    if (type === 'pac') {
      const pacUrlValue = document.getElementById('pacUrl').value.trim();
      if (!pacUrlValue) {
        alert('Please enter a PAC URL or file path');
        return;
      }
    } else if (!host || !port) {
      alert('Please enter host and port');
      return;
    }

    // Collect routing rules
    const routingEnabled = document.getElementById('enableRoutingRules').checked;
    const routingMode = document.querySelector('input[name="routingMode"]:checked')?.value || 'whitelist';
    const domainsText = document.getElementById('domainListTextarea').value;
    const domains = domainsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && this.isValidDomain(line));

    // Validate: if routing is enabled, must have at least one valid domain
    if (routingEnabled && domains.length === 0) {
      alert('Please enter at least one valid domain for routing rules, or disable routing');
      return;
    }

    // Collect auth credentials
    const username = document.getElementById('proxyUsername').value.trim();
    const password = document.getElementById('proxyPassword').value;

    // Create profile with correct nested structure
    const profile = {
      id: this.editingProfile?.id || Date.now().toString(),
      name,
      color,
      config: type === 'pac' ? createPacConfig(document.getElementById('pacUrl').value.trim()) : {
        type: type,
        host: host,
        port: parseInt(port),
        auth: { username, password },
        pacUrl: '',
        bypassList: this.editingProfile?.config?.bypassList || [],
        routingRules: {
          enabled: routingEnabled,
          mode: routingMode,
          domains: domains
        }
      },
      createdAt: this.editingProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: this.editingProfile?.tags || []
    };

    const isEditing = !!this.editingProfile;
    const profileId = profile.id;

    if (this.editingProfile) {
      const index = this.profiles.findIndex(p => p.id === this.editingProfile.id);
      this.profiles[index] = profile;
      console.log('Updating existing profile:', profile.name, 'ID:', profileId);
    } else {
      this.profiles.push(profile);
      console.log('Creating new profile:', profile.name, 'ID:', profileId);
    }

    await this.saveData();
    this.renderProfiles();
    this.hideProfileModal();

    // If the saved profile is currently active, reactivate it to apply changes
    if (isEditing) {
      console.log('Profile was edited, checking if it needs reactivation...');
      await this.reactivateIfActive(profileId);
    }
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
        pacUrl: original.config?.pacUrl || '',
        bypassList: original.config?.bypassList || original.bypassList || [],
        routingRules: original.config?.routingRules ? {
          enabled: original.config.routingRules.enabled || false,
          mode: original.config.routingRules.mode || 'whitelist',
          domains: [...(original.config.routingRules.domains || [])]
        } : {
          enabled: false,
          mode: 'whitelist',
          domains: []
        }
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

  // Export profiles as JSON file
  exportProfiles() {
    if (this.profiles.length === 0) {
      this.showStatus('No profiles to export', 'warning');
      return;
    }

    const exportData = {
      format: 'x-proxy-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      profileCount: this.profiles.length,
      profiles: this.profiles.map(p => {
        const normalized = this.normalizeProfileForSave(p);
        return {
          name: normalized.name,
          color: normalized.color,
          config: normalized.config,
          tags: normalized.tags || []
        };
      })
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `x-proxy-profiles-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showStatus(`Exported ${this.profiles.length} profile(s) successfully`, 'success');
  }

  // Handle import file selection
  async handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        this.showStatus('Invalid JSON file', 'error');
        event.target.value = '';
        return;
      }

      const validation = this.validateImportData(data);
      if (!validation.valid) {
        this.showStatus(validation.error, 'error');
        event.target.value = '';
        return;
      }

      const result = this.importProfiles(validation.profiles);
      await this.saveData();
      this.renderProfiles();

      if (validation.skipped > 0) {
        this.showStatus(`Imported ${result.count} profile(s), skipped ${validation.skipped} invalid`, 'warning');
      } else {
        this.showStatus(`Imported ${result.count} profile(s) successfully`, 'success');
      }
    } catch (error) {
      console.error('Import error:', error);
      this.showStatus('Error reading import file', 'error');
    }

    event.target.value = '';
  }

  // Validate import data structure
  validateImportData(data) {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Invalid file format' };
    }

    if (data.format !== 'x-proxy-export') {
      return { valid: false, error: 'Not a valid X-Proxy export file' };
    }

    if (typeof data.version !== 'number' || data.version > 1) {
      return { valid: false, error: 'Unsupported export version' };
    }

    if (!Array.isArray(data.profiles) || data.profiles.length === 0) {
      return { valid: false, error: 'No profiles found in import file' };
    }

    const validColors = PROFILE_COLORS.map(c => c.hex);
    const validProfiles = [];
    let skipped = 0;

    for (const profile of data.profiles) {
      // Validate required fields
      if (!profile.name || typeof profile.name !== 'string' || !profile.name.trim()) {
        skipped++;
        continue;
      }

      const config = profile.config;
      if (!config || typeof config !== 'object') {
        skipped++;
        continue;
      }

      if (!['http', 'socks5', 'pac'].includes(config.type)) {
        skipped++;
        continue;
      }

      if (config.type === 'pac') {
        if (!config.pacUrl || typeof config.pacUrl !== 'string' || !config.pacUrl.trim()) {
          skipped++;
          continue;
        }
      } else {
        if (!config.host || typeof config.host !== 'string' || !config.host.trim()) {
          skipped++;
          continue;
        }

        const port = parseInt(config.port);
        if (isNaN(port) || port < 1 || port > 65535) {
          skipped++;
          continue;
        }
      }

      // Sanitize profile
      const sanitized = {
        name: profile.name.trim(),
        color: validColors.includes(profile.color) ? profile.color : '#007AFF',
        config: config.type === 'pac' ? createPacConfig(config.pacUrl.trim()) : {
          type: config.type,
          host: config.host.trim(),
          port: parseInt(config.port),
          pacUrl: '',
          bypassList: Array.isArray(config.bypassList) ? config.bypassList : [],
          routingRules: {
            enabled: config.routingRules?.enabled === true,
            mode: ['whitelist', 'blacklist'].includes(config.routingRules?.mode) ? config.routingRules.mode : 'whitelist',
            domains: Array.isArray(config.routingRules?.domains)
              ? config.routingRules.domains.filter(d => typeof d === 'string' && d.trim() && this.isValidDomain(d.trim()))
              : []
          }
        },
        tags: Array.isArray(profile.tags) ? profile.tags : []
      };

      validProfiles.push(sanitized);
    }

    if (validProfiles.length === 0) {
      return { valid: false, error: 'No valid profiles found in import file' };
    }

    return { valid: true, profiles: validProfiles, skipped };
  }

  // Import validated profiles (append with new IDs)
  importProfiles(profiles) {
    const now = new Date().toISOString();
    for (const profile of profiles) {
      this.profiles.push({
        ...profile,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: now,
        updatedAt: now
      });
    }
    return { count: profiles.length };
  }







  // Reactivate profile if it's currently active (to apply changes immediately)
  async reactivateIfActive(profileId) {
    try {
      const result = await chrome.storage.local.get(['x-proxy-data']);
      const data = result['x-proxy-data'] || this.getDefaultData();

      // Check if this profile is currently active
      if (data.activeProfileId === profileId) {
        console.log('Profile is currently active, reactivating to apply changes...');

        // Send message to background to reactivate
        const response = await chrome.runtime.sendMessage({
          type: 'ACTIVATE_PROFILE',
          payload: { id: profileId }
        });

        if (response && response.success) {
          this.showStatus('Profile updated and reactivated successfully', 'success');
          console.log('Profile reactivated successfully');
        } else {
          console.warn('Failed to reactivate profile:', response?.error);
          this.showStatus('Profile saved, but reactivation failed. Please reactivate manually.', 'warning');
        }
      }
    } catch (error) {
      console.error('Error checking/reactivating profile:', error);
      // Don't show error to user - the save was successful, just reactivation failed
    }
  }

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
