import { test, expect } from './fixture'

// Regression guard for the toolbar-icon-repaint bug where activating a
// profile from the real extension popup (windowType: 'popup') left the icon
// gray until the user touched the address bar. Root cause was
// chrome.tabs.query({currentWindow:true}) returning empty because the
// extension popup is itself a windowType:'popup' with no browsing tabs.
//
// This spec reproduces the exact scenario: a real popup-type window hosting
// popup.html + a normal http tab in the background. The earlier fixture that
// loads popup.html into a regular tab did NOT trigger the bug.

async function seedRedProfile(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    await chrome.storage.local.set({
      'x-proxy-data': {
        version: 2,
        mode: 'system',
        profiles: [{
          id: 'p-red',
          name: 'Red',
          color: '#F44336',
          config: {
            type: 'http',
            host: '127.0.0.1',
            port: 8888,
            auth: { username: '', password: '' },
            bypassList: [],
            pacUrl: '',
            routingRules: { enabled: false, mode: 'whitelist', domains: [] }
          }
        }],
        activeProfileId: undefined,
        settings: {}
      }
    })
  })
}

test('toolbar icon repaints immediately when activating a profile from a real popup window', async ({ context, extensionId }) => {
  // 1. Normal tab on an http(s) host — without a proxied http-protocol tab the
  //    icon would legitimately stay gray (chrome:// pages etc. are never proxied).
  const browsingTab = await context.newPage()
  await browsingTab.goto('https://example.com')
  await browsingTab.waitForLoadState('domcontentloaded')

  // 2. Seed a red profile through that tab (any extension page would do).
  const seedPage = await context.newPage()
  await seedPage.goto(`chrome-extension://${extensionId}/popup.html`)
  await seedPage.waitForLoadState('domcontentloaded')
  await seedRedProfile(seedPage)
  await seedPage.close()

  // 3. Open popup.html as a *real* extension-popup window via chrome.windows.create.
  //    This is what makes currentWindow:true fail in the broken code.
  const sw = context.serviceWorkers()[0]
  const [popupPage] = await Promise.all([
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
  await popupPage.waitForLoadState('domcontentloaded')
  await popupPage.waitForTimeout(500)

  // 4. Click the red profile in the popup window.
  await popupPage.locator('.profile-item').first().click()
  await popupPage.waitForTimeout(400)

  // 5. Ask background for its last-applied icon color from an extension page
  //    (the popup window itself carries chrome.runtime). It MUST be the
  //    profile's color, not null — `null` means the gray inactive icon is
  //    still showing, the exact symptom the user reported.
  const state = await popupPage.evaluate(() =>
    new Promise<any>(resolve => chrome.runtime.sendMessage({ type: 'GET_STATE' }, resolve))
  )
  expect(state.success).toBe(true)
  expect(state.lastIconColor, 'toolbar icon should immediately reflect the activated profile color').toBe('#F44336')
})
