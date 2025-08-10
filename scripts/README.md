# Scripts Directory

Last updated: 2025-08-10

This directory contains utility scripts for the X-Proxy Chrome Extension project.

## Available Scripts

### generate-icons.js
Generates icon assets in multiple sizes from SVG source files.

**Usage:**
```bash
npm run generate-icons
```

**What it does:**
- Reads SVG source files from `public/icons/`
- Generates PNG exports in required sizes (16x16, 32x32, 48x48, 128x128)
- Creates icon variants for different states (active, inactive, error)
- Optimizes images for Chrome extension use

**Dependencies:**
- `sharp` - High-performance image processing library

## Development Workflow

1. **Icon Generation**: Run after modifying SVG source files
2. **Build Scripts**: Called automatically during the build process
3. **Utility Scripts**: Helper scripts for development tasks

## Adding New Scripts

When adding new scripts:
1. Place the script in this directory
2. Add appropriate npm script in `package.json`
3. Document the script purpose and usage here
4. Include any required dependencies in `package.json`

## Script Guidelines

- Use descriptive names for scripts
- Include clear comments in script files
- Handle errors gracefully
- Provide console output for progress
- Support both Windows and Unix environments

## License

MIT
