import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test'
import path from 'path'

// Custom fixture that launches Chrome with the extension loaded
export const test = base.extend<{
  context: BrowserContext
  extensionId: string
  optionsPage: Page
  popupPage: Page
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const extensionPath = path.resolve('dist')
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-first-run',
        '--disable-default-apps',
      ],
    })
    await use(context)
    await context.close()
  },

  extensionId: async ({ context }, use) => {
    // Wait for the service worker to register
    let serviceWorker = context.serviceWorkers()[0]
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker')
    }
    const extensionId = serviceWorker.url().split('/')[2]
    await use(extensionId)
  },

  optionsPage: async ({ context, extensionId }, use) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/options.html`)
    await page.waitForLoadState('domcontentloaded')
    // Wait for storage initialization
    await page.waitForTimeout(500)
    await use(page)
  },

  popupPage: async ({ context, extensionId }, use) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/popup.html`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)
    await use(page)
  },
})

export { expect } from '@playwright/test'
