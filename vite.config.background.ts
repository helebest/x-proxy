import { defineConfig } from 'vite';

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
  }
});
