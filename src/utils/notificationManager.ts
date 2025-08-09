// Notification Manager Module for X-Proxy
// Provides comprehensive notification system for proxy events and alerts

interface NotificationConfig {
  enabled: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  inAppNotifications: boolean;
  logNotifications: boolean;
  priority: {
    error: boolean;
    warning: boolean;
    info: boolean;
    success: boolean;
  };
}

interface NotificationOptions {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  icon?: string;
  priority?: 'high' | 'normal' | 'low';
  persistent?: boolean;
  actions?: NotificationAction[];
  data?: any;
  duration?: number;
  sound?: string;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface NotificationHistory {
  id: string;
  timestamp: Date;
  notification: NotificationOptions;
  status: 'shown' | 'clicked' | 'dismissed' | 'failed';
  clickAction?: string;
}

export class NotificationManager {
  private config: NotificationConfig;
  private history: NotificationHistory[] = [];
  private activeNotifications: Map<string, chrome.notifications.NotificationOptions> = new Map();
  private maxHistory: number = 1000;
  private soundCache: Map<string, HTMLAudioElement> = new Map();
  private notificationQueue: NotificationOptions[] = [];
  private isProcessingQueue: boolean = false;

  constructor() {
    this.config = this.getDefaultConfig();
    this.loadConfig();
    this.setupEventListeners();
    this.initializeSounds();
  }

  // Get default configuration
  private getDefaultConfig(): NotificationConfig {
    return {
      enabled: true,
      soundEnabled: true,
      desktopNotifications: true,
      inAppNotifications: true,
      logNotifications: true,
      priority: {
        error: true,
        warning: true,
        info: true,
        success: true
      }
    };
  }

  // Load configuration from storage
  private async loadConfig(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('notificationConfig');
      if (result.notificationConfig) {
        this.config = { ...this.config, ...result.notificationConfig };
      }
    } catch (error) {
      console.error('Error loading notification config:', error);
    }
  }

  // Save configuration to storage
  private async saveConfig(): Promise<void> {
    try {
      await chrome.storage.local.set({ notificationConfig: this.config });
    } catch (error) {
      console.error('Error saving notification config:', error);
    }
  }

  // Initialize sound effects
  private initializeSounds(): void {
    const sounds = {
      success: 'data:audio/wav;base64,UklGRmQFAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoFAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGHzvLZfjAAGGS47OmZSgwMUqzn77FlFAU8k9n1y3obCAAAAAA',
      error: 'data:audio/wav;base64,UklGRkQEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAEAADw/wAA8P8AAPz/AAD8/wAA/P8AAAD/AAAA/wAABP8AAAD/AAAA/wAABP8AAAj/AAAI/wAACP8AAAD/',
      warning: 'data:audio/wav;base64,UklGRpQCAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoCAAC4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4',
      info: 'data:audio/wav;base64,UklGRhwCAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YfgBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
    };

    Object.entries(sounds).forEach(([type, dataUrl]) => {
      const audio = new Audio(dataUrl);
      audio.volume = 0.5;
      this.soundCache.set(type, audio);
    });
  }

  // Setup event listeners
  private setupEventListeners(): void {
    // Listen for notification clicks
    chrome.notifications.onClicked.addListener((notificationId) => {
      this.handleNotificationClick(notificationId);
    });

    // Listen for notification button clicks
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      this.handleNotificationButtonClick(notificationId, buttonIndex);
    });

    // Listen for notification closed
    chrome.notifications.onClosed.addListener((notificationId, byUser) => {
      this.handleNotificationClosed(notificationId, byUser);
    });

    // Listen for runtime messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'showNotification') {
        this.show(message.options);
      } else if (message.action === 'getNotificationHistory') {
        sendResponse(this.getHistory());
      }
    });
  }

  // Show notification
  public async show(options: NotificationOptions): Promise<string | null> {
    if (!this.config.enabled) return null;
    if (!this.shouldShowNotification(options.type)) return null;

    const notificationId = this.generateId();

    // Add to queue if needed
    if (this.notificationQueue.length > 0 || this.isProcessingQueue) {
      this.notificationQueue.push(options);
      this.processQueue();
      return notificationId;
    }

    try {
      // Play sound if enabled
      if (this.config.soundEnabled && options.sound !== 'none') {
        this.playSound(options.type);
      }

      // Show desktop notification
      if (this.config.desktopNotifications) {
        await this.showDesktopNotification(notificationId, options);
      }

      // Show in-app notification
      if (this.config.inAppNotifications) {
        this.showInAppNotification(options);
      }

      // Log notification
      if (this.config.logNotifications) {
        this.logNotification(notificationId, options);
      }

      // Add to history
      this.addToHistory(notificationId, options, 'shown');

      return notificationId;
    } catch (error) {
      console.error('Error showing notification:', error);
      this.addToHistory(notificationId, options, 'failed');
      return null;
    }
  }

  // Show desktop notification
  private async showDesktopNotification(
    notificationId: string, 
    options: NotificationOptions
  ): Promise<void> {
    const chromeOptions: chrome.notifications.NotificationOptions = {
      type: 'basic',
      iconUrl: options.icon || this.getDefaultIcon(options.type),
      title: options.title,
      message: options.message,
      priority: this.mapPriority(options.priority),
      requireInteraction: options.persistent || false
    };

    // Add buttons if provided
    if (options.actions && options.actions.length > 0) {
      chromeOptions.buttons = options.actions.slice(0, 2).map(action => ({
        title: action.title,
        iconUrl: action.icon
      }));
    }

    // Store notification data
    this.activeNotifications.set(notificationId, chromeOptions);

    // Create notification
    await new Promise<void>((resolve, reject) => {
      chrome.notifications.create(notificationId, chromeOptions, (id) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });

    // Auto-dismiss if duration is set
    if (options.duration && !options.persistent) {
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, options.duration);
    }
  }

  // Show in-app notification
  private showInAppNotification(options: NotificationOptions): void {
    // Send message to content scripts or popup
    chrome.runtime.sendMessage({
      action: 'inAppNotification',
      notification: options
    });

    // Also dispatch custom event if in popup or options page
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('inAppNotification', {
        detail: options
      });
      window.dispatchEvent(event);
    }
  }

  // Play sound
  private playSound(type: string): void {
    const audio = this.soundCache.get(type);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(error => {
        console.error('Error playing notification sound:', error);
      });
    }
  }

  // Log notification
  private logNotification(id: string, options: NotificationOptions): void {
    chrome.runtime.sendMessage({
      action: 'log',
      level: options.type === 'error' ? 'error' : 'info',
      category: 'system',
      action: 'Notification',
      details: {
        id,
        title: options.title,
        message: options.message,
        type: options.type
      }
    });
  }

  // Handle notification click
  private handleNotificationClick(notificationId: string): void {
    const historyEntry = this.history.find(h => h.id === notificationId);
    if (historyEntry) {
      historyEntry.status = 'clicked';
      
      // Handle click action
      if (historyEntry.notification.data?.action) {
        this.executeAction(historyEntry.notification.data.action);
      }
    }

    // Clear the notification
    chrome.notifications.clear(notificationId);
    this.activeNotifications.delete(notificationId);
  }

  // Handle notification button click
  private handleNotificationButtonClick(notificationId: string, buttonIndex: number): void {
    const historyEntry = this.history.find(h => h.id === notificationId);
    if (historyEntry && historyEntry.notification.actions) {
      const action = historyEntry.notification.actions[buttonIndex];
      if (action) {
        historyEntry.clickAction = action.action;
        this.executeAction(action.action);
      }
    }

    // Clear the notification
    chrome.notifications.clear(notificationId);
    this.activeNotifications.delete(notificationId);
  }

  // Handle notification closed
  private handleNotificationClosed(notificationId: string, byUser: boolean): void {
    const historyEntry = this.history.find(h => h.id === notificationId);
    if (historyEntry && historyEntry.status === 'shown') {
      historyEntry.status = byUser ? 'dismissed' : 'dismissed';
    }

    this.activeNotifications.delete(notificationId);
  }

  // Execute action
  private executeAction(action: string): void {
    // Parse and execute the action
    if (action.startsWith('open:')) {
      const url = action.substring(5);
      chrome.tabs.create({ url });
    } else if (action.startsWith('message:')) {
      const message = JSON.parse(action.substring(8));
      chrome.runtime.sendMessage(message);
    } else {
      // Send as generic action
      chrome.runtime.sendMessage({ action });
    }
  }

  // Process notification queue
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.notificationQueue.length > 0) {
      const options = this.notificationQueue.shift()!;
      await this.show(options);
      
      // Small delay between notifications
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.isProcessingQueue = false;
  }

  // Should show notification based on type
  private shouldShowNotification(type: string): boolean {
    return this.config.priority[type as keyof typeof this.config.priority] || false;
  }

  // Get default icon for type
  private getDefaultIcon(type: string): string {
    const icons: Record<string, string> = {
      error: '/icons/error-48.png',
      warning: '/icons/warning-48.png',
      info: '/icons/info-48.png',
      success: '/icons/success-48.png'
    };
    return icons[type] || '/icons/icon-48.png';
  }

  // Map priority
  private mapPriority(priority?: string): number {
    const priorities: Record<string, number> = {
      high: 2,
      normal: 1,
      low: 0
    };
    return priorities[priority || 'normal'] || 1;
  }

  // Generate unique ID
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add to history
  private addToHistory(
    id: string, 
    notification: NotificationOptions, 
    status: 'shown' | 'failed'
  ): void {
    this.history.push({
      id,
      timestamp: new Date(),
      notification,
      status
    });

    // Trim history
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    // Save history periodically
    this.saveHistory();
  }

  // Save history
  private async saveHistory(): Promise<void> {
    try {
      await chrome.storage.local.set({ 
        notificationHistory: this.history.slice(-100) // Save only recent 100
      });
    } catch (error) {
      console.error('Error saving notification history:', error);
    }
  }

  // Get history
  public getHistory(filter?: {
    type?: string;
    startDate?: Date;
    endDate?: Date;
  }): NotificationHistory[] {
    let filtered = [...this.history];

    if (filter) {
      if (filter.type) {
        filtered = filtered.filter(h => h.notification.type === filter.type);
      }
      if (filter.startDate) {
        filtered = filtered.filter(h => h.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        filtered = filtered.filter(h => h.timestamp <= filter.endDate!);
      }
    }

    return filtered;
  }

  // Clear history
  public clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }

  // Update configuration
  public updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
  }

  // Get configuration
  public getConfig(): NotificationConfig {
    return { ...this.config };
  }

  // Proxy-specific notifications
  public notifyProxySwitch(from: string, to: string): void {
    this.show({
      title: 'Proxy Switched',
      message: `Changed from ${from} to ${to}`,
      type: 'info',
      icon: '/icons/proxy-48.png',
      duration: 3000
    });
  }

  public notifyProxyError(proxy: string, error: string): void {
    this.show({
      title: 'Proxy Error',
      message: `${proxy}: ${error}`,
      type: 'error',
      icon: '/icons/error-48.png',
      persistent: true,
      actions: [
        { action: 'message:{"action":"openProxySettings"}', title: 'Settings' },
        { action: 'message:{"action":"disableProxy"}', title: 'Disable' }
      ]
    });
  }

  public notifyProxyTestResult(proxy: string, success: boolean, details?: string): void {
    this.show({
      title: 'Proxy Test',
      message: success 
        ? `${proxy} is working properly${details ? `: ${details}` : ''}`
        : `${proxy} test failed${details ? `: ${details}` : ''}`,
      type: success ? 'success' : 'error',
      duration: 5000
    });
  }

  public notifyRuleMatch(url: string, rule: string, proxy: string): void {
    if (this.config.priority.info) {
      this.show({
        title: 'Auto-Switch Rule',
        message: `Applied "${rule}" rule for ${new URL(url).hostname} → ${proxy}`,
        type: 'info',
        duration: 2000
      });
    }
  }

  public notifyPerformanceAlert(metric: string, value: number, threshold: number): void {
    this.show({
      title: 'Performance Alert',
      message: `${metric} is ${value} (threshold: ${threshold})`,
      type: 'warning',
      icon: '/icons/warning-48.png',
      priority: 'high',
      actions: [
        { action: 'message:{"action":"viewPerformance"}', title: 'View Details' }
      ]
    });
  }

  // Batch notifications
  public showBatch(notifications: NotificationOptions[]): void {
    notifications.forEach(notification => {
      this.notificationQueue.push(notification);
    });
    this.processQueue();
  }

  // Test notification
  public test(): void {
    this.show({
      title: 'Test Notification',
      message: 'This is a test notification from X-Proxy',
      type: 'info',
      duration: 5000,
      actions: [
        { action: 'message:{"action":"test"}', title: 'Test Action' }
      ]
    });
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();
