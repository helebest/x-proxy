import type { Page } from '@playwright/test'
import { test, expect } from './fixture'

async function expectNoBackdropBlur(page: Page, selector: string, label: string) {
  const probe = await page.locator(selector).evaluate((el) => {
    const s = getComputedStyle(el as Element) as CSSStyleDeclaration & { webkitBackdropFilter?: string }
    return { std: s.backdropFilter || 'none', webkit: s.webkitBackdropFilter || 'none' }
  })
  expect(probe.std, `${label} backdrop-filter`).toBe('none')
  expect(probe.webkit, `${label} -webkit-backdrop-filter`).toBe('none')
}

test.describe('Issue #27 — no backdrop-filter blur anywhere', () => {
  test('options page surfaces have no backdrop blur', async ({ optionsPage }) => {
    await expectNoBackdropBlur(optionsPage, '.header', 'options .header')
    await expectNoBackdropBlur(optionsPage, '.sidebar', 'options .sidebar')

    await optionsPage.click('#addProfileBtn')
    await expect(optionsPage.locator('#profileModal')).toHaveClass(/show/)
    await expectNoBackdropBlur(optionsPage, '#profileModal', 'options #profileModal')
  })

  test('popup surfaces have no backdrop blur', async ({ popupPage }) => {
    await expectNoBackdropBlur(popupPage, '.header', 'popup .header')
    await expectNoBackdropBlur(popupPage, '.footer', 'popup .footer')
  })
})
