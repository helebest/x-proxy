import { vi } from 'vitest';

// Mock Chrome APIs
global.chrome = {
  proxy: {
    settings: {
      set: vi.fn((config, callback) => {
        if (callback) callback();
      }),
      get: vi.fn((config, callback) => {
        callback({
          levelOfControl: 'controlled_by_this_extension',
          value: {
            mode: 'fixed_servers',
            rules: {
              singleProxy: {
                scheme: 'http',
                host: 'proxy.example.com',
                port: 8080
              }
            }
          }
        });
      }),
      clear: vi.fn((config, callback) => {
        if (callback) callback();
      }),
      onChange: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
        hasListener: vi.fn()
      }
    },
    onProxyError: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn((keys, callback) => {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            result[key] = null;
          });
        } else if (typeof keys === 'string') {
          result[keys] = null;
        } else if (keys === null || keys === undefined) {
          // Return all stored data
        }
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      set: vi.fn((items, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: vi.fn((keys, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      clear: vi.fn((callback) => {
        if (callback) callback();
        return Promise.resolve();
      })
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn()
    }
  },
  runtime: {
    lastError: null,
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn()
    },
    onInstalled: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn()
    },
    getManifest: vi.fn(() => ({
      manifest_version: 3,
      name: 'X-Proxy',
      version: '1.0.0'
    }))
  },
  tabs: {
    query: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    reload: vi.fn(),
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn()
    }
  },
  webRequest: {
    onBeforeRequest: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn()
    },
    onAuthRequired: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn()
    },
    onErrorOccurred: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn()
    }
  },
  action: {
    setIcon: vi.fn(),
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
    setTitle: vi.fn()
  },
  notifications: {
    create: vi.fn(),
    clear: vi.fn(),
    update: vi.fn()
  }
} as any;

// Setup test environment
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
