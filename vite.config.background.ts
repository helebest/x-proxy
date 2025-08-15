import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        background: './background.js'
      },
      output: {
        entryFileNames: '[name].js'
      }
    },
    target: 'chrome91',
    minify: process.env.NODE_ENV === 'production'
  },
  plugins: [
    {
      name: 'copy-static-files',
      writeBundle() {
        // Ensure dist directory exists
        if (!existsSync('dist')) {
          mkdirSync('dist', { recursive: true });
        }
        
        // Copy manifest.json
        copyFileSync('manifest.json', 'dist/manifest.json');
        console.log('✓ Copied manifest.json to dist/');
      }
    }
  ]
});
