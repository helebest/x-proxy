import { test, expect } from './fixture'

// Visual + interactive gate for the 1.6.1 UX polish. Each test exercises a
// real click path and captures a screenshot so pixel-level regressions on the
// simplified popup are caught in CI.
//
// Baselines for the new screenshot names are generated on first green run via
// `npx playwright test --update-snapshots`; commit the PNGs in
// e2e/__screenshots__/ alongside these specs.

async function seedProfile(page: import('@playwright/test').Page, profile: Record<string, unknown>) {
  await page.evaluate(async (p) => {
    const existing = (await chrome.storage.local.get(['x-proxy-data']))['x-proxy-data'] || {}
    const data = {
      ...existing,
      profiles: [...(existing.profiles || []), p],
    }
    await chrome.storage.local.set({ 'x-proxy-data': data })
  }, profile)
}

function testProfile(id = 'p-visual-snapshot') {
  return {
    id,
    name: 'Test Snapshot',
    color: '#007AFF',
    config: { type: 'http', host: '127.0.0.1', port: 8080, auth: { username: '', password: '' } },
  }
}

test.describe('Popup visual baselines (1.6.1)', () => {
  test('empty state — only big CTA, no header "+"', async ({ popupPage }) => {
    await expect(popupPage.locator('#emptyState')).toBeVisible()
    await expect(popupPage).toHaveScreenshot('popup-empty-state.png')
  })

  test('populated state — header "+" visible, empty CTA gone', async ({ popupPage }) => {
    await seedProfile(popupPage, testProfile())
    await popupPage.reload()
    await popupPage.waitForLoadState('domcontentloaded')
    await popupPage.waitForTimeout(500)

    await expect(popupPage.locator('.profile-item')).toHaveCount(1)
    await expect(popupPage).toHaveScreenshot('popup-has-profiles.png')
  })

  test('Direct mode active — no checkmark, no status dot', async ({ popupPage }) => {
    await popupPage.click('#directConnection')
    await popupPage.waitForTimeout(300)

    await expect(popupPage.locator('#directConnection')).toHaveClass(/selected/)
    await expect(popupPage).toHaveScreenshot('popup-direct-active.png')
  })

  test('System mode active — no checkmark, no status dot', async ({ popupPage }) => {
    await popupPage.click('#directConnection')
    await popupPage.waitForTimeout(200)
    await popupPage.click('#systemProxy')
    await popupPage.waitForTimeout(300)

    await expect(popupPage.locator('#systemProxy')).toHaveClass(/selected/)
    await expect(popupPage).toHaveScreenshot('popup-system-active.png')
  })

  test('Profile active — no checkmark on profile-item.active', async ({ popupPage }) => {
    await seedProfile(popupPage, testProfile('p-visual-profile-active'))
    await popupPage.reload()
    await popupPage.waitForLoadState('domcontentloaded')
    await popupPage.waitForTimeout(500)

    await popupPage.locator('.profile-item').first().click()
    await popupPage.waitForTimeout(400)

    await expect(popupPage.locator('.profile-item.active')).toHaveCount(1)
    await expect(popupPage).toHaveScreenshot('popup-profile-active.png')
  })
})
