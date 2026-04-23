import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  expect: {
    toHaveScreenshot: {
      // 0.01 = 1% of pixels. A 1280×720 page = ~9,216-pixel budget.
      // Previous 0.05 (~46k pixels) silently absorbed entire text changes like
      // "X-Proxy v1.5.1" → "X-Proxy v1.6.1" and let baselines drift 3 versions
      // without CI ever complaining. 0.01 still tolerates font-rendering
      // subpixel noise without hiding real content changes.
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  use: {
    headless: false, // Chrome extensions require headed mode
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
})
