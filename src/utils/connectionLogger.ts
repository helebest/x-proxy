// Connection Logger Module for X-Proxy
// Provides comprehensive logging and monitoring of proxy connections and events

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  category: 'connection' | 'proxy' | 'rule' | 'system' | 'performance';
  action: string;
  details: any;
  metadata?: {
    url?: string;
    method?: string;
    status?: number;
    duration?: number;
    proxyUsed?: string;
    error?: string;
    ip?: string;
    userAgent?: string;
  };
}

interface LogFilter {
  level?: string[];
  category?: string[];
  startDate?: Date;
  endDate?: Date;
  searchText?: string;
  proxyId?: string;
}

interface LogStatistics {
  totalLogs: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  recentErrors: LogEntry[];
  averageResponseTime: number;
  successRate: number;
}

export class ConnectionLogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 10000;
  private storageKey: string = 'connectionLogs';
  private listeners: Set<(log: LogEntry) => void> = new Set();
  private isEnabled: boolean = true;
  private logLevel: string = 'info';

  constructor() {
    this.loadLogs();
    this.setupEventListeners();
    this.startPeriodicCleanup();
  }

  // Load logs from storage
  private async loadLogs(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      if (result[this.storageKey]) {
        this.logs = result[this.storageKey].map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  }

  // Save logs to storage
  private async saveLogs(): Promise<void> {
    try {
      // Keep only recent logs
      const logsToSave = this.logs.slice(-this.maxLogs);
      await chrome.storage.local.set({ [this.storageKey]: logsToSave });
    } catch (error) {
      console.error('Error saving logs:', error);
    }
  }

  // Setup event listeners
  private setupEventListeners(): void {
    // Listen for proxy changes
    if (chrome.proxy?.onProxyError) {
      chrome.proxy.onProxyError.addListener((details) => {
        this.logProxyError(details);
      });
    }

    // Listen for web navigation events
    if (chrome.webNavigation) {
      chrome.webNavigation.onCompleted.addListener((details) => {
        if (details.frameId === 0) {
          this.logNavigation(details);
        }
      });

      chrome.webNavigation.onErrorOccurred.addListener((details) => {
        if (details.frameId === 0) {
          this.logNavigationError(details);
        }
      });
    }

    // Listen for web request events
    if (chrome.webRequest) {
      chrome.webRequest.onBeforeRequest.addListener(
        (details) => this.logRequest(details),
        { urls: ['<all_urls>'] }
      );

      chrome.webRequest.onCompleted.addListener(
        (details) => this.logRequestComplete(details),
        { urls: ['<all_urls>'] }
      );

      chrome.webRequest.onErrorOccurred.addListener(
        (details) => this.logRequestError(details),
        { urls: ['<all_urls>'] }
      );
    }

    // Listen for runtime messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'log') {
        this.log(message.level, message.category, message.action, message.details);
      }
    });
  }

  // Log proxy error
  private logProxyError(details: any): void {
    this.log('error', 'proxy', 'Proxy Error', {
      error: details.error,
      details: details.details,
      fatal: details.fatal
    });
  }

  // Log navigation
  private logNavigation(details: chrome.webNavigation.WebNavigationFramedCallbackDetails): void {
    this.log('info', 'connection', 'Page Loaded', {
      url: details.url,
      tabId: details.tabId,
      timeStamp: details.timeStamp
    });
  }

  // Log navigation error
  private logNavigationError(details: chrome.webNavigation.WebNavigationFramedErrorCallbackDetails): void {
    this.log('error', 'connection', 'Navigation Error', {
      url: details.url,
      error: details.error,
      tabId: details.tabId
    });
  }

  // Log request
  private logRequest(details: chrome.webRequest.WebRequestBodyDetails): void {
    if (this.shouldLogRequest(details)) {
      this.log('debug', 'connection', 'Request Started', {
        url: details.url,
        method: details.method,
        type: details.type,
        requestId: details.requestId
      });
    }
  }

  // Log request completion
  private logRequestComplete(details: chrome.webRequest.WebResponseCacheDetails): void {
    if (this.shouldLogRequest(details)) {
      this.log('debug', 'connection', 'Request Completed', {
        url: details.url,
        method: details.method,
        statusCode: details.statusCode,
        statusLine: details.statusLine,
        requestId: details.requestId,
        fromCache: details.fromCache
      });
    }
  }

  // Log request error
  private logRequestError(details: chrome.webRequest.WebResponseErrorDetails): void {
    this.log('error', 'connection', 'Request Failed', {
      url: details.url,
      method: details.method,
      error: details.error,
      requestId: details.requestId
    });
  }

  // Check if request should be logged
  private shouldLogRequest(details: any): boolean {
    // Filter out certain types of requests to reduce noise
    const ignoredTypes = ['image', 'stylesheet', 'font', 'media'];
    return !ignoredTypes.includes(details.type);
  }

  // Main logging function
  public log(
    level: 'info' | 'warning' | 'error' | 'debug',
    category: 'connection' | 'proxy' | 'rule' | 'system' | 'performance',
    action: string,
    details: any,
    metadata?: any
  ): void {
    if (!this.isEnabled) return;
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      category,
      action,
      details,
      metadata
    };

    this.logs.push(entry);
    this.notifyListeners(entry);
    
    // Trim logs if necessary
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Save periodically
    this.scheduleSave();
  }

  // Check if should log based on level
  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warning', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Notify listeners
  private notifyListeners(entry: LogEntry): void {
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (error) {
        console.error('Error notifying log listener:', error);
      }
    });
  }

  // Schedule save (debounced)
  private saveTimeout: NodeJS.Timeout | null = null;
  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveLogs();
    }, 1000);
  }

  // Get logs with filtering
  public getLogs(filter?: LogFilter): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level && filter.level.length > 0) {
        filteredLogs = filteredLogs.filter(log => filter.level!.includes(log.level));
      }

      if (filter.category && filter.category.length > 0) {
        filteredLogs = filteredLogs.filter(log => filter.category!.includes(log.category));
      }

      if (filter.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startDate!);
      }

      if (filter.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endDate!);
      }

      if (filter.searchText) {
        const searchLower = filter.searchText.toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.action.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.details).toLowerCase().includes(searchLower)
        );
      }

      if (filter.proxyId) {
        filteredLogs = filteredLogs.filter(log => 
          log.metadata?.proxyUsed === filter.proxyId
        );
      }
    }

    return filteredLogs;
  }

  // Get log statistics
  public getStatistics(filter?: LogFilter): LogStatistics {
    const logs = this.getLogs(filter);
    
    const stats: LogStatistics = {
      totalLogs: logs.length,
      byLevel: {},
      byCategory: {},
      recentErrors: [],
      averageResponseTime: 0,
      successRate: 0
    };

    // Count by level
    logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    });

    // Get recent errors
    stats.recentErrors = logs
      .filter(log => log.level === 'error')
      .slice(-10);

    // Calculate average response time
    const responseTimes = logs
      .filter(log => log.metadata?.duration)
      .map(log => log.metadata!.duration!);
    
    if (responseTimes.length > 0) {
      stats.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }

    // Calculate success rate
    const requests = logs.filter(log => log.category === 'connection');
    const successful = requests.filter(log => log.level !== 'error');
    stats.successRate = requests.length > 0 ? (successful.length / requests.length) * 100 : 100;

    return stats;
  }

  // Export logs
  public exportLogs(filter?: LogFilter): string {
    const logs = this.getLogs(filter);
    return JSON.stringify(logs, null, 2);
  }

  // Export as CSV
  public exportAsCSV(filter?: LogFilter): string {
    const logs = this.getLogs(filter);
    const headers = ['Timestamp', 'Level', 'Category', 'Action', 'Details', 'URL', 'Status', 'Duration'];
    
    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.level,
      log.category,
      log.action,
      JSON.stringify(log.details),
      log.metadata?.url || '',
      log.metadata?.status || '',
      log.metadata?.duration || ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csv;
  }

  // Clear logs
  public clearLogs(filter?: LogFilter): void {
    if (filter) {
      const logsToKeep = this.getLogs(filter);
      this.logs = this.logs.filter(log => !logsToKeep.includes(log));
    } else {
      this.logs = [];
    }
    this.saveLogs();
  }

  // Add listener
  public addListener(listener: (log: LogEntry) => void): void {
    this.listeners.add(listener);
  }

  // Remove listener
  public removeListener(listener: (log: LogEntry) => void): void {
    this.listeners.delete(listener);
  }

  // Set log level
  public setLogLevel(level: string): void {
    this.logLevel = level;
  }

  // Enable/disable logging
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // Set max logs
  public setMaxLogs(max: number): void {
    this.maxLogs = max;
    if (this.logs.length > max) {
      this.logs = this.logs.slice(-max);
      this.saveLogs();
    }
  }

  // Start periodic cleanup
  private startPeriodicCleanup(): void {
    // Clean up old logs every hour
    setInterval(() => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.logs = this.logs.filter(log => log.timestamp > oneDayAgo);
      this.saveLogs();
    }, 60 * 60 * 1000);
  }

  // Log proxy switch
  public logProxySwitch(fromProxy: string | null, toProxy: string, reason?: string): void {
    this.log('info', 'proxy', 'Proxy Switched', {
      from: fromProxy || 'Direct',
      to: toProxy,
      reason: reason || 'Manual switch'
    });
  }

  // Log rule match
  public logRuleMatch(url: string, rule: any, proxy: string): void {
    this.log('info', 'rule', 'Rule Matched', {
      url,
      rule: rule.name,
      pattern: rule.pattern,
      proxy
    });
  }

  // Log performance metrics
  public logPerformance(metrics: any): void {
    this.log('info', 'performance', 'Performance Metrics', metrics);
  }

  // Get recent activity
  public getRecentActivity(minutes: number = 5): LogEntry[] {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.getLogs({ startDate: since });
  }

  // Get error summary
  public getErrorSummary(hours: number = 24): Record<string, number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const errors = this.getLogs({ level: ['error'], startDate: since });
    
    const summary: Record<string, number> = {};
    errors.forEach(error => {
      const key = error.action;
      summary[key] = (summary[key] || 0) + 1;
    });
    
    return summary;
  }

  // Search logs
  public searchLogs(query: string): LogEntry[] {
    const searchLower = query.toLowerCase();
    return this.logs.filter(log => {
      const logString = JSON.stringify(log).toLowerCase();
      return logString.includes(searchLower);
    });
  }
}

// Export singleton instance
export const connectionLogger = new ConnectionLogger();
