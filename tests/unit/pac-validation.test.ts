import { describe, it, expect, beforeEach } from 'vitest';
import { PACValidator } from '@/pac/PACValidator';
import { PACValidationResult, PACValidationError } from '@/pac/types';

describe('PAC Script Validation', () => {
  let validator: PACValidator;

  beforeEach(() => {
    validator = new PACValidator();
  });

  describe('Basic Validation', () => {
    it('should validate a minimal valid PAC script', () => {
      const script = `
        function FindProxyForURL(url, host) {
          return "DIRECT";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing FindProxyForURL function', () => {
      const script = `
        function findProxy(url, host) {
          return "DIRECT";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'MISSING_FUNCTION',
          message: expect.stringContaining('FindProxyForURL')
        })
      );
    });

    it('should detect incorrect function signature', () => {
      const script = `
        function FindProxyForURL(url) {
          return "DIRECT";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'INVALID_SIGNATURE'
        })
      );
    });

    it('should detect syntax errors', () => {
      const script = `
        function FindProxyForURL(url, host) {
          if (host == "example.com"
            return "PROXY proxy.example.com:8080";
          return "DIRECT";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'SYNTAX_ERROR'
        })
      );
    });
  });

  describe('Return Value Validation', () => {
    it('should validate correct DIRECT return', () => {
      const script = `
        function FindProxyForURL(url, host) {
          return "DIRECT";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
    });

    it('should validate correct PROXY return', () => {
      const script = `
        function FindProxyForURL(url, host) {
          return "PROXY proxy.example.com:8080";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
    });

    it('should validate correct SOCKS return', () => {
      const script = `
        function FindProxyForURL(url, host) {
          return "SOCKS5 socks.example.com:1080";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
    });

    it('should validate fallback proxy chain', () => {
      const script = `
        function FindProxyForURL(url, host) {
          return "PROXY proxy1.example.com:8080; PROXY proxy2.example.com:8080; DIRECT";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
    });

    it('should detect invalid return format', () => {
      const script = `
        function FindProxyForURL(url, host) {
          return "INVALID proxy.example.com:8080";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(false);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'INVALID_RETURN_FORMAT'
        })
      );
    });

    it('should detect missing return statement', () => {
      const script = `
        function FindProxyForURL(url, host) {
          if (host == "example.com") {
            "PROXY proxy.example.com:8080";
          }
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'MISSING_RETURN'
        })
      );
    });
  });

  describe('PAC Helper Functions', () => {
    it('should validate use of dnsDomainIs', () => {
      const script = `
        function FindProxyForURL(url, host) {
          if (dnsDomainIs(host, ".example.com"))
            return "PROXY proxy.example.com:8080";
          return "DIRECT";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
    });

    it('should validate use of shExpMatch', () => {
      const script = `
        function FindProxyForURL(url, host) {
          if (shExpMatch(url, "http://www.example.com/*"))
            return "PROXY proxy.example.com:8080";
          return "DIRECT";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
    });

    it('should validate use of isInNet', () => {
      const script = `
        function FindProxyForURL(url, host) {
          if (isInNet(dnsResolve(host), "10.0.0.0", "255.0.0.0"))
            return "DIRECT";
          return "PROXY proxy.example.com:8080";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
    });

    it('should validate use of isPlainHostName', () => {
      const script = `
        function FindProxyForURL(url, host) {
          if (isPlainHostName(host))
            return "DIRECT";
          return "PROXY proxy.example.com:8080";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
    });

    it('should warn about deprecated functions', () => {
      const script = `
        function FindProxyForURL(url, host) {
          if (localHostOrDomainIs(host, "www.example.com"))
            return "DIRECT";
          return "PROXY proxy.example.com:8080";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'DEPRECATED_FUNCTION',
          message: expect.stringContaining('localHostOrDomainIs')
        })
      );
    });
  });

  describe('Performance Validation', () => {
    it('should warn about expensive DNS operations', () => {
      const script = `
        function FindProxyForURL(url, host) {
          var resolved = dnsResolve(host);
          if (isInNet(resolved, "10.0.0.0", "255.0.0.0"))
            return "DIRECT";
          if (isInNet(resolved, "192.168.0.0", "255.255.0.0"))
            return "DIRECT";
          if (isInNet(resolved, "172.16.0.0", "255.240.0.0"))
            return "DIRECT";
          return "PROXY proxy.example.com:8080";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'PERFORMANCE',
          message: expect.stringContaining('DNS')
        })
      );
    });

    it('should warn about inefficient pattern matching', () => {
      const script = `
        function FindProxyForURL(url, host) {
          if (shExpMatch(host, "*.example.com") || 
              shExpMatch(host, "*.test.com") ||
              shExpMatch(host, "*.dev.com") ||
              shExpMatch(host, "*.staging.com") ||
              shExpMatch(host, "*.prod.com")) {
            return "PROXY proxy.example.com:8080";
          }
          return "DIRECT";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'PERFORMANCE',
          message: expect.stringContaining('pattern matching')
        })
      );
    });
  });

  describe('Security Validation', () => {
    it('should warn about eval usage', () => {
      const script = `
        function FindProxyForURL(url, host) {
          eval("var proxy = 'PROXY proxy.example.com:8080'");
          return proxy;
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'SECURITY',
          message: expect.stringContaining('eval')
        })
      );
    });

    it('should warn about external script loading attempts', () => {
      const script = `
        function FindProxyForURL(url, host) {
          var script = document.createElement('script');
          return "DIRECT";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'SECURITY',
          message: expect.stringContaining('DOM')
        })
      );
    });
  });

  describe('Complex PAC Scripts', () => {
    it('should validate complex conditional logic', () => {
      const script = `
        function FindProxyForURL(url, host) {
          // Local addresses
          if (isPlainHostName(host) ||
              dnsDomainIs(host, ".local") ||
              isInNet(dnsResolve(host), "127.0.0.0", "255.255.255.0") ||
              isInNet(dnsResolve(host), "10.0.0.0", "255.0.0.0") ||
              isInNet(dnsResolve(host), "172.16.0.0", "255.240.0.0") ||
              isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0")) {
            return "DIRECT";
          }
          
          // Specific domains
          if (dnsDomainIs(host, ".example.com") ||
              dnsDomainIs(host, ".example.org")) {
            return "PROXY proxy1.example.com:8080";
          }
          
          // HTTPS traffic
          if (url.substring(0, 6) == "https:") {
            return "PROXY https-proxy.example.com:443";
          }
          
          // Default
          return "PROXY default.proxy.com:8080; DIRECT";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
    });

    it('should validate PAC with custom helper functions', () => {
      const script = `
        function isInternalNetwork(host) {
          return isInNet(dnsResolve(host), "10.0.0.0", "255.0.0.0") ||
                 isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0");
        }
        
        function FindProxyForURL(url, host) {
          if (isInternalNetwork(host)) {
            return "DIRECT";
          }
          return "PROXY proxy.example.com:8080";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty script', () => {
      const script = '';

      const result = validator.validate(script);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'EMPTY_SCRIPT'
        })
      );
    });

    it('should handle script with only comments', () => {
      const script = `
        // This is a comment
        /* This is a 
           multi-line comment */
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'MISSING_FUNCTION'
        })
      );
    });

    it('should handle script with Unicode characters', () => {
      const script = `
        function FindProxyForURL(url, host) {
          // 中文注释
          if (host == "例え.jp") {
            return "PROXY プロキシ.jp:8080";
          }
          return "DIRECT";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
    });

    it('should handle very long scripts', () => {
      let script = 'function FindProxyForURL(url, host) {\n';
      for (let i = 0; i < 1000; i++) {
        script += `  if (host == "site${i}.com") return "PROXY proxy${i}.com:8080";\n`;
      }
      script += '  return "DIRECT";\n}';

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'COMPLEXITY',
          message: expect.stringContaining('complex')
        })
      );
    });
  });

  describe('Suggestions and Optimizations', () => {
    it('should suggest using switch for multiple domain checks', () => {
      const script = `
        function FindProxyForURL(url, host) {
          if (host == "site1.com") return "PROXY proxy1.com:8080";
          if (host == "site2.com") return "PROXY proxy2.com:8080";
          if (host == "site3.com") return "PROXY proxy3.com:8080";
          if (host == "site4.com") return "PROXY proxy4.com:8080";
          if (host == "site5.com") return "PROXY proxy5.com:8080";
          return "DIRECT";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
      expect(result.suggestions).toContainEqual(
        expect.objectContaining({
          type: 'OPTIMIZATION',
          message: expect.stringContaining('switch statement')
        })
      );
    });

    it('should suggest caching DNS results', () => {
      const script = `
        function FindProxyForURL(url, host) {
          if (isInNet(dnsResolve(host), "10.0.0.0", "255.0.0.0"))
            return "DIRECT";
          if (isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0"))
            return "DIRECT";
          return "PROXY proxy.example.com:8080";
        }
      `;

      const result = validator.validate(script);
      expect(result.isValid).toBe(true);
      expect(result.suggestions).toContainEqual(
        expect.objectContaining({
          type: 'OPTIMIZATION',
          message: expect.stringContaining('cache DNS')
        })
      );
    });
  });
});
