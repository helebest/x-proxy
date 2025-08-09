// Proxy Testing Module for X-Proxy
// Provides comprehensive proxy testing capabilities including connectivity, speed, and reliability

interface ProxyTestConfig {
  timeout?: number;
  testUrls?: string[];
  maxRetries?: number;
  verbose?: boolean;
}

interface ProxyTestResult {
  success: boolean;
  proxy: ProxyInfo;
  latency?: number;
  downloadSpeed?: number;
  uploadSpeed?: number;
  responseTime?: number;
  errorMessage?: string;
  testTimestamp: Date;
  testDetails: TestDetail[];
}

interface TestDetail {
  testName: string;
  success: boolean;
  duration: number;
  details?: any;
  error?: string;
}

interface ProxyInfo {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
}

interface ConnectionTest {
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  expectedStatus?: number;
  timeout: number;
}

export class ProxyTester {
  private defaultTestUrls = [
    'https://www.google.com',
    'https://www.cloudflare.com',
    'https://www.example.com',
    'https://httpbin.org/ip',
    'https://api.ipify.org?format=json'
  ];

  private speedTestUrls = {
    small: 'https://httpbin.org/bytes/1024',      // 1KB
    medium: 'https://httpbin.org/bytes/102400',   // 100KB
    large: 'https://httpbin.org/bytes/1048576'    // 1MB
  };

  private config: ProxyTestConfig;
  private abortController: AbortController | null = null;

  constructor(config: ProxyTestConfig = {}) {
    this.config = {
      timeout: config.timeout || 10000,
      testUrls: config.testUrls || this.defaultTestUrls,
      maxRetries: config.maxRetries || 3,
      verbose: config.verbose || false
    };
  }

  // Test proxy connection
  public async testProxy(proxy: ProxyInfo): Promise<ProxyTestResult> {
    const startTime = Date.now();
    const testDetails: TestDetail[] = [];
    
    try {
      // Set up proxy for testing
      await this.configureProxy(proxy);

      // Test 1: Basic connectivity
      const connectivityTest = await this.testConnectivity(proxy);
      testDetails.push(connectivityTest);

      if (!connectivityTest.success) {
        return {
          success: false,
          proxy,
          errorMessage: 'Failed to establish connection',
          testTimestamp: new Date(),
          testDetails
        };
      }

      // Test 2: Latency test
      const latencyTest = await this.testLatency(proxy);
      testDetails.push(latencyTest);

      // Test 3: Download speed test
      const downloadTest = await this.testDownloadSpeed(proxy);
      testDetails.push(downloadTest);

      // Test 4: Upload speed test (optional)
      const uploadTest = await this.testUploadSpeed(proxy);
      testDetails.push(uploadTest);

      // Test 5: DNS resolution
      const dnsTest = await this.testDNSResolution(proxy);
      testDetails.push(dnsTest);

      // Test 6: SSL/TLS support
      const sslTest = await this.testSSLSupport(proxy);
      testDetails.push(sslTest);

      // Test 7: Geographic location
      const geoTest = await this.testGeolocation(proxy);
      testDetails.push(geoTest);

      // Calculate overall metrics
      const totalDuration = Date.now() - startTime;
      const successfulTests = testDetails.filter(t => t.success).length;
      const totalTests = testDetails.length;

      return {
        success: successfulTests === totalTests,
        proxy,
        latency: latencyTest.duration,
        downloadSpeed: downloadTest.details?.speed,
        uploadSpeed: uploadTest.details?.speed,
        responseTime: totalDuration,
        testTimestamp: new Date(),
        testDetails
      };

    } catch (error) {
      return {
        success: false,
        proxy,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        testTimestamp: new Date(),
        testDetails
      };
    } finally {
      // Clean up proxy configuration
      await this.clearProxy();
    }
  }

  // Test basic connectivity
  private async testConnectivity(proxy: ProxyInfo): Promise<TestDetail> {
    const startTime = Date.now();
    const testName = 'Connectivity Test';

    try {
      for (const url of this.config.testUrls!) {
        try {
          const response = await this.fetchWithTimeout(url, {
            method: 'HEAD',
            timeout: this.config.timeout!
          });

          if (response.ok) {
            return {
              testName,
              success: true,
              duration: Date.now() - startTime,
              details: { url, status: response.status }
            };
          }
        } catch (error) {
          // Try next URL
          continue;
        }
      }

      throw new Error('All connectivity tests failed');
    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  // Test latency
  private async testLatency(proxy: ProxyInfo): Promise<TestDetail> {
    const startTime = Date.now();
    const testName = 'Latency Test';
    const samples = 5;
    const latencies: number[] = [];

    try {
      for (let i = 0; i < samples; i++) {
        const pingStart = performance.now();
        
        await this.fetchWithTimeout('https://www.google.com/generate_204', {
          method: 'HEAD',
          timeout: 5000
        });

        const pingEnd = performance.now();
        latencies.push(pingEnd - pingStart);
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const minLatency = Math.min(...latencies);
      const maxLatency = Math.max(...latencies);

      return {
        testName,
        success: true,
        duration: avgLatency,
        details: {
          average: avgLatency.toFixed(2),
          min: minLatency.toFixed(2),
          max: maxLatency.toFixed(2),
          samples: latencies.map(l => l.toFixed(2))
        }
      };
    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: 'Latency test failed'
      };
    }
  }

  // Test download speed
  private async testDownloadSpeed(proxy: ProxyInfo): Promise<TestDetail> {
    const startTime = Date.now();
    const testName = 'Download Speed Test';

    try {
      const results = [];

      for (const [size, url] of Object.entries(this.speedTestUrls)) {
        const downloadStart = performance.now();
        
        const response = await this.fetchWithTimeout(url, {
          method: 'GET',
          timeout: 30000
        });

        const data = await response.arrayBuffer();
        const downloadEnd = performance.now();
        
        const duration = (downloadEnd - downloadStart) / 1000; // Convert to seconds
        const bytes = data.byteLength;
        const speed = (bytes * 8) / duration / 1000000; // Mbps

        results.push({
          size,
          bytes,
          duration: duration.toFixed(3),
          speed: speed.toFixed(2)
        });
      }

      // Calculate average speed
      const avgSpeed = results.reduce((sum, r) => sum + parseFloat(r.speed), 0) / results.length;

      return {
        testName,
        success: true,
        duration: Date.now() - startTime,
        details: {
          speed: avgSpeed,
          unit: 'Mbps',
          tests: results
        }
      };
    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: 'Download speed test failed'
      };
    }
  }

  // Test upload speed
  private async testUploadSpeed(proxy: ProxyInfo): Promise<TestDetail> {
    const startTime = Date.now();
    const testName = 'Upload Speed Test';

    try {
      const testData = new Uint8Array(102400); // 100KB test data
      crypto.getRandomValues(testData);

      const uploadStart = performance.now();
      
      const response = await this.fetchWithTimeout('https://httpbin.org/post', {
        method: 'POST',
        body: testData,
        timeout: 30000
      });

      const uploadEnd = performance.now();
      
      if (response.ok) {
        const duration = (uploadEnd - uploadStart) / 1000; // Convert to seconds
        const bytes = testData.byteLength;
        const speed = (bytes * 8) / duration / 1000000; // Mbps

        return {
          testName,
          success: true,
          duration: Date.now() - startTime,
          details: {
            speed: speed.toFixed(2),
            unit: 'Mbps',
            bytes,
            duration: duration.toFixed(3)
          }
        };
      }

      throw new Error('Upload failed');
    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: 'Upload speed test failed'
      };
    }
  }

  // Test DNS resolution
  private async testDNSResolution(proxy: ProxyInfo): Promise<TestDetail> {
    const startTime = Date.now();
    const testName = 'DNS Resolution Test';
    const testDomains = [
      'google.com',
      'cloudflare.com',
      'github.com'
    ];

    try {
      const results = [];

      for (const domain of testDomains) {
        const dnsStart = performance.now();
        
        try {
          await this.fetchWithTimeout(`https://${domain}`, {
            method: 'HEAD',
            timeout: 5000
          });
          
          const dnsEnd = performance.now();
          results.push({
            domain,
            success: true,
            time: (dnsEnd - dnsStart).toFixed(2)
          });
        } catch (error) {
          results.push({
            domain,
            success: false,
            error: 'Resolution failed'
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return {
        testName,
        success: successCount > 0,
        duration: Date.now() - startTime,
        details: {
          resolved: successCount,
          total: testDomains.length,
          results
        }
      };
    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: 'DNS resolution test failed'
      };
    }
  }

  // Test SSL/TLS support
  private async testSSLSupport(proxy: ProxyInfo): Promise<TestDetail> {
    const startTime = Date.now();
    const testName = 'SSL/TLS Support Test';

    try {
      const httpsUrls = [
        'https://www.google.com',
        'https://www.cloudflare.com',
        'https://badssl.com/'
      ];

      const results = [];

      for (const url of httpsUrls) {
        try {
          const response = await this.fetchWithTimeout(url, {
            method: 'HEAD',
            timeout: 5000
          });

          results.push({
            url,
            success: response.ok,
            status: response.status
          });
        } catch (error) {
          results.push({
            url,
            success: false,
            error: 'SSL connection failed'
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return {
        testName,
        success: successCount === httpsUrls.length,
        duration: Date.now() - startTime,
        details: {
          sslSupported: successCount > 0,
          results
        }
      };
    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: 'SSL test failed'
      };
    }
  }

  // Test geolocation
  private async testGeolocation(proxy: ProxyInfo): Promise<TestDetail> {
    const startTime = Date.now();
    const testName = 'Geolocation Test';

    try {
      const response = await this.fetchWithTimeout('https://ipapi.co/json/', {
        method: 'GET',
        timeout: 10000
      });

      if (response.ok) {
        const data = await response.json();
        
        return {
          testName,
          success: true,
          duration: Date.now() - startTime,
          details: {
            ip: data.ip,
            country: data.country_name,
            city: data.city,
            region: data.region,
            isp: data.org,
            timezone: data.timezone,
            latitude: data.latitude,
            longitude: data.longitude
          }
        };
      }

      throw new Error('Failed to get geolocation');
    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: 'Geolocation test failed'
      };
    }
  }

  // Batch test multiple proxies
  public async testMultipleProxies(proxies: ProxyInfo[]): Promise<ProxyTestResult[]> {
    const results: ProxyTestResult[] = [];
    
    for (const proxy of proxies) {
      if (this.abortController?.signal.aborted) {
        break;
      }
      
      const result = await this.testProxy(proxy);
      results.push(result);
      
      // Emit progress event
      this.emitProgress(results.length, proxies.length);
    }
    
    return results;
  }

  // Quick connectivity test
  public async quickTest(proxy: ProxyInfo): Promise<boolean> {
    try {
      await this.configureProxy(proxy);
      
      const response = await this.fetchWithTimeout('https://www.google.com/generate_204', {
        method: 'HEAD',
        timeout: 5000
      });
      
      return response.ok;
    } catch (error) {
      return false;
    } finally {
      await this.clearProxy();
    }
  }

  // Configure proxy for testing
  private async configureProxy(proxy: ProxyInfo): Promise<void> {
    return new Promise((resolve) => {
      const config = {
        mode: 'fixed_servers',
        rules: {
          singleProxy: {
            scheme: proxy.type.toLowerCase(),
            host: proxy.host,
            port: proxy.port
          }
        }
      };

      chrome.proxy.settings.set(
        { value: config, scope: 'regular' },
        () => resolve()
      );
    });
  }

  // Clear proxy configuration
  private async clearProxy(): Promise<void> {
    return new Promise((resolve) => {
      chrome.proxy.settings.clear({}, () => resolve());
    });
  }

  // Fetch with timeout
  private async fetchWithTimeout(
    url: string, 
    options: { method: string; body?: any; timeout: number }
  ): Promise<Response> {
    this.abortController = new AbortController();
    
    const timeoutId = setTimeout(() => {
      this.abortController?.abort();
    }, options.timeout);

    try {
      const response = await fetch(url, {
        method: options.method,
        body: options.body,
        signal: this.abortController.signal,
        mode: 'no-cors' // Allow cross-origin requests
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Emit progress event
  private emitProgress(current: number, total: number): void {
    const event = new CustomEvent('proxyTestProgress', {
      detail: { current, total, percentage: (current / total) * 100 }
    });
    document.dispatchEvent(event);
  }

  // Cancel ongoing tests
  public cancelTests(): void {
    this.abortController?.abort();
  }

  // Get test statistics
  public async getTestStatistics(): Promise<any> {
    const stats = await chrome.storage.local.get('proxyTestStats');
    return stats.proxyTestStats || {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      averageLatency: 0,
      averageSpeed: 0
    };
  }

  // Save test result
  private async saveTestResult(result: ProxyTestResult): Promise<void> {
    const stats = await this.getTestStatistics();
    
    stats.totalTests++;
    if (result.success) {
      stats.successfulTests++;
      if (result.latency) {
        stats.averageLatency = (stats.averageLatency * (stats.successfulTests - 1) + result.latency) / stats.successfulTests;
      }
      if (result.downloadSpeed) {
        stats.averageSpeed = (stats.averageSpeed * (stats.successfulTests - 1) + result.downloadSpeed) / stats.successfulTests;
      }
    } else {
      stats.failedTests++;
    }
    
    await chrome.storage.local.set({ proxyTestStats: stats });
    
    // Store recent test results
    const recentTests = await chrome.storage.local.get('recentProxyTests');
    const tests = recentTests.recentProxyTests || [];
    tests.unshift(result);
    tests.splice(100); // Keep only last 100 tests
    
    await chrome.storage.local.set({ recentProxyTests: tests });
  }
}

// Export singleton instance
export const proxyTester = new ProxyTester();
