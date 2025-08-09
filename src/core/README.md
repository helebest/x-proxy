# Proxy Management Module

A comprehensive TypeScript module for managing proxy profiles in Chrome extensions. This module provides a complete solution for creating, managing, and persisting proxy configurations with support for multiple proxy types (HTTP, HTTPS, SOCKS4, SOCKS5).

## Features

- ✅ **Multiple Proxy Types**: Support for HTTP, HTTPS, SOCKS4, SOCKS5, Direct, and System proxy configurations
- ✅ **Profile Management**: Create, update, delete, and organize proxy profiles with metadata
- ✅ **Persistent Storage**: Dual storage implementation (Chrome Storage API & localStorage)
- ✅ **Validation**: Comprehensive validation for proxy configurations and profiles
- ✅ **Event System**: Event-driven architecture with typed event payloads
- ✅ **Chrome Integration**: Native Chrome proxy API integration
- ✅ **Import/Export**: Support for backing up and restoring proxy profiles
- ✅ **TypeScript**: Fully typed with comprehensive interfaces

## Module Structure

```
src/
├── core/
│   ├── ProxyManager.ts      # Main proxy management class
│   └── index.ts             # Module exports
├── types/
│   └── proxy.ts             # TypeScript interfaces and types
├── services/
│   └── storage.ts           # Storage service implementations
├── utils/
│   └── validation.ts        # Validation utilities
└── examples/
    └── usage.ts             # Usage examples
```

## Core Components

### 1. ProxyManager
The main class that handles all proxy operations:
- Profile CRUD operations
- Proxy activation/deactivation
- Chrome proxy API integration
- Event management
- Import/export functionality

### 2. Storage Service
Dual implementation for data persistence:
- **ChromeStorageService**: Uses Chrome's storage API for extensions
- **LocalStorageService**: Uses browser localStorage for development

### 3. Validation Utilities
Comprehensive validation for:
- Proxy configurations (host, port, type)
- Profile metadata (name, description, tags)
- IP addresses and hostnames
- Bypass lists and CIDR notation

### 4. Type Definitions
Complete TypeScript interfaces for:
- `ProxyProfile`: Complete profile with metadata
- `ProxyConfig`: Core proxy configuration
- `ChromeProxyConfig`: Chrome-specific proxy format
- `ValidationResult`: Validation response structure
- Event types and payloads

## Usage Example

```typescript
import { getProxyManager, ProxyType, ProxyEvent } from './core';

// Initialize the proxy manager
const proxyManager = getProxyManager();
await proxyManager.initialize();

// Create a new proxy profile
const profile = await proxyManager.createProfile(
  'Work Proxy',
  {
    type: ProxyType.HTTP,
    host: 'proxy.company.com',
    port: 8080,
    auth: {
      username: 'user',
      password: 'pass'
    },
    bypassList: ['*.local', '192.168.*']
  },
  {
    description: 'Company proxy server',
    color: '#4CAF50',
    tags: ['work', 'http']
  }
);

// Activate the profile
await proxyManager.activateProfile(profile.id);

// Listen to events
proxyManager.on(ProxyEvent.PROFILE_ACTIVATED, (profile) => {
  console.log('Profile activated:', profile.name);
});

// Test proxy connection
const result = await proxyManager.testProxy(profile.id);
console.log('Connection test:', result.success ? 'Success' : 'Failed');
```

## API Reference

### ProxyManager Methods

| Method | Description |
|--------|-------------|
| `initialize()` | Initialize the manager and load profiles |
| `createProfile(name, config, options?)` | Create a new proxy profile |
| `updateProfile(id, updates)` | Update an existing profile |
| `deleteProfile(id)` | Delete a profile |
| `getProfile(id)` | Get a profile by ID |
| `getAllProfiles()` | Get all profiles |
| `getActiveProfile()` | Get the currently active profile |
| `activateProfile(id)` | Activate a proxy profile |
| `deactivateProfile()` | Deactivate the current profile |
| `testProxy(id)` | Test proxy connection |
| `importProfiles(profiles)` | Import profiles from backup |
| `exportProfiles()` | Export all profiles |
| `validateConfig(config)` | Validate a proxy configuration |

### Event Types

| Event | Payload | Description |
|-------|---------|-------------|
| `PROFILE_CREATED` | ProxyProfile | Fired when a profile is created |
| `PROFILE_UPDATED` | ProxyProfile | Fired when a profile is updated |
| `PROFILE_DELETED` | string (id) | Fired when a profile is deleted |
| `PROFILE_ACTIVATED` | ProxyProfile | Fired when a profile is activated |
| `PROFILE_DEACTIVATED` | string (id) | Fired when a profile is deactivated |
| `CONNECTION_TESTED` | ProxyTestResult | Fired after testing a connection |

### Validation Functions

| Function | Description |
|----------|-------------|
| `validateProxyConfig(config)` | Validate a proxy configuration |
| `validateProxyProfile(profile)` | Validate a complete profile |
| `isValidHost(host)` | Check if a host is valid |
| `isValidPort(port)` | Check if a port is valid |
| `isValidBypassEntry(entry)` | Validate bypass list entry |
| `sanitizeHost(host)` | Clean and sanitize host string |
| `normalizeBypassList(list)` | Normalize and deduplicate bypass list |

## Proxy Types

- **HTTP**: Standard HTTP proxy
- **HTTPS**: Secure HTTPS proxy
- **SOCKS4**: SOCKS version 4 proxy
- **SOCKS5**: SOCKS version 5 proxy (with auth support)
- **DIRECT**: Direct connection (no proxy)
- **SYSTEM**: Use system proxy settings

## Default Bypass List

The module provides a default bypass list for local addresses:
- `localhost`
- `127.0.0.1`
- `::1`
- `<local>`
- `*.local`
- `169.254/16`
- `10.0.0.0/8`
- `172.16.0.0/12`
- `192.168.0.0/16`

## Error Handling

All methods that can fail will throw errors with descriptive messages:

```typescript
try {
  await proxyManager.activateProfile('invalid-id');
} catch (error) {
  console.error('Failed to activate profile:', error.message);
}
```

## Testing

The module includes comprehensive validation and can be tested in both Chrome extension and development environments. The storage service automatically detects the environment and uses the appropriate storage backend.

## Browser Compatibility

- **Chrome Extension**: Full functionality with Chrome proxy API
- **Development Mode**: Uses localStorage for persistence
- **TypeScript**: Requires TypeScript 4.0+

## License

MIT
