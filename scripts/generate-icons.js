import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ICON_SIZES = [16, 32, 48, 128];

// Keep in sync with validColors in options.js and COLOR_NAMES in background.js
const PROFILE_COLORS = [
  { hex: '#007AFF', name: 'blue'   },
  { hex: '#4CAF50', name: 'green'  },
  { hex: '#F44336', name: 'red'    },
  { hex: '#FF9800', name: 'orange' },
  { hex: '#9C27B0', name: 'purple' },
  { hex: '#009688', name: 'teal'   },
  { hex: '#FFC107', name: 'yellow' },
  { hex: '#607D8B', name: 'gray'   },
];

/** Multiply each RGB channel by factor to produce a darker shade for the gradient end-stop. */
function darken(hex, factor = 0.75) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 0xff) * factor);
  const g = Math.round(((n >> 8) & 0xff) * factor);
  const b = Math.round((n & 0xff) * factor);
  return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

const outputDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// ─── Base icons (active / inactive / error) ───────────────────────────────────

const BASE_ICONS = [
  { input: path.join(__dirname, '../public/icons/proxy-icon-active.svg'),   outputPrefix: 'icon-active' },
  { input: path.join(__dirname, '../public/icons/proxy-icon-inactive.svg'), outputPrefix: 'icon-inactive' },
  { input: path.join(__dirname, '../public/icons/proxy-icon-error.svg'),    outputPrefix: 'icon-error' },
];

async function generateBaseIcons() {
  console.log('📁 Generating base icons…\n');

  for (const { input, outputPrefix } of BASE_ICONS) {
    if (!fs.existsSync(input)) {
      console.error(`  ❌ Input file not found: ${input}`);
      continue;
    }

    console.log(`  Processing: ${path.basename(input)}`);

    for (const size of ICON_SIZES) {
      const outputPath = path.join(outputDir, `${outputPrefix}-${size}.png`);
      await sharp(input)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outputPath);
      console.log(`    ✅ ${outputPrefix}-${size}.png`);
    }
  }

  // Copy active icons as the manifest default icons
  console.log('\n  Copying active icons as manifest defaults…');
  for (const size of ICON_SIZES) {
    const src = path.join(outputDir, `icon-active-${size}.png`);
    const dst = path.join(outputDir, `icon-${size}.png`);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      console.log(`    ✅ icon-${size}.png`);
    }
  }
}

// ─── Profile color icons ───────────────────────────────────────────────────────

async function generateProfileIcons() {
  console.log('\n🎨 Generating profile color icons…\n');

  const templatePath = path.join(__dirname, '../public/icons/proxy-icon-active.svg');
  const template = fs.readFileSync(templatePath, 'utf-8');

  for (const { hex, name } of PROFILE_COLORS) {
    // Patch the SVG gradient: replace the two original blue stops with the profile color
    const svg = template
      .replace(/#007AFF/gi, hex)
      .replace(/#0051D5/gi, darken(hex));

    const svgBuffer = Buffer.from(svg);

    for (const size of ICON_SIZES) {
      const outputPath = path.join(outputDir, `icon-active-${name}-${size}.png`);
      await sharp(svgBuffer, { density: 300 })
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outputPath);
      console.log(`  ✅ icon-active-${name}-${size}.png`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function generateIcons() {
  await generateBaseIcons();
  await generateProfileIcons();

  const total = BASE_ICONS.length * ICON_SIZES.length + PROFILE_COLORS.length * ICON_SIZES.length;
  console.log(`\n✨ Done — ${total} icons generated.`);
}

generateIcons().catch(err => {
  console.error('❌ Icon generation failed:', err);
  process.exit(1);
});
