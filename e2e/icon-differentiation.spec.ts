import { test, expect } from './fixture'

// Regression guard for the tail of issue #28: the toolbar icon used to look
// IDENTICAL in Direct mode and System mode because both call sites resolved to
// `updateIcon(null)` → icon-inactive-*.png. A new icon-direct-{16,32,48,128}.png
// family now renders for Direct, so System (ext essentially off) and Direct
// (ext actively bypassing) are visually distinct in the toolbar.

async function readState(page: import('@playwright/test').Page) {
  const state = await page.evaluate(() =>
    new Promise<any>(resolve => chrome.runtime.sendMessage({ type: 'GET_STATE' }, resolve))
  )
  expect(state.success).toBe(true)
  return state
}

test.describe('Toolbar icon differentiation: Direct vs System (issue #28 tail)', () => {
  test('Direct mode resolves to icon-direct-* paths', async ({ popupPage }) => {
    await popupPage.click('#directConnection')
    await popupPage.waitForTimeout(300)

    const state = await readState(popupPage)
    expect(state.mode).toBe('direct')
    expect(state.lastIconMode).toBe('direct')
    expect(state.lastIconPaths).toBeTruthy()
    expect(state.lastIconPaths[16]).toContain('icon-direct')
    expect(state.lastIconPaths[128]).toContain('icon-direct')
  })

  test('System mode resolves to icon-inactive-* paths', async ({ popupPage }) => {
    await popupPage.click('#systemProxy')
    await popupPage.waitForTimeout(300)

    const state = await readState(popupPage)
    expect(state.mode).toBe('system')
    expect(state.lastIconMode).toBe('system')
    expect(state.lastIconPaths[16]).toContain('icon-inactive')
    expect(state.lastIconPaths[16]).not.toContain('icon-direct')
  })

  test('Direct and System paths are strictly different', async ({ popupPage }) => {
    await popupPage.click('#directConnection')
    await popupPage.waitForTimeout(300)
    const directState = await readState(popupPage)

    await popupPage.click('#systemProxy')
    await popupPage.waitForTimeout(300)
    const systemState = await readState(popupPage)

    expect(directState.lastIconPaths[16]).not.toBe(systemState.lastIconPaths[16])
    expect(directState.lastIconPaths[128]).not.toBe(systemState.lastIconPaths[128])
  })

  test('switching Direct → System → Direct repaints icon each time', async ({ popupPage }) => {
    await popupPage.click('#directConnection')
    await popupPage.waitForTimeout(300)
    expect((await readState(popupPage)).lastIconPaths[16]).toContain('icon-direct')

    await popupPage.click('#systemProxy')
    await popupPage.waitForTimeout(300)
    expect((await readState(popupPage)).lastIconPaths[16]).toContain('icon-inactive')

    await popupPage.click('#directConnection')
    await popupPage.waitForTimeout(300)
    expect((await readState(popupPage)).lastIconPaths[16]).toContain('icon-direct')
  })
})
