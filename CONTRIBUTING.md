# Contributing to X-Proxy

Last updated: 2025-08-13

First off, thank you for considering contributing to X-Proxy! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Guidelines](#coding-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Standards

- **Be Respectful**: Treat everyone with respect. No harassment, discrimination, or inappropriate behavior.
- **Be Collaborative**: Work together to resolve conflicts and assume good intentions.
- **Be Professional**: Maintain professionalism in all interactions.
- **Be Inclusive**: Welcome and support people of all backgrounds and identities.

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- Node.js 18+ and npm 8+
- Git
- A GitHub account
- Chrome browser for testing
- Basic knowledge of TypeScript and Chrome Extensions

### First Contributions

Unsure where to begin? You can start by looking through these issues:

- [Good First Issues](https://github.com/helebest/x-proxy/labels/good%20first%20issue) - issues which should only require a few lines of code
- [Help Wanted](https://github.com/helebest/x-proxy/labels/help%20wanted) - issues which need extra attention
- [Documentation](https://github.com/helebest/x-proxy/labels/documentation) - improvements or additions to documentation

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, please include:

1. **Clear Title**: A clear and descriptive title
2. **Description**: A detailed description of the issue
3. **Steps to Reproduce**: List the exact steps to reproduce the behavior
4. **Expected Behavior**: What you expected to happen
5. **Actual Behavior**: What actually happened
6. **Screenshots**: If applicable, add screenshots
7. **Environment**:
   - Chrome version
   - X-Proxy version
   - Operating System
   - Any relevant proxy configuration

#### Bug Report Template

```markdown
## Bug Description
A clear and concise description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Configure '....'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Screenshots
If applicable, add screenshots.

## Environment
- Chrome Version: [e.g., 120.0.6099.129]
- X-Proxy Version: [e.g., 1.0.0]
- OS: [e.g., Windows 11]
- Proxy Type: [e.g., SOCKS5]

## Additional Context
Any other context about the problem.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

1. **Use Case**: Explain the use case for this enhancement
2. **Current Behavior**: Current behavior and why it's insufficient
3. **Proposed Solution**: Your proposed solution
4. **Alternatives**: Any alternative solutions you've considered
5. **Additional Context**: Any other context or screenshots

### Code Contributions

#### Local Development Setup

1. **Fork the Repository**
   ```bash
   # Fork via GitHub UI, then:
   git clone https://github.com/your-username/x-proxy.git
   cd x-proxy
   ```

2. **Set Up Upstream**
   ```bash
   git remote add upstream https://github.com/helebest/x-proxy.git
   git fetch upstream
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Load Extension in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

## Project Structure

```
x-proxy/
├── dist/               # Build output
├── tests/              # Test suites
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   └── e2e/           # End-to-end tests
├── docs/               # Documentation
├── store-assets/       # Chrome Web Store assets
├── manifest.json       # Extension manifest
├── popup.html          # Popup UI
├── popup.js            # Popup logic
├── options.html        # Options page
├── options.js          # Options logic
├── background.js       # Background service worker
├── package.json        # Project configuration
├── tsconfig.json       # TypeScript configuration
└── README.md           # Documentation
```

## Coding Guidelines

### TypeScript Style Guide

We follow the [TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) with some modifications:

1. **Use TypeScript Strict Mode**: All code must pass strict type checking
2. **Prefer const**: Use `const` for values that won't be reassigned
3. **Use Type Annotations**: Always provide explicit type annotations for function parameters and return types
4. **Avoid `any`**: Never use `any` type unless absolutely necessary
5. **Use Interfaces**: Prefer interfaces over type aliases for object types

#### Example Code Style

```typescript
// Good ✅
interface ProxyConfig {
  host: string;
  port: number;
  type: ProxyType;
  username?: string;
  password?: string;
}

export const createProxy = async (config: ProxyConfig): Promise<Proxy> => {
  const { host, port, type } = config;
  
  if (!isValidHost(host)) {
    throw new Error(`Invalid host: ${host}`);
  }
  
  const proxy = new Proxy({
    host,
    port,
    type,
  });
  
  return proxy;
};

// Bad ❌
export function createProxy(config: any) {
  var proxy = new Proxy(config);
  return proxy;
}
```

### File Naming Conventions

- **TypeScript Files**: Use camelCase (e.g., `proxyManager.ts`)
- **React Components**: Use PascalCase (e.g., `ProxyList.tsx`)
- **Test Files**: Add `.test.ts` or `.spec.ts` suffix
- **Constants**: Use UPPER_SNAKE_CASE in constants file
- **CSS Files**: Use kebab-case (e.g., `proxy-list.css`)

### Code Organization

1. **Imports Order**:
   ```typescript
   // 1. External imports
   import { someFunction } from 'external-library';
   
   // 2. Internal absolute imports
   import { ProxyManager } from '@/core/proxy';
   
   // 3. Internal relative imports
   import { helper } from './utils';
   
   // 4. Type imports
   import type { ProxyConfig } from '@/types';
   ```

2. **Export Patterns**:
   - Use named exports for utilities and components
   - Use default export only for main module entry points
   - Group related exports in index files

### Chrome Extension Specific Guidelines

1. **Manifest Permissions**: Only request necessary permissions
2. **Storage**: Use chrome.storage.local for profile data
3. **Security**: Never execute dynamic code or use eval()
4. **Performance**: Keep background script lightweight

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Build system changes
- **ci**: CI/CD changes
- **chore**: Other changes that don't modify src or test files

### Examples

```bash
# Feature
feat(proxy): add SOCKS4 support

# Bug fix
fix(popup): resolve connection status display issue

# Documentation
docs(readme): update installation instructions

# Performance
perf(background): optimize proxy switching logic

# Breaking change
feat(api)!: redesign proxy configuration API

BREAKING CHANGE: The proxy configuration API has been completely redesigned.
Old configuration format is no longer supported.
```

## Pull Request Process

1. **Update Your Fork**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make Changes**
   - Write code following our guidelines
   - Add/update tests
   - Update documentation

4. **Run Tests**
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(scope): your feature description"
   ```

6. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature
   ```

7. **Create Pull Request**
   - Go to GitHub and create a PR
   - Fill out the PR template
   - Link related issues
   - Request review from maintainers

### Pull Request Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated
- [ ] All tests passing

## Related Issues
Fixes #(issue number)

## Screenshots
If applicable, add screenshots.
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Writing Tests

1. **Test File Location**: Place test files next to the code they test
2. **Test Structure**: Use describe/it blocks for organization
3. **Coverage**: Aim for >80% code coverage
4. **Mocking**: Mock Chrome APIs and external dependencies

#### Example Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProxyManager } from './proxyManager';

describe('ProxyManager', () => {
  let manager: ProxyManager;

  beforeEach(() => {
    manager = new ProxyManager();
    vi.clearAllMocks();
  });

  describe('addProxy', () => {
    it('should add a valid proxy', async () => {
      const proxy = {
        host: 'proxy.example.com',
        port: 8080,
        type: 'http' as const,
      };

      const result = await manager.addProxy(proxy);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.host).toBe(proxy.host);
    });

    it('should reject invalid proxy', async () => {
      const invalidProxy = {
        host: '',
        port: -1,
        type: 'invalid' as any,
      };

      await expect(manager.addProxy(invalidProxy)).rejects.toThrow();
    });
  });
});
```

## Documentation

### Code Documentation

Use JSDoc comments for functions and classes:

```typescript
/**
 * Creates a new proxy configuration
 * @param config - The proxy configuration object
 * @returns Promise resolving to the created proxy
 * @throws {InvalidConfigError} When configuration is invalid
 * @example
 * ```typescript
 * const proxy = await createProxy({
 *   host: 'proxy.example.com',
 *   port: 8080,
 *   type: 'http'
 * });
 * ```
 */
export async function createProxy(config: ProxyConfig): Promise<Proxy> {
  // Implementation
}
```

### Documentation Updates

When making changes:

1. Update inline code comments
2. Update README if adding features
3. Update API documentation
4. Add examples for new features
5. Update CHANGELOG.md

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue with the "question" label!

---

Thank you for contributing to X-Proxy! 🚀
