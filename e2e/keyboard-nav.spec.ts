import { test, expect, type Page } from './fixture'

// Keyboard-navigation behavior tests for options.js modal.
//
// Written TDD-style: all assertions below fail against the codebase as of
// v1.6.1 because options.js ships no Escape-to-close handler, no focus
// return after modal close, and no focus trap inside the modal. The
// implementation that makes these green lives alongside this spec in the
// same change — see options.js changes paired with this file.
//
// Why keyboard nav matters here: the WCAG 2.1.2 "No Keyboard Trap"
// criterion requires that a modal dialog give keyboard users a way out
// without a pointer. The existing a11y.spec.ts only checks color contrast,
// so keyboard-accessibility regressions ship unchecked.

async function seedOneProfile(page: Page) {
  await page.evaluate(async () => {
    await chrome.storage.local.set({
      'x-proxy-data': {
        version: 2,
        mode: 'system',
        activeProfileId: undefined,
        profiles: [{
          id: 'p-keyboard',
          name: 'Sample Profile',
          color: '#007AFF',
          config: {
            type: 'http',
            host: '127.0.0.1',
            port: 8080,
            auth: { username: '', password: '' },
          },
          createdAt: 0,
          updatedAt: 0,
          tags: [],
        }],
        settings: {},
      },
    })
  })
}

test.describe('Keyboard navigation — modal dialogs', () => {
  test('pressing Escape closes the Add Profile modal', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await expect(optionsPage.locator('#profileModal')).toHaveClass(/show/)

    await optionsPage.keyboard.press('Escape')

    await expect(optionsPage.locator('#profileModal')).not.toHaveClass(/show/)
  })

  test('pressing Escape closes the Edit Profile modal', async ({ optionsPage }) => {
    await seedOneProfile(optionsPage)
    await optionsPage.reload()
    await optionsPage.waitForLoadState('domcontentloaded')
    await optionsPage.waitForTimeout(500)

    await optionsPage.click('[data-action="edit"]')
    await expect(optionsPage.locator('#profileModal')).toHaveClass(/show/)
    await expect(optionsPage.locator('#profileModalTitle')).toHaveText('Edit Proxy Profile')

    await optionsPage.keyboard.press('Escape')

    await expect(optionsPage.locator('#profileModal')).not.toHaveClass(/show/)
  })

  test('Escape on Add modal returns focus to the triggering button', async ({ optionsPage }) => {
    // Focus discipline: when a modal opens via #addProfileBtn and the user
    // closes it with Escape, focus should return to #addProfileBtn so the
    // keyboard user stays in context. Without this, focus falls back to
    // <body> and the user has to Tab from the top of the page again.
    await optionsPage.focus('#addProfileBtn')
    await optionsPage.keyboard.press('Enter')
    await expect(optionsPage.locator('#profileModal')).toHaveClass(/show/)

    await optionsPage.keyboard.press('Escape')
    await expect(optionsPage.locator('#profileModal')).not.toHaveClass(/show/)

    const focused = await optionsPage.evaluate(() => document.activeElement?.id)
    expect(focused).toBe('addProfileBtn')
  })

  test('modal receives initial focus on its first input when opened', async ({ optionsPage }) => {
    // A keyboard user opening the modal should land on the first form field
    // (#profileName) so they can start typing immediately. Without auto-
    // focus, the cursor is stranded on the button behind the modal.
    await optionsPage.click('#addProfileBtn')
    await expect(optionsPage.locator('#profileModal')).toHaveClass(/show/)

    const focused = await optionsPage.evaluate(() => document.activeElement?.id)
    expect(focused).toBe('profileName')
  })
})
