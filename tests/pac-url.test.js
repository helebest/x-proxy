import { describe, it, expect } from 'vitest'

/**
 * Converts user input (URL, local file path) to Chrome proxy API pac_script format.
 * Returns { url: string } for valid input, or null for invalid input.
 */
function toPacUrl(input) {
  if (!input || !input.trim()) return null
  const trimmed = input.trim()

  // Already a URL with scheme (http://, https://, file://)
  if (/^https?:\/\//i.test(trimmed) || /^file:\/\//i.test(trimmed)) {
    return { url: trimmed }
  }

  // Windows absolute path: C:\ or C:/
  if (/^[a-zA-Z]:[\\\/]/.test(trimmed)) {
    return { url: 'file:///' + trimmed.replace(/\\/g, '/') }
  }

  // Unix absolute path
  if (trimmed.startsWith('/')) {
    return { url: 'file://' + trimmed }
  }

  return null
}

// ============================================================
// Tests
// ============================================================

describe('toPacUrl', () => {
  describe('HTTP/HTTPS URLs', () => {
    it('should return url for HTTP PAC URL', () => {
      expect(toPacUrl('http://example.com/proxy.pac')).toEqual({
        url: 'http://example.com/proxy.pac'
      })
    })

    it('should return url for HTTPS PAC URL', () => {
      expect(toPacUrl('https://example.com/proxy.pac')).toEqual({
        url: 'https://example.com/proxy.pac'
      })
    })

    it('should preserve query parameters', () => {
      expect(toPacUrl('http://example.com/proxy.pac?v=2&token=abc')).toEqual({
        url: 'http://example.com/proxy.pac?v=2&token=abc'
      })
    })

    it('should handle case-insensitive scheme', () => {
      expect(toPacUrl('HTTP://example.com/proxy.pac')).toEqual({
        url: 'HTTP://example.com/proxy.pac'
      })
    })
  })

  describe('file:// URLs', () => {
    it('should pass through file:// URLs unchanged', () => {
      expect(toPacUrl('file:///C:/data/proxy.pac')).toEqual({
        url: 'file:///C:/data/proxy.pac'
      })
    })

    it('should pass through file:// URLs with spaces', () => {
      expect(toPacUrl('file:///C:/my data/proxy.pac')).toEqual({
        url: 'file:///C:/my data/proxy.pac'
      })
    })
  })

  describe('Windows local file paths', () => {
    it('should convert backslash path to file:// URL', () => {
      expect(toPacUrl('C:\\data\\file.pac')).toEqual({
        url: 'file:///C:/data/file.pac'
      })
    })

    it('should convert lowercase drive letter', () => {
      expect(toPacUrl('c:\\data\\file.pac')).toEqual({
        url: 'file:///c:/data/file.pac'
      })
    })

    it('should handle path with spaces', () => {
      expect(toPacUrl('D:\\folder\\sub folder\\my.pac')).toEqual({
        url: 'file:///D:/folder/sub folder/my.pac'
      })
    })

    it('should handle forward slash Windows path', () => {
      expect(toPacUrl('C:/data/file.pac')).toEqual({
        url: 'file:///C:/data/file.pac'
      })
    })
  })

  describe('Unix local file paths', () => {
    it('should convert /etc path to file:// URL', () => {
      expect(toPacUrl('/etc/proxy.pac')).toEqual({
        url: 'file:///etc/proxy.pac'
      })
    })

    it('should convert home directory path', () => {
      expect(toPacUrl('/home/user/proxy.pac')).toEqual({
        url: 'file:///home/user/proxy.pac'
      })
    })
  })

  describe('edge cases', () => {
    it('should trim whitespace', () => {
      expect(toPacUrl('  http://example.com/proxy.pac  ')).toEqual({
        url: 'http://example.com/proxy.pac'
      })
    })

    it('should return null for empty string', () => {
      expect(toPacUrl('')).toBeNull()
    })

    it('should return null for whitespace-only string', () => {
      expect(toPacUrl('   ')).toBeNull()
    })

    it('should return null for null input', () => {
      expect(toPacUrl(null)).toBeNull()
    })

    it('should return null for undefined input', () => {
      expect(toPacUrl(undefined)).toBeNull()
    })

    it('should return null for relative path', () => {
      expect(toPacUrl('data/proxy.pac')).toBeNull()
    })
  })
})
