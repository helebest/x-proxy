import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define icon sizes required for Chrome extension
const ICON_SIZES = [16, 32, 48, 128];

// Icon configurations
const ICONS = [
  {
    input: path.join(__dirname, '../public/icons/proxy-icon-active.svg'),
    outputPrefix: 'icon-active',
  },
  {
    input: path.join(__dirname, '../public/icons/proxy-icon-inactive.svg'),
    outputPrefix: 'icon-inactive',
  },
  {
    input: path.join(__dirname, '../public/icons/proxy-icon-error.svg'),
    outputPrefix: 'icon-error',
  },
];

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('🎨 Generating icon set...\n');

  for (const iconConfig of ICONS) {
    const { input, outputPrefix } = iconConfig;
    
    // Check if input file exists
    if (!fs.existsSync(input)) {
      console.error(`❌ Input file not found: ${input}`);
      continue;
    }

    console.log(`📁 Processing: ${path.basename(input)}`);

    for (const size of ICON_SIZES) {
      const outputPath = path.join(outputDir, `${outputPrefix}-${size}.png`);
      
      try {
        await sharp(input)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toFile(outputPath);
        
        console.log(`  ✅ Generated: ${outputPrefix}-${size}.png (${size}x${size})`);
      } catch (error) {
        console.error(`  ❌ Failed to generate ${outputPrefix}-${size}.png:`, error.message);
      }
    }
  }

  // Also generate default icon.png files for Chrome manifest
  console.log('\n📦 Generating default Chrome extension icons...');
  
  // Copy the active state icons as default icons
  for (const size of ICON_SIZES) {
    const sourcePath = path.join(outputDir, `icon-active-${size}.png`);
    const destPath = path.join(outputDir, `icon-${size}.png`);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`  ✅ Created: icon-${size}.png`);
    }
  }

  console.log('\n✨ Icon generation complete!');
}

// Run the generation
generateIcons().catch(console.error);
