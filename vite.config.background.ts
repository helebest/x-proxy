import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/background/background.ts'),
      name: 'BackgroundService',
      fileName: () => 'background.js',
      formats: ['iife']
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        extend: true,
        format: 'iife'
      }
    },
    target: 'chrome91',
    minify: process.env.NODE_ENV === 'production'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
