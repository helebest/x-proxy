// Performance Monitor Module for X-Proxy
// Provides comprehensive performance monitoring and analytics for proxy connections

interface PerformanceMetric {
  timestamp: Date;
  metricType: 'latency' | 'throughput' | 'cpu' | 'memory' | 'network' | 'error';
  value: number;
  unit: string;
  proxyId?: string;
  details?: any;
}

interface PerformanceSnapshot {
  timestamp: Date;
  latency: number;
  throughput: number;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  errorRate: number;
  proxyId?: string;
}

interface PerformanceReport {
  period: string;
  startTime: Date;
  endTime: Date;
  averageLatency: number;
  averageThroughput: number;
  peakLatency: number;
  peakThroughput: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  uptime: number;
  metrics: PerformanceMetric[];
}

interface AlertConfig {
  enabled: boolean;
  latencyThreshold: number;
  errorRateThreshold: number;
  cpuThreshold: number;
  memoryThreshold: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private snapshots: PerformanceSnapshot[] = [];
  private activeConnections: Map<string, Date> = new Map();
  private requestTimings: Map<string, number> = new Map();
  private alertConfig: AlertConfig;
  private monitoringInterval: NodeJS.Timer | null = null;
  private isMonitoring: boolean = false;
  private maxMetrics: number = 10000;
  private maxSnapshots: number = 1440; // 24 hours at 1 minute intervals

  constructor() {
    this.alertConfig = this.getDefaultAlertConfig();
    this.loadPerformanceData();
    this.setupEventListeners();
  }

  // Get default alert configuration
  private getDefaultAlertConfig(): AlertConfig {
    return {
      enabled: true,
      latencyThreshold: 1000, // 1 second
      errorRateThreshold: 10, // 10%
      cpuThreshold: 80, // 80%
      memoryThreshold: 80 // 80%
    };
  }

  // Load performance data from storage
  private async loadPerformanceData(): Promise<void> {
    try {
      const data = await chrome.storage.local.get(['performanceMetrics', 'performanceSnapshots', 'alertConfig']);
      
      if (data.performanceMetrics) {
        this.metrics = data.performanceMetrics.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      }
      
      if (data.performanceSnapshots) {
        this.snapshots = data.performanceSnapshots.map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp)
        }));
      }
      
      if (data.alertConfig) {
        this.alertConfig = data.alertConfig;
      }
    } catch (error) {
      console.error('Error loading performance data:', error);
    }
  }

  // Save performance data to storage
  private async savePerformanceData(): Promise<void> {
    try {
      await chrome.storage.local.set({
        performanceMetrics: this.metrics.slice(-this.maxMetrics),
        performanceSnapshots: this.snapshots.slice(-this.maxSnapshots),
        alertConfig: this.alertConfig
      });
    } catch (error) {
      console.error('Error saving performance data:', error);
    }
  }

  // Setup event listeners
  private setupEventListeners(): void {
    // Listen for web request events to track performance
    if (chrome.webRequest) {
      chrome.webRequest.onBeforeRequest.addListener(
        (details) => this.onRequestStart(details),
        { urls: ['<all_urls>'] }
      );

      chrome.webRequest.onCompleted.addListener(
        (details) => this.onRequestComplete(details),
        { urls: ['<all_urls>'] },
        ['responseHeaders']
      );

      chrome.webRequest.onErrorOccurred.addListener(
        (details) => this.onRequestError(details),
        { urls: ['<all_urls>'] }
      );
    }

    // Listen for performance entries
    if (typeof window !== 'undefined' && window.performance) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });
      
      observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
    }

    // Listen for runtime messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'getPerformanceMetrics') {
        sendResponse(this.getCurrentMetrics());
      } else if (message.action === 'startMonitoring') {
        this.startMonitoring();
      } else if (message.action === 'stopMonitoring') {
        this.stopMonitoring();
      }
    });
  }

  // Handle request start
  private onRequestStart(details: chrome.webRequest.WebRequestBodyDetails): void {
    this.activeConnections.set(details.requestId, new Date());
    this.requestTimings.set(details.requestId, performance.now());
  }

  // Handle request completion
  private onRequestComplete(details: chrome.webRequest.WebResponseCacheDetails): void {
    const startTime = this.requestTimings.get(details.requestId);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.recordMetric({
        timestamp: new Date(),
        metricType: 'latency',
        value: duration,
        unit: 'ms',
        details: {
          url: details.url,
          statusCode: details.statusCode,
          fromCache: details.fromCache
        }
      });
      
      this.requestTimings.delete(details.requestId);
    }
    
    this.activeConnections.delete(details.requestId);
  }

  // Handle request error
  private onRequestError(details: chrome.webRequest.WebResponseErrorDetails): void {
    this.recordMetric({
      timestamp: new Date(),
      metricType: 'error',
      value: 1,
      unit: 'count',
      details: {
        url: details.url,
        error: details.error
      }
    });
    
    this.activeConnections.delete(details.requestId);
    this.requestTimings.delete(details.requestId);
  }

  // Process performance entry
  private processPerformanceEntry(entry: PerformanceEntry): void {
    if (entry.entryType === 'navigation' || entry.entryType === 'resource') {
      this.recordMetric({
        timestamp: new Date(),
        metricType: 'latency',
        value: entry.duration,
        unit: 'ms',
        details: {
          name: entry.name,
          type: entry.entryType
        }
      });
    }
  }

  // Start monitoring
  public startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.captureSnapshot();
    }, intervalMs);
    
    // Capture initial snapshot
    this.captureSnapshot();
  }

  // Stop monitoring
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Capture performance snapshot
  private async captureSnapshot(): Promise<void> {
    const snapshot: PerformanceSnapshot = {
      timestamp: new Date(),
      latency: this.calculateAverageLatency(),
      throughput: this.calculateThroughput(),
      cpuUsage: await this.getCPUUsage(),
      memoryUsage: await this.getMemoryUsage(),
      activeConnections: this.activeConnections.size,
      errorRate: this.calculateErrorRate()
    };
    
    this.snapshots.push(snapshot);
    
    // Trim snapshots if necessary
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }
    
    // Check for alerts
    this.checkAlerts(snapshot);
    
    // Save periodically
    this.savePerformanceData();
  }

  // Calculate average latency
  private calculateAverageLatency(): number {
    const recentMetrics = this.getRecentMetrics('latency', 60000); // Last minute
    if (recentMetrics.length === 0) return 0;
    
    const sum = recentMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / recentMetrics.length;
  }

  // Calculate throughput
  private calculateThroughput(): number {
    const recentMetrics = this.getRecentMetrics('throughput', 60000); // Last minute
    if (recentMetrics.length === 0) {
      // Calculate based on request count
      const requests = this.getRecentMetrics('latency', 60000);
      return requests.length; // Requests per minute
    }
    
    const sum = recentMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / recentMetrics.length;
  }

  // Calculate error rate
  private calculateErrorRate(): number {
    const recentErrors = this.getRecentMetrics('error', 60000);
    const recentRequests = this.getRecentMetrics('latency', 60000);
    
    if (recentRequests.length === 0) return 0;
    
    return (recentErrors.length / recentRequests.length) * 100;
  }

  // Get CPU usage
  private async getCPUUsage(): Promise<number> {
    // This would need to be implemented differently for browser extensions
    // For now, return a simulated value
    if (chrome.system?.cpu) {
      return new Promise((resolve) => {
        chrome.system.cpu.getInfo((info) => {
          // Calculate average processor usage
          let totalUsage = 0;
          info.processors.forEach((processor) => {
            const usage = processor.usage;
            if (usage) {
              totalUsage += (usage.kernel + usage.user) / usage.total * 100;
            }
          });
          resolve(totalUsage / info.processors.length);
        });
      });
    }
    return Math.random() * 30 + 10; // Simulated value between 10-40%
  }

  // Get memory usage
  private async getMemoryUsage(): Promise<number> {
    if (chrome.system?.memory) {
      return new Promise((resolve) => {
        chrome.system.memory.getInfo((info) => {
          const usedMemory = info.capacity - info.availableCapacity;
          const usagePercent = (usedMemory / info.capacity) * 100;
          resolve(usagePercent);
        });
      });
    }
    return Math.random() * 30 + 20; // Simulated value between 20-50%
  }

  // Get recent metrics
  private getRecentMetrics(type: string, periodMs: number): PerformanceMetric[] {
    const since = new Date(Date.now() - periodMs);
    return this.metrics.filter(m => 
      m.metricType === type && m.timestamp >= since
    );
  }

  // Record metric
  public recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Trim metrics if necessary
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Check alerts
  private checkAlerts(snapshot: PerformanceSnapshot): void {
    if (!this.alertConfig.enabled) return;
    
    const alerts: string[] = [];
    
    if (snapshot.latency > this.alertConfig.latencyThreshold) {
      alerts.push(`High latency detected: ${snapshot.latency.toFixed(2)}ms`);
    }
    
    if (snapshot.errorRate > this.alertConfig.errorRateThreshold) {
      alerts.push(`High error rate: ${snapshot.errorRate.toFixed(2)}%`);
    }
    
    if (snapshot.cpuUsage > this.alertConfig.cpuThreshold) {
      alerts.push(`High CPU usage: ${snapshot.cpuUsage.toFixed(2)}%`);
    }
    
    if (snapshot.memoryUsage > this.alertConfig.memoryThreshold) {
      alerts.push(`High memory usage: ${snapshot.memoryUsage.toFixed(2)}%`);
    }
    
    if (alerts.length > 0) {
      this.sendAlerts(alerts);
    }
  }

  // Send alerts
  private sendAlerts(alerts: string[]): void {
    alerts.forEach(alert => {
      chrome.runtime.sendMessage({
        action: 'performanceAlert',
        message: alert,
        timestamp: new Date().toISOString()
      });
      
      // Also log to console
      console.warn('[Performance Alert]', alert);
    });
  }

  // Get current metrics
  public getCurrentMetrics(): any {
    const latestSnapshot = this.snapshots[this.snapshots.length - 1];
    
    return {
      snapshot: latestSnapshot,
      activeConnections: this.activeConnections.size,
      recentMetrics: this.getRecentMetrics('latency', 300000), // Last 5 minutes
      isMonitoring: this.isMonitoring
    };
  }

  // Generate performance report
  public generateReport(periodMs: number = 3600000): PerformanceReport {
    const endTime = new Date();
    const startTime = new Date(Date.now() - periodMs);
    
    const periodMetrics = this.metrics.filter(m => 
      m.timestamp >= startTime && m.timestamp <= endTime
    );
    
    const latencyMetrics = periodMetrics.filter(m => m.metricType === 'latency');
    const errorMetrics = periodMetrics.filter(m => m.metricType === 'error');
    
    const report: PerformanceReport = {
      period: this.formatPeriod(periodMs),
      startTime,
      endTime,
      averageLatency: this.calculateAverage(latencyMetrics),
      averageThroughput: this.calculateThroughputForPeriod(startTime, endTime),
      peakLatency: this.calculatePeak(latencyMetrics),
      peakThroughput: this.calculatePeakThroughput(startTime, endTime),
      totalRequests: latencyMetrics.length,
      successfulRequests: latencyMetrics.length - errorMetrics.length,
      failedRequests: errorMetrics.length,
      uptime: this.calculateUptime(startTime, endTime),
      metrics: periodMetrics
    };
    
    return report;
  }

  // Format period
  private formatPeriod(ms: number): string {
    const hours = ms / (1000 * 60 * 60);
    if (hours < 1) return `${ms / (1000 * 60)} minutes`;
    if (hours < 24) return `${hours} hours`;
    return `${hours / 24} days`;
  }

  // Calculate average
  private calculateAverage(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  // Calculate peak
  private calculatePeak(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    return Math.max(...metrics.map(m => m.value));
  }

  // Calculate throughput for period
  private calculateThroughputForPeriod(startTime: Date, endTime: Date): number {
    const periodSnapshots = this.snapshots.filter(s => 
      s.timestamp >= startTime && s.timestamp <= endTime
    );
    
    if (periodSnapshots.length === 0) return 0;
    
    const sum = periodSnapshots.reduce((acc, s) => acc + s.throughput, 0);
    return sum / periodSnapshots.length;
  }

  // Calculate peak throughput
  private calculatePeakThroughput(startTime: Date, endTime: Date): number {
    const periodSnapshots = this.snapshots.filter(s => 
      s.timestamp >= startTime && s.timestamp <= endTime
    );
    
    if (periodSnapshots.length === 0) return 0;
    
    return Math.max(...periodSnapshots.map(s => s.throughput));
  }

  // Calculate uptime
  private calculateUptime(startTime: Date, endTime: Date): number {
    // For simplicity, assume 100% uptime unless there are significant errors
    const errorRate = this.calculateErrorRateForPeriod(startTime, endTime);
    return Math.max(0, 100 - errorRate);
  }

  // Calculate error rate for period
  private calculateErrorRateForPeriod(startTime: Date, endTime: Date): number {
    const periodMetrics = this.metrics.filter(m => 
      m.timestamp >= startTime && m.timestamp <= endTime
    );
    
    const errors = periodMetrics.filter(m => m.metricType === 'error');
    const requests = periodMetrics.filter(m => m.metricType === 'latency');
    
    if (requests.length === 0) return 0;
    
    return (errors.length / requests.length) * 100;
  }

  // Export metrics
  public exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportAsCSV();
    }
    return JSON.stringify(this.metrics, null, 2);
  }

  // Export as CSV
  private exportAsCSV(): string {
    const headers = ['Timestamp', 'Type', 'Value', 'Unit', 'Proxy ID', 'Details'];
    
    const rows = this.metrics.map(m => [
      m.timestamp.toISOString(),
      m.metricType,
      m.value,
      m.unit,
      m.proxyId || '',
      JSON.stringify(m.details || {})
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    return csv;
  }

  // Clear metrics
  public clearMetrics(): void {
    this.metrics = [];
    this.snapshots = [];
    this.savePerformanceData();
  }

  // Set alert configuration
  public setAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
    this.savePerformanceData();
  }

  // Get performance trends
  public getTrends(metricType: string, periodMs: number = 3600000): any {
    const metrics = this.getRecentMetrics(metricType, periodMs);
    
    if (metrics.length < 2) return null;
    
    // Simple linear regression for trend
    const n = metrics.length;
    const x = metrics.map((_, i) => i);
    const y = metrics.map(m => m.value);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return {
      slope,
      intercept,
      trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
      prediction: intercept + slope * (n + 1)
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
