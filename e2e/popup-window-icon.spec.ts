import { test, expect } from './fixture'

// Regression guards for the toolbar-icon-repaint bugs where activating a
// profile from the popup left the icon gray until the user touched the
// address bar. Two distinct root causes are covered:
//
//   1. chrome.tabs.query({currentWindow:true}) returned empty when the popup
//      was its own windowType:'popup' window. Fixed by looking up the last-
//      focused NORMAL window explicitly.
//   2. Active tab was non-http (chrome://newtab, about:blank, etc.), so
//      url.startsWith('http(s)://') returned false and updateIcon(null) ran
//      even with a profile active — users expect immediate feedback that the
//      proxy is on regardless of the current tab's scheme. Fixed by showing
//      the profile color unconditionally when no per-domain routing rules
//      are enabled.
//
// The earlier fixture opened popup.html in a regular http tab, masking both
// bugs. These specs pin down the real scenarios a user hits.

const RED = '#F44336'

function redProfile(routingEnabled = false, domains: string[] = []) {
  return {
    id: 'p-red',
    name: 'Red',
    color: RED,
    config: {
      type: 'http',
      host: '127.0.0.1',
      port: 8888,
      auth: { username: '', password: '' },
      bypassList: [],
      pacUrl: '',
      routingRules: { enabled: routingEnabled, mode: 'whitelist', domains }
    }
  }
}

async function seedProfile(page: import('@playwright/test').Page, profile: unknown) {
  await page.evaluate(async (p) => {
    await chrome.storage.local.set({
      'x-proxy-data': {
        version: 2,
        mode: 'system',
        profiles: [p],
        activeProfileId: undefined,
        settings: {}
      }
    })
  }, profile)
}

async function openRealPopupWindow(context: import('@playwright/test').BrowserContext) {
  const sw = context.serviceWorkers()[0]
  const [page] = await Promise.all([
    context.waitForEvent('page'),
    sw.evaluate(() =>
      chrome.windows.create({
        type: 'popup',
        url: chrome.runtime.getURL('popup.html'),
        focused: true,
        width: 380,
        height: 620
      })
    )
  ])
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)
  return page
}

async function readLastIconColor(page: import('@playwright/test').Page) {
  const state = await page.evaluate(() =>
    new Promise<any>(resolve => chrome.runtime.sendMessage({ type: 'GET_STATE' }, resolve))
  )
  expect(state.success).toBe(true)
  return state.lastIconColor
}

test('toolbar icon repaints when activating a profile from a real popup window on an http tab', async ({ context, extensionId }) => {
  const browsingTab = await context.newPage()
  await browsingTab.goto('https://example.com')
  await browsingTab.waitForLoadState('domcontentloaded')

  const seedPage = await context.newPage()
  await seedPage.goto(`chrome-extension://${extensionId}/popup.html`)
  await seedPage.waitForLoadState('domcontentloaded')
  await seedProfile(seedPage, redProfile())
  await seedPage.close()

  const popupPage = await openRealPopupWindow(context)
  await popupPage.locator('.profile-item').first().click()
  await popupPage.waitForTimeout(400)

  expect(
    await readLastIconColor(popupPage),
    'icon should reflect activated profile color when current tab is http'
  ).toBe(RED)
})

test('toolbar icon repaints even when the active tab is non-http (chrome://newtab, about:blank)', async ({ context, extensionId }) => {
  // Seed profile without navigating anywhere — default tabs are about:blank.
  // This is the exact scenario the user reported: click extension icon from
  // the new-tab page, activate profile, icon should go to profile color.
  const seedPage = await context.newPage()
  await seedPage.goto(`chrome-extension://${extensionId}/popup.html`)
  await seedPage.waitForLoadState('domcontentloaded')
  await seedProfile(seedPage, redProfile())
  await seedPage.close()

  const popupPage = await openRealPopupWindow(context)
  await popupPage.locator('.profile-item').first().click()
  await popupPage.waitForTimeout(400)

  expect(
    await readLastIconColor(popupPage),
    'icon should reflect activated profile color even with non-http active tab'
  ).toBe(RED)
})

test('toolbar icon stays gray on a non-matching site when per-domain routing rules are enabled', async ({ context, extensionId }) => {
  // With routing rules limited to *.example.com, a tab on wikipedia.org is
  // legitimately NOT proxied — the per-tab indicator's job is to show that.
  const browsingTab = await context.newPage()
  await browsingTab.goto('https://www.wikipedia.org')
  await browsingTab.waitForLoadState('domcontentloaded')

  const seedPage = await context.newPage()
  await seedPage.goto(`chrome-extension://${extensionId}/popup.html`)
  await seedPage.waitForLoadState('domcontentloaded')
  await seedProfile(seedPage, redProfile(true, ['*.example.com']))
  await seedPage.close()

  const popupPage = await openRealPopupWindow(context)
  await popupPage.locator('.profile-item').first().click()
  await popupPage.waitForTimeout(400)

  expect(
    await readLastIconColor(popupPage),
    'icon should be gray when routing rules exclude the current site'
  ).toBe(null)
})
