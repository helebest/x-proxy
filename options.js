// Options Page JavaScript
class OptionsManager {
  constructor() {
    this.profiles = [];
    this.rules = [];
    this.settings = {};
    this.currentSection = 'profiles';
    this.editingProfile = null;
    this.editingRule = null;
    this.pacScript = '';
    this.init();
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.renderProfiles();
    this.renderRules();
    this.loadSettings();
    this.loadPACScript();
    this.setupPACEditor();
  }

  // Data Management
  async loadData() {
    try {
      // Load data in the same format as background service expects
      const result = await chrome.storage.local.get(['x-proxy-data']);
      const data = result['x-proxy-data'] || this.getDefaultData();
      
      this.profiles = data.profiles || [];
      this.rules = data.rules || [];
      this.settings = data.settings || this.getDefaultSettings();
      this.pacScript = data.pacScript || this.getDefaultPACScript();
      
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
      data.rules = this.rules;
      data.settings = { ...data.settings, ...this.settings };
      data.pacScript = this.pacScript;
      
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
      settings: this.getDefaultSettings(),
      rules: [],
      pacScript: this.getDefaultPACScript()
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
        auth: (config.auth || profile.auth) ? {
          username: config.auth?.username || profile.username || '',
          password: config.auth?.password || profile.password || ''
        } : undefined,
        bypassList: config.bypassList || profile.bypassList || [],
        pacUrl: config.pacUrl || profile.pacUrl
      },
      createdAt: profile.createdAt instanceof Date ? profile.createdAt.toISOString() : profile.createdAt,
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
      debugMode: false,
      autoSwitchEnabled: false
    };
  }

  getDefaultPACScript() {
    return `function FindProxyForURL(url, host) {
  // Direct connection for local addresses
  if (isPlainHostName(host) ||
      shExpMatch(host, "*.local") ||
      isInNet(dnsResolve(host), "10.0.0.0", "255.0.0.0") ||
      isInNet(dnsResolve(host), "172.16.0.0", "255.240.0.0") ||
      isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0") ||
      isInNet(dnsResolve(host), "127.0.0.0", "255.255.255.0")) {
    return "DIRECT";
  }
  
  // Default proxy
  return "PROXY proxy.example.com:8080";
}`;
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
    
    // Authentication toggle
    document.getElementById('proxyAuth').addEventListener('change', (e) => {
      document.getElementById('authDetails').style.display = e.target.checked ? 'block' : 'none';
    });

    // Rules Management
    document.getElementById('addRuleBtn').addEventListener('click', () => this.showRuleModal());
    document.getElementById('saveRuleBtn').addEventListener('click', () => this.saveRule());
    document.getElementById('cancelRuleBtn').addEventListener('click', () => this.hideRuleModal());
    document.getElementById('closeRuleModal').addEventListener('click', () => this.hideRuleModal());
    document.getElementById('enableAutoSwitch').addEventListener('change', (e) => this.toggleAutoSwitch(e));

    // PAC Script Editor
    document.getElementById('pacTemplateBtn').addEventListener('click', () => this.loadPACTemplate());
    document.getElementById('pacValidateBtn').addEventListener('click', () => this.validatePACScript());
    document.getElementById('pacSaveBtn').addEventListener('click', () => this.savePACScript());
    document.getElementById('formatPacBtn').addEventListener('click', () => this.formatPACScript());
    document.getElementById('copyPacBtn').addEventListener('click', () => this.copyPACScript());

    // Import/Export - removed importBtn, exportBtn, backupBtn, restoreBtn (features offline)

    // File inputs - removed (import/export features offline)

    // General Settings
    document.getElementById('startupEnable').addEventListener('change', (e) => {
      this.settings.startupEnable = e.target.checked;
    });
    document.getElementById('defaultProfile').addEventListener('change', (e) => {
      this.settings.defaultProfile = e.target.value;
    });
    document.getElementById('notifyChange').addEventListener('change', (e) => {
      this.settings.notifyChange = e.target.checked;
    });
    document.getElementById('notifyError').addEventListener('change', (e) => {
      this.settings.notifyError = e.target.checked;
    });
    document.getElementById('showBadge').addEventListener('change', (e) => {
      this.settings.showBadge = e.target.checked;
    });

    // Advanced Settings
    document.getElementById('connectionTimeout').addEventListener('change', (e) => {
      this.settings.connectionTimeout = parseInt(e.target.value);
    });
    document.getElementById('maxRetries').addEventListener('change', (e) => {
      this.settings.maxRetries = parseInt(e.target.value);
    });
    document.getElementById('bypassList').addEventListener('change', (e) => {
      this.settings.bypassList = e.target.value.split('\n').filter(host => host.trim());
    });
    document.getElementById('debugMode').addEventListener('change', (e) => {
      this.settings.debugMode = e.target.checked;
    });
    document.getElementById('clearStorageBtn').addEventListener('click', () => this.clearAllData());
    document.getElementById('viewLogsBtn').addEventListener('click', () => this.viewLogs());

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
      const type = config.type || profile.type || 'http';
      const host = config.host || profile.host || '';
      const port = config.port || profile.port || '';
      const hasAuth = config.auth || profile.auth;
      
      card.innerHTML = `
        <div class="profile-header">
          <div class="profile-info">
            <div class="profile-name">
              <span class="profile-color-indicator" style="background: ${profile.color}"></span>
              ${profile.name}
            </div>
            <div class="profile-type">${type.toUpperCase()}</div>
          </div>
        </div>
        <div class="profile-details">
          ${type === 'pac' ? 
            `PAC URL: ${config.pacUrl || profile.pacUrl || ''}` : 
            `${host}:${port}${hasAuth ? ' (Auth)' : ''}`
          }
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

    // Update default profile dropdown
    this.updateProfileDropdowns();
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

  updateProfileDropdowns() {
    const defaultSelect = document.getElementById('defaultProfile');
    const ruleSelect = document.getElementById('ruleProfile');
    
    // Clear existing options
    defaultSelect.innerHTML = '<option value="">System Settings</option>';
    ruleSelect.innerHTML = '<option value="direct">Direct Connection</option>';
    
    this.profiles.forEach(profile => {
      const option1 = new Option(profile.name, profile.id);
      const option2 = new Option(profile.name, profile.id);
      defaultSelect.add(option1);
      ruleSelect.add(option2);
    });
  }

  showProfileModal(profile = null) {
    this.editingProfile = profile;
    const modal = document.getElementById('profileModal');
    const title = document.getElementById('profileModalTitle');
    
    if (profile) {
      title.textContent = 'Edit Proxy Profile';
      document.getElementById('profileName').value = profile.name;
      document.getElementById('profileColor').value = profile.color;
      document.getElementById('proxyType').value = profile.type;
      
      if (profile.type === 'pac') {
        document.getElementById('pacUrl').value = profile.pacUrl;
      } else {
        document.getElementById('proxyHost').value = profile.host;
        document.getElementById('proxyPort').value = profile.port;
        document.getElementById('proxyAuth').checked = profile.auth;
        if (profile.auth) {
          document.getElementById('proxyUsername').value = profile.username;
          document.getElementById('proxyPassword').value = profile.password;
          document.getElementById('authDetails').style.display = 'block';
        }
      }
    } else {
      title.textContent = 'Add Proxy Profile';
      document.getElementById('profileForm').reset();
      document.getElementById('authDetails').style.display = 'none';
    }
    
    this.handleProxyTypeChange({ target: { value: profile?.type || 'http' } });
    modal.classList.add('show');
  }

  hideProfileModal() {
    document.getElementById('profileModal').classList.remove('show');
    this.editingProfile = null;
  }

  handleProxyTypeChange(e) {
    const isPAC = e.target.value === 'pac';
    document.getElementById('proxyDetails').style.display = isPAC ? 'none' : 'block';
    document.getElementById('pacDetails').style.display = isPAC ? 'block' : 'none';
  }

  async saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const color = document.getElementById('profileColor').value;
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
    
    if (type === 'pac') {
      profile.pacUrl = document.getElementById('pacUrl').value.trim();
      if (!profile.pacUrl) {
        alert('Please enter a PAC script URL');
        return;
      }
    } else {
      profile.host = document.getElementById('proxyHost').value.trim();
      profile.port = document.getElementById('proxyPort').value.trim();
      profile.auth = document.getElementById('proxyAuth').checked;
      
      if (!profile.host || !profile.port) {
        alert('Please enter host and port');
        return;
      }
      
      if (profile.auth) {
        profile.username = document.getElementById('proxyUsername').value;
        profile.password = document.getElementById('proxyPassword').value;
      }
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
    const duplicate = {
      ...original,
      id: Date.now().toString(),
      name: `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.profiles.push(duplicate);
    this.saveData();
    this.renderProfiles();
  }

  async deleteProfile(index) {
    if (confirm(`Are you sure you want to delete "${this.profiles[index].name}"?`)) {
      this.profiles.splice(index, 1);
      await this.saveData();
      this.renderProfiles();
    }
  }

  // Rules Management
  renderRules() {
    const container = document.getElementById('rulesList');
    container.innerHTML = '';

    if (this.rules.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 20px; text-align: center; color: #757575;">
          <p>No auto-switch rules configured</p>
          <p>Click "Add Rule" to create URL-based proxy switching rules</p>
        </div>
      `;
      return;
    }

    // Sort rules by priority
    const sortedRules = [...this.rules].sort((a, b) => b.priority - a.priority);

    sortedRules.forEach((rule, index) => {
      const item = document.createElement('div');
      item.className = 'rule-item';
      item.innerHTML = `
        <div class="rule-info">
          <div class="rule-name">${rule.name}</div>
          <div class="rule-pattern">${rule.pattern}</div>
        </div>
        <span class="rule-profile">${this.getProfileName(rule.profileId)}</span>
        <span class="rule-priority">Priority: ${rule.priority}</span>
        <div class="rule-actions">
          <label class="switch">
            <input type="checkbox" ${rule.enabled ? 'checked' : ''} 
                   data-action="toggle" data-index="${index}">
            <span class="slider"></span>
          </label>
          <button class="btn-icon" data-action="edit" data-index="${index}" title="Edit">✏️</button>
          <button class="btn-icon" data-action="delete" data-index="${index}" title="Delete">🗑️</button>
        </div>
      `;
      container.appendChild(item);
    });

    // Add event delegation for rule action buttons
    this.setupRuleActionEvents(container);
  }

  // Setup event delegation for rule action buttons
  setupRuleActionEvents(container) {
    // Remove existing event listeners to avoid duplicates
    container.removeEventListener('click', this.handleRuleAction);
    container.removeEventListener('change', this.handleRuleToggle);
    
    // Add event delegation for buttons
    this.handleRuleAction = (e) => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;
      
      const action = button.dataset.action;
      const index = parseInt(button.dataset.index);
      
      switch (action) {
        case 'edit':
          this.editRule(index);
          break;
        case 'delete':
          this.deleteRule(index);
          break;
      }
    };
    
    // Add event delegation for checkboxes
    this.handleRuleToggle = (e) => {
      const checkbox = e.target.closest('input[data-action="toggle"]');
      if (!checkbox) return;
      
      const index = parseInt(checkbox.dataset.index);
      this.toggleRule(index, checkbox.checked);
    };
    
    container.addEventListener('click', this.handleRuleAction);
    container.addEventListener('change', this.handleRuleToggle);
  }

  getProfileName(profileId) {
    const profile = this.profiles.find(p => p.id === profileId);
    return profile ? profile.name : 'Unknown';
  }

  showRuleModal(rule = null) {
    this.editingRule = rule;
    const modal = document.getElementById('ruleModal');
    const title = document.getElementById('ruleModalTitle');
    
    if (rule) {
      title.textContent = 'Edit Auto-Switch Rule';
      document.getElementById('ruleName').value = rule.name;
      document.getElementById('rulePattern').value = rule.pattern;
      document.getElementById('ruleProfile').value = rule.profileId;
      document.getElementById('rulePriority').value = rule.priority;
      document.getElementById('ruleEnabled').checked = rule.enabled;
    } else {
      title.textContent = 'Add Auto-Switch Rule';
      document.getElementById('ruleForm').reset();
    }
    
    modal.classList.add('show');
  }

  hideRuleModal() {
    document.getElementById('ruleModal').classList.remove('show');
    this.editingRule = null;
  }

  async saveRule() {
    const name = document.getElementById('ruleName').value.trim();
    const pattern = document.getElementById('rulePattern').value.trim();
    const profileId = document.getElementById('ruleProfile').value;
    const priority = parseInt(document.getElementById('rulePriority').value);
    const enabled = document.getElementById('ruleEnabled').checked;
    
    if (!name || !pattern) {
      alert('Please enter rule name and pattern');
      return;
    }
    
    const rule = {
      id: this.editingRule?.id || Date.now().toString(),
      name,
      pattern,
      profileId,
      priority,
      enabled,
      createdAt: this.editingRule?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (this.editingRule) {
      const index = this.rules.findIndex(r => r.id === this.editingRule.id);
      this.rules[index] = rule;
    } else {
      this.rules.push(rule);
    }
    
    await this.saveData();
    this.renderRules();
    this.hideRuleModal();
  }

  editRule(index) {
    this.showRuleModal(this.rules[index]);
  }

  async deleteRule(index) {
    if (confirm(`Are you sure you want to delete "${this.rules[index].name}"?`)) {
      this.rules.splice(index, 1);
      await this.saveData();
      this.renderRules();
    }
  }

  async toggleRule(index, enabled) {
    this.rules[index].enabled = enabled;
    await this.saveData();
  }

  async toggleAutoSwitch(e) {
    this.settings.autoSwitchEnabled = e.target.checked;
    await this.saveData();
  }

  // PAC Script Editor
  setupPACEditor() {
    const editor = document.getElementById('pacEditor');
    
    // Add syntax highlighting on input
    editor.addEventListener('input', () => {
      this.pacScript = editor.textContent;
      // Simple syntax highlighting (can be enhanced)
      this.highlightPACScript();
    });
  }

  loadPACScript() {
    const editor = document.getElementById('pacEditor');
    editor.textContent = this.pacScript;
    this.highlightPACScript();
  }

  highlightPACScript() {
    // This is a simplified version - for production, use a proper syntax highlighter
    const editor = document.getElementById('pacEditor');
    const code = editor.textContent;
    
    // Basic syntax highlighting patterns
    const highlighted = code
      .replace(/\b(function|return|if|else|for|while|var|const|let)\b/g, '<span class="keyword">$1</span>')
      .replace(/"([^"]*)"/g, '<span class="string">"$1"</span>')
      .replace(/'([^']*)'/g, '<span class="string">\'$1\'</span>')
      .replace(/\/\/.*$/gm, '<span class="comment">$&</span>')
      .replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>')
      .replace(/\b\d+\b/g, '<span class="number">$&</span>');
    
    // Preserve cursor position
    const selection = window.getSelection();
    let startOffset = 0;
    let shouldRestoreCursor = false;
    
    // Only try to preserve cursor if there's an active selection
    if (selection.rangeCount > 0) {
      try {
        const range = selection.getRangeAt(0);
        startOffset = range.startOffset;
        shouldRestoreCursor = true;
      } catch (e) {
        // No valid range, skip cursor preservation
      }
    }
    
    editor.innerHTML = highlighted;
    
    // Restore cursor position if we saved it
    if (shouldRestoreCursor && editor.firstChild) {
      try {
        const newRange = document.createRange();
        newRange.setStart(editor.firstChild, Math.min(startOffset, editor.firstChild.length || 0));
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch (e) {
        // Cursor restoration failed, ignore
      }
    }
  }

  loadPACTemplate() {
    if (confirm('This will replace the current PAC script. Continue?')) {
      this.pacScript = this.getDefaultPACScript();
      this.loadPACScript();
    }
  }

  validatePACScript() {
    const status = document.getElementById('pacStatus');
    try {
      // Basic validation - check if it's valid JavaScript
      new Function(this.pacScript);
      
      // Check for required function
      if (!this.pacScript.includes('FindProxyForURL')) {
        throw new Error('Missing required function: FindProxyForURL');
      }
      
      status.textContent = '✓ PAC script is valid';
      status.className = 'editor-status success';
    } catch (error) {
      status.textContent = `✗ Error: ${error.message}`;
      status.className = 'editor-status error';
    }
  }

  async savePACScript() {
    this.validatePACScript();
    await this.saveData();
  }

  formatPACScript() {
    // Basic formatting - for production, use a proper formatter
    try {
      // Simple beautification
      this.pacScript = this.pacScript
        .replace(/\{/g, ' {\n  ')
        .replace(/\}/g, '\n}')
        .replace(/;/g, ';\n  ')
        .replace(/\n\s*\n/g, '\n');
      
      this.loadPACScript();
    } catch (error) {
      console.error('Error formatting PAC script:', error);
    }
  }

  async copyPACScript() {
    try {
      await navigator.clipboard.writeText(this.pacScript);
      this.showStatus('PAC script copied to clipboard', 'success');
    } catch (error) {
      console.error('Error copying PAC script:', error);
      this.showStatus('Failed to copy PAC script', 'error');
    }
  }

  // Settings Management
  loadSettings() {
    document.getElementById('startupEnable').checked = this.settings.startupEnable;
    document.getElementById('defaultProfile').value = this.settings.defaultProfile;
    document.getElementById('notifyChange').checked = this.settings.notifyChange;
    document.getElementById('notifyError').checked = this.settings.notifyError;
    document.getElementById('showBadge').checked = this.settings.showBadge;
    document.getElementById('connectionTimeout').value = this.settings.connectionTimeout;
    document.getElementById('maxRetries').value = this.settings.maxRetries;
    document.getElementById('bypassList').value = this.settings.bypassList.join('\n');
    document.getElementById('debugMode').checked = this.settings.debugMode;
    document.getElementById('enableAutoSwitch').checked = this.settings.autoSwitchEnabled;
  }

  // Import/Export methods removed (features offline)






  async clearAllData() {
    if (confirm('This will delete all settings, profiles, and rules. Are you sure?')) {
      if (confirm('This action cannot be undone. Please confirm again.')) {
        try {
          await chrome.storage.local.clear();
          this.profiles = [];
          this.rules = [];
          this.settings = this.getDefaultSettings();
          this.pacScript = this.getDefaultPACScript();
          
          this.renderProfiles();
          this.renderRules();
          this.loadSettings();
          this.loadPACScript();
          
          this.showStatus('All data cleared', 'success');
        } catch (error) {
          console.error('Error clearing data:', error);
          this.showStatus('Failed to clear data', 'error');
        }
      }
    }
  }

  viewLogs() {
    chrome.storage.local.get('logs', (data) => {
      const logs = data.logs || [];
      console.log('Debug Logs:', logs);
      alert('Debug logs have been printed to the console. Press F12 to view.');
    });
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
