import { test, expect } from './fixture'

async function readStorageData(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const result = await chrome.storage.local.get(['x-proxy-data'])
    return result['x-proxy-data']
  })
}

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

test.describe('Issue #28 — Direct Connection mode', () => {
  test('popup exposes a Direct button next to System', async ({ popupPage }) => {
    const directBtn = popupPage.locator('#directConnection')
    const systemBtn = popupPage.locator('#systemProxy')
    await expect(directBtn).toBeVisible()
    await expect(systemBtn).toBeVisible()
    await expect(directBtn).toContainText(/direct/i)
  })

  test('clicking Direct sets storage mode="direct" and updates status', async ({ popupPage }) => {
    await popupPage.click('#directConnection')
    await popupPage.waitForTimeout(300)

    const data = await readStorageData(popupPage)
    expect(data?.mode).toBe('direct')
    expect(data?.activeProfileId).toBeUndefined()

    await expect(popupPage.locator('#statusText')).toHaveText(/direct/i)
    await expect(popupPage.locator('#directConnection')).toHaveClass(/selected/)
  })

  test('switching from Direct back to System sets mode="system"', async ({ popupPage }) => {
    await popupPage.click('#directConnection')
    await popupPage.waitForTimeout(200)
    await popupPage.click('#systemProxy')
    await popupPage.waitForTimeout(300)

    const data = await readStorageData(popupPage)
    expect(data?.mode).toBe('system')
    await expect(popupPage.locator('#statusText')).toHaveText('System')
    await expect(popupPage.locator('#systemProxy')).toHaveClass(/selected/)
  })

  test('activating a profile after Direct clears direct state', async ({ popupPage }) => {
    await seedProfile(popupPage, {
      id: 'p-direct-test',
      name: 'TestProxy',
      color: '#007AFF',
      config: { type: 'http', host: '127.0.0.1', port: 8888, auth: { username: '', password: '' } }
    })
    await popupPage.reload()
    await popupPage.waitForLoadState('domcontentloaded')
    await popupPage.waitForTimeout(500)

    await popupPage.click('#directConnection')
    await popupPage.waitForTimeout(200)
    await popupPage.locator('.profile-item').first().click()
    await popupPage.waitForTimeout(300)

    const data = await readStorageData(popupPage)
    expect(data?.mode).toBe('profile')
    expect(data?.activeProfileId).toBe('p-direct-test')
  })
})
