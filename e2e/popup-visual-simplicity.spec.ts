import { test, expect } from './fixture'

// Regression guard for issue #36 ("Repetitive elements to create a new profile")
// and the tail of #28 (4-signal over-display of active mode).
//
// The popup used to scream state through 4 parallel visual signals:
//   1. .status-dot (colored, pulsing) in the top chip
//   2. .action-card.selected blue gradient on the card
//   3. white card icon (inherited from .selected)
//   4. .action-check ✓ on the right edge of the card
//
// Cards now rely on (2) + (3) only; (1) and (4) are removed. These assertions
// lock that simplification down.
//
// Additionally: with no profiles present, three redundant "add profile" entry
// points existed. The header "+" button (#addProfileBtn) is now hidden in the
// empty state so the big CTA is the single obvious action.

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

test.describe('Popup visual simplicity (issue #36 + #28 tail)', () => {
  test('status indicator has NO pulsing dot element', async ({ popupPage }) => {
    // The entire .status-dot span has been retired — classes on the parent
    // .status-indicator still switch for data-mode, but no visual dot renders.
    await expect(popupPage.locator('.status-dot')).toHaveCount(0)
  })

  test('action cards render NO .action-check element', async ({ popupPage }) => {
    // Card itself remains; the right-edge checkmark wrapper is removed
    // entirely (not merely hidden via opacity — the DOM node is gone).
    await expect(popupPage.locator('#directConnection .action-check')).toHaveCount(0)
    await expect(popupPage.locator('#systemProxy .action-check')).toHaveCount(0)
  })

  test('active card still communicates selection via class + background', async ({ popupPage }) => {
    // Selection signal is the .selected class (which drives the blue gradient
    // and white text inheritance). That's the ONE remaining signal on the card.
    await popupPage.click('#directConnection')
    await popupPage.waitForTimeout(200)
    await expect(popupPage.locator('#directConnection')).toHaveClass(/selected/)
    await expect(popupPage.locator('#systemProxy')).not.toHaveClass(/selected/)
  })

  test('empty state hides the header "+" add-profile button', async ({ popupPage }) => {
    // No profiles seeded — popup is in empty state. The big CTA is the only
    // "create profile" entry point visible; #addProfileBtn is hidden.
    await expect(popupPage.locator('#emptyState')).toBeVisible()
    await expect(popupPage.locator('#addProfileBtn')).toBeHidden()
  })

  test('non-empty state shows the header "+" add-profile button and hides the empty CTA', async ({ popupPage }) => {
    await seedProfile(popupPage, {
      id: 'p-simplicity-test',
      name: 'TestProxy',
      color: '#007AFF',
      config: { type: 'http', host: '127.0.0.1', port: 8080, auth: { username: '', password: '' } },
    })
    await popupPage.reload()
    await popupPage.waitForLoadState('domcontentloaded')
    await popupPage.waitForTimeout(500)

    await expect(popupPage.locator('.profile-item')).toHaveCount(1)
    await expect(popupPage.locator('#addProfileBtn')).toBeVisible()
    await expect(popupPage.locator('#emptyState')).toBeHidden()
  })

  test('body carries a state class toggling between empty and populated', async ({ popupPage }) => {
    // The JS-driven state hint on <body> is what CSS uses to hide #addProfileBtn
    // in empty mode. Pin it down so future refactors don't silently break the
    // empty-state → hidden-+ link.
    await expect(popupPage.locator('body')).toHaveClass(/state-empty/)

    await seedProfile(popupPage, {
      id: 'p-state-class-test',
      name: 'X',
      color: '#007AFF',
      config: { type: 'http', host: '10.0.0.1', port: 80, auth: { username: '', password: '' } },
    })
    await popupPage.reload()
    await popupPage.waitForLoadState('domcontentloaded')
    await popupPage.waitForTimeout(500)

    await expect(popupPage.locator('body')).not.toHaveClass(/state-empty/)
  })
})
