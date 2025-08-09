// Keyboard Shortcuts Manager for X-Proxy
// Provides comprehensive keyboard navigation and quick switching capabilities

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  action: () => void | Promise<void>;
  global?: boolean;
}

interface ShortcutCategory {
  name: string;
  shortcuts: ShortcutConfig[];
}

export class KeyboardShortcutsManager {
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private enabled: boolean = true;
  private globalShortcuts: Map<string, string> = new Map();
  private customShortcuts: Map<string, ShortcutConfig> = new Map();
  private activeModifiers: Set<string> = new Set();

  constructor() {
    this.initializeDefaultShortcuts();
    this.loadCustomShortcuts();
    this.attachEventListeners();
  }

  // Initialize default keyboard shortcuts
  private initializeDefaultShortcuts(): void {
    const defaultShortcuts: ShortcutConfig[] = [
      // Quick switching
      {
        key: 'd',
        ctrl: true,
        description: 'Switch to direct connection',
        action: () => this.switchToDirectConnection()
      },
      {
        key: 's',
        ctrl: true,
        description: 'Switch to system proxy',
        action: () => this.switchToSystemProxy()
      },
      {
        key: 'p',
        ctrl: true,
        description: 'Open proxy profiles',
        action: () => this.openProxyProfiles()
      },
      // Profile navigation
      {
        key: '1',
        alt: true,
        description: 'Switch to profile 1',
        action: () => this.switchToProfile(0)
      },
      {
        key: '2',
        alt: true,
        description: 'Switch to profile 2',
        action: () => this.switchToProfile(1)
      },
      {
        key: '3',
        alt: true,
        description: 'Switch to profile 3',
        action: () => this.switchToProfile(2)
      },
      {
        key: '4',
        alt: true,
        description: 'Switch to profile 4',
        action: () => this.switchToProfile(3)
      },
      {
        key: '5',
        alt: true,
        description: 'Switch to profile 5',
        action: () => this.switchToProfile(4)
      },
      // Navigation
      {
        key: 'ArrowUp',
        description: 'Navigate up in profile list',
        action: () => this.navigateProfiles('up')
      },
      {
        key: 'ArrowDown',
        description: 'Navigate down in profile list',
        action: () => this.navigateProfiles('down')
      },
      {
        key: 'Enter',
        description: 'Activate selected profile',
        action: () => this.activateSelectedProfile()
      },
      // Actions
      {
        key: 'n',
        ctrl: true,
        description: 'Create new profile',
        action: () => this.createNewProfile()
      },
      {
        key: 'e',
        ctrl: true,
        description: 'Edit current profile',
        action: () => this.editCurrentProfile()
      },
      {
        key: 't',
        ctrl: true,
        description: 'Test current proxy',
        action: () => this.testCurrentProxy()
      },
      {
        key: 'l',
        ctrl: true,
        description: 'View connection logs',
        action: () => this.viewConnectionLogs()
      },
      {
        key: 'o',
        ctrl: true,
        description: 'Open options',
        action: () => this.openOptions()
      },
      // Utility
      {
        key: 'r',
        ctrl: true,
        shift: true,
        description: 'Reload extension',
        action: () => this.reloadExtension()
      },
      {
        key: '/',
        description: 'Open command palette',
        action: () => this.openCommandPalette()
      },
      {
        key: '?',
        shift: true,
        description: 'Show keyboard shortcuts help',
        action: () => this.showShortcutsHelp()
      },
      {
        key: 'Escape',
        description: 'Close dialogs/Cancel',
        action: () => this.closeActiveDialog()
      },
      // Quick search
      {
        key: 'f',
        ctrl: true,
        description: 'Search profiles',
        action: () => this.searchProfiles()
      },
      {
        key: 'Tab',
        description: 'Cycle through profiles',
        action: () => this.cycleProfiles()
      },
      {
        key: 'Tab',
        shift: true,
        description: 'Reverse cycle through profiles',
        action: () => this.reverseCycleProfiles()
      }
    ];

    defaultShortcuts.forEach(shortcut => {
      const key = this.generateShortcutKey(shortcut);
      this.shortcuts.set(key, shortcut);
    });
  }

  // Load custom shortcuts from storage
  private async loadCustomShortcuts(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('customShortcuts');
      if (result.customShortcuts) {
        Object.entries(result.customShortcuts).forEach(([key, config]) => {
          this.customShortcuts.set(key, config as ShortcutConfig);
        });
      }
    } catch (error) {
      console.error('Error loading custom shortcuts:', error);
    }
  }

  // Save custom shortcuts to storage
  private async saveCustomShortcuts(): Promise<void> {
    try {
      const shortcuts = Object.fromEntries(this.customShortcuts);
      await chrome.storage.local.set({ customShortcuts: shortcuts });
    } catch (error) {
      console.error('Error saving custom shortcuts:', error);
    }
  }

  // Generate unique key for shortcut
  private generateShortcutKey(config: ShortcutConfig): string {
    const modifiers = [];
    if (config.ctrl) modifiers.push('ctrl');
    if (config.alt) modifiers.push('alt');
    if (config.shift) modifiers.push('shift');
    if (config.meta) modifiers.push('meta');
    modifiers.push(config.key.toLowerCase());
    return modifiers.join('+');
  }

  // Attach event listeners
  private attachEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Listen for global shortcuts if available
    if (chrome.commands) {
      chrome.commands.onCommand.addListener(this.handleGlobalCommand.bind(this));
    }
  }

  // Handle keydown events
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    // Track modifier keys
    if (event.ctrlKey) this.activeModifiers.add('ctrl');
    if (event.altKey) this.activeModifiers.add('alt');
    if (event.shiftKey) this.activeModifiers.add('shift');
    if (event.metaKey) this.activeModifiers.add('meta');

    // Check if we're in an input field
    const target = event.target as HTMLElement;
    if (this.isInputElement(target) && !this.isGlobalShortcut(event)) {
      return;
    }

    const shortcutKey = this.getShortcutKeyFromEvent(event);
    const shortcut = this.shortcuts.get(shortcutKey) || this.customShortcuts.get(shortcutKey);

    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      this.executeShortcut(shortcut);
    }
  }

  // Handle keyup events
  private handleKeyUp(event: KeyboardEvent): void {
    // Clear modifier keys
    if (!event.ctrlKey) this.activeModifiers.delete('ctrl');
    if (!event.altKey) this.activeModifiers.delete('alt');
    if (!event.shiftKey) this.activeModifiers.delete('shift');
    if (!event.metaKey) this.activeModifiers.delete('meta');
  }

  // Handle global commands
  private handleGlobalCommand(command: string): void {
    const action = this.globalShortcuts.get(command);
    if (action) {
      this.executeGlobalAction(action);
    }
  }

  // Get shortcut key from event
  private getShortcutKeyFromEvent(event: KeyboardEvent): string {
    const modifiers = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    if (event.metaKey) modifiers.push('meta');
    modifiers.push(event.key.toLowerCase());
    return modifiers.join('+');
  }

  // Check if element is an input field
  private isInputElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    return tagName === 'input' || 
           tagName === 'textarea' || 
           tagName === 'select' ||
           element.contentEditable === 'true';
  }

  // Check if shortcut is global
  private isGlobalShortcut(event: KeyboardEvent): boolean {
    // Certain shortcuts should work even in input fields
    return event.key === 'Escape' || 
           (event.ctrlKey && event.key === 'Enter');
  }

  // Execute shortcut action
  private async executeShortcut(shortcut: ShortcutConfig): Promise<void> {
    try {
      await shortcut.action();
      this.logShortcutUsage(shortcut);
    } catch (error) {
      console.error('Error executing shortcut:', error);
      this.showNotification('Shortcut action failed', 'error');
    }
  }

  // Execute global action
  private executeGlobalAction(action: string): void {
    // Map global actions to specific functions
    const actions: Record<string, () => void> = {
      'toggle-proxy': () => this.toggleProxy(),
      'quick-switch': () => this.quickSwitch(),
      'open-popup': () => this.openPopup()
    };

    const handler = actions[action];
    if (handler) {
      handler();
    }
  }

  // Log shortcut usage for analytics
  private logShortcutUsage(shortcut: ShortcutConfig): void {
    chrome.storage.local.get('shortcutStats', (data) => {
      const stats = data.shortcutStats || {};
      const key = this.generateShortcutKey(shortcut);
      stats[key] = (stats[key] || 0) + 1;
      chrome.storage.local.set({ shortcutStats: stats });
    });
  }

  // Shortcut actions
  private async switchToDirectConnection(): Promise<void> {
    await chrome.runtime.sendMessage({ action: 'setProxy', mode: 'direct' });
    this.showNotification('Switched to direct connection', 'success');
  }

  private async switchToSystemProxy(): Promise<void> {
    await chrome.runtime.sendMessage({ action: 'setProxy', mode: 'system' });
    this.showNotification('Switched to system proxy', 'success');
  }

  private async switchToProfile(index: number): Promise<void> {
    const profiles = await this.getProfiles();
    if (profiles[index]) {
      await chrome.runtime.sendMessage({ 
        action: 'setProxy', 
        mode: 'profile', 
        profileId: profiles[index].id 
      });
      this.showNotification(`Switched to ${profiles[index].name}`, 'success');
    }
  }

  private openProxyProfiles(): void {
    chrome.runtime.sendMessage({ action: 'openProfiles' });
  }

  private navigateProfiles(direction: 'up' | 'down'): void {
    const event = new CustomEvent('navigateProfiles', { detail: { direction } });
    document.dispatchEvent(event);
  }

  private activateSelectedProfile(): void {
    const event = new CustomEvent('activateProfile');
    document.dispatchEvent(event);
  }

  private createNewProfile(): void {
    chrome.runtime.sendMessage({ action: 'createProfile' });
  }

  private editCurrentProfile(): void {
    chrome.runtime.sendMessage({ action: 'editProfile' });
  }

  private async testCurrentProxy(): Promise<void> {
    chrome.runtime.sendMessage({ action: 'testProxy' });
  }

  private viewConnectionLogs(): void {
    chrome.runtime.sendMessage({ action: 'viewLogs' });
  }

  private openOptions(): void {
    chrome.runtime.openOptionsPage();
  }

  private reloadExtension(): void {
    chrome.runtime.reload();
  }

  private openCommandPalette(): void {
    const event = new CustomEvent('openCommandPalette');
    document.dispatchEvent(event);
  }

  private showShortcutsHelp(): void {
    this.displayShortcutsModal();
  }

  private closeActiveDialog(): void {
    const event = new CustomEvent('closeDialog');
    document.dispatchEvent(event);
  }

  private searchProfiles(): void {
    const event = new CustomEvent('searchProfiles');
    document.dispatchEvent(event);
  }

  private cycleProfiles(): void {
    const event = new CustomEvent('cycleProfiles', { detail: { reverse: false } });
    document.dispatchEvent(event);
  }

  private reverseCycleProfiles(): void {
    const event = new CustomEvent('cycleProfiles', { detail: { reverse: true } });
    document.dispatchEvent(event);
  }

  private toggleProxy(): void {
    chrome.runtime.sendMessage({ action: 'toggleProxy' });
  }

  private quickSwitch(): void {
    const event = new CustomEvent('quickSwitch');
    document.dispatchEvent(event);
  }

  private openPopup(): void {
    chrome.action.openPopup();
  }

  // Get profiles from storage
  private async getProfiles(): Promise<any[]> {
    const result = await chrome.storage.local.get('profiles');
    return result.profiles || [];
  }

  // Display shortcuts modal
  private displayShortcutsModal(): void {
    const categories = this.getShortcutCategories();
    const modalHtml = this.generateShortcutsModalHTML(categories);
    this.showModal(modalHtml);
  }

  // Get organized shortcut categories
  private getShortcutCategories(): ShortcutCategory[] {
    const categories: Map<string, ShortcutConfig[]> = new Map();
    
    // Organize shortcuts by category
    this.shortcuts.forEach(shortcut => {
      let category = 'General';
      if (shortcut.description.includes('profile') || shortcut.description.includes('Profile')) {
        category = 'Profiles';
      } else if (shortcut.description.includes('Navigate') || shortcut.description.includes('search')) {
        category = 'Navigation';
      } else if (shortcut.description.includes('Switch')) {
        category = 'Quick Switch';
      }
      
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(shortcut);
    });

    return Array.from(categories.entries()).map(([name, shortcuts]) => ({
      name,
      shortcuts
    }));
  }

  // Generate shortcuts modal HTML
  private generateShortcutsModalHTML(categories: ShortcutCategory[]): string {
    let html = '<div class="shortcuts-modal"><h2>Keyboard Shortcuts</h2>';
    
    categories.forEach(category => {
      html += `<div class="shortcut-category">
        <h3>${category.name}</h3>
        <ul class="shortcuts-list">`;
      
      category.shortcuts.forEach(shortcut => {
        const keys = [];
        if (shortcut.ctrl) keys.push('Ctrl');
        if (shortcut.alt) keys.push('Alt');
        if (shortcut.shift) keys.push('Shift');
        if (shortcut.meta) keys.push('Meta');
        keys.push(shortcut.key);
        
        html += `<li class="shortcut-item">
          <span class="shortcut-keys">${keys.join(' + ')}</span>
          <span class="shortcut-description">${shortcut.description}</span>
        </li>`;
      });
      
      html += '</ul></div>';
    });
    
    html += '</div>';
    return html;
  }

  // Show modal
  private showModal(content: string): void {
    const modal = document.createElement('div');
    modal.className = 'keyboard-shortcuts-modal-overlay';
    modal.innerHTML = content;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    document.body.appendChild(modal);
  }

  // Show notification
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    chrome.runtime.sendMessage({
      action: 'showNotification',
      message,
      type
    });
  }

  // Public methods
  public enable(): void {
    this.enabled = true;
  }

  public disable(): void {
    this.enabled = false;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public addCustomShortcut(config: ShortcutConfig): void {
    const key = this.generateShortcutKey(config);
    this.customShortcuts.set(key, config);
    this.saveCustomShortcuts();
  }

  public removeCustomShortcut(key: string): void {
    this.customShortcuts.delete(key);
    this.saveCustomShortcuts();
  }

  public getShortcuts(): Map<string, ShortcutConfig> {
    return new Map([...this.shortcuts, ...this.customShortcuts]);
  }

  public resetToDefaults(): void {
    this.customShortcuts.clear();
    this.saveCustomShortcuts();
    this.initializeDefaultShortcuts();
  }
}

// Export singleton instance
export const keyboardShortcuts = new KeyboardShortcutsManager();
