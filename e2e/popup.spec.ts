import { test, expect } from './fixture'

// Helper: create a profile via the options page, then return a fresh popup page
async function createProfileViaOptions(
  context: any,
  extensionId: string,
  profile: { name: string; type: string; host?: string; port?: string; pacUrl?: string }
) {
  const optionsPage = await context.newPage()
  await optionsPage.goto(`chrome-extension://${extensionId}/options.html`)
  await optionsPage.waitForLoadState('domcontentloaded')
  await optionsPage.waitForTimeout(500)

  await optionsPage.click('#addProfileBtn')
  await optionsPage.fill('#profileName', profile.name)
  await optionsPage.selectOption('#proxyType', profile.type)

  if (profile.type === 'pac') {
    await optionsPage.fill('#pacUrl', profile.pacUrl || '')
  } else {
    await optionsPage.fill('#proxyHost', profile.host || '')
    await optionsPage.fill('#proxyPort', profile.port || '')
  }

  await optionsPage.click('#saveProfileBtn')
  await optionsPage.waitForTimeout(300)
  await optionsPage.close()
}

test.describe('Popup - Empty State', () => {
  test('should show empty state when no profiles exist', async ({ popupPage }) => {
    const emptyState = popupPage.locator('#emptyState')
    await expect(emptyState).toBeVisible()
    await expect(emptyState).toContainText('No proxy profiles yet')
  })

  test('should show System button as active by default', async ({ popupPage }) => {
    const systemBtn = popupPage.locator('#systemProxy')
    await expect(systemBtn).toBeVisible()
    await expect(systemBtn).toContainText('System')
  })

  test('should display status as System', async ({ popupPage }) => {
    await expect(popupPage.locator('#statusText')).toHaveText('System')
  })
})

test.describe('Popup - Profile List Display', () => {
  test('should display HTTP profile correctly', async ({ context, extensionId }) => {
    await createProfileViaOptions(context, extensionId, {
      name: 'Work HTTP', type: 'http', host: '10.0.0.1', port: '8080'
    })

    const popupPage = await context.newPage()
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`)
    await popupPage.waitForLoadState('domcontentloaded')
    await popupPage.waitForTimeout(500)

    const profileItem = popupPage.locator('.profile-item')
    await expect(profileItem).toHaveCount(1)
    await expect(profileItem).toContainText('Work HTTP')
    await expect(profileItem).toContainText('http')
    await expect(profileItem).toContainText('10.0.0.1:8080')
  })

  test('should display SOCKS5 profile correctly', async ({ context, extensionId }) => {
    await createProfileViaOptions(context, extensionId, {
      name: 'VPN SOCKS', type: 'socks5', host: '127.0.0.1', port: '1080'
    })

    const popupPage = await context.newPage()
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`)
    await popupPage.waitForLoadState('domcontentloaded')
    await popupPage.waitForTimeout(500)

    const profileItem = popupPage.locator('.profile-item')
    await expect(profileItem).toContainText('VPN SOCKS')
    await expect(profileItem).toContainText('socks5')
    await expect(profileItem).toContainText('127.0.0.1:1080')
  })

  test('should display PAC profile correctly', async ({ context, extensionId }) => {
    await createProfileViaOptions(context, extensionId, {
      name: 'Corp PAC', type: 'pac', pacUrl: 'http://corp.example.com/proxy.pac'
    })

    const popupPage = await context.newPage()
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`)
    await popupPage.waitForLoadState('domcontentloaded')
    await popupPage.waitForTimeout(500)

    const profileItem = popupPage.locator('.profile-item')
    await expect(profileItem).toContainText('Corp PAC')
    await expect(profileItem).toContainText('PAC')
  })

  test('should display multiple profiles in order', async ({ context, extensionId }) => {
    await createProfileViaOptions(context, extensionId, {
      name: 'HTTP One', type: 'http', host: '10.0.0.1', port: '8080'
    })
    await createProfileViaOptions(context, extensionId, {
      name: 'SOCKS One', type: 'socks5', host: '10.0.0.2', port: '1080'
    })
    await createProfileViaOptions(context, extensionId, {
      name: 'PAC One', type: 'pac', pacUrl: 'http://example.com/proxy.pac'
    })

    const popupPage = await context.newPage()
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`)
    await popupPage.waitForLoadState('domcontentloaded')
    await popupPage.waitForTimeout(500)

    const items = popupPage.locator('.profile-item')
    await expect(items).toHaveCount(3)
    await expect(items.nth(0)).toContainText('HTTP One')
    await expect(items.nth(1)).toContainText('SOCKS One')
    await expect(items.nth(2)).toContainText('PAC One')
  })
})

test.describe('Popup - Profile Activation', () => {
  test('should activate HTTP profile on click', async ({ context, extensionId }) => {
    await createProfileViaOptions(context, extensionId, {
      name: 'Activate Test', type: 'http', host: '10.0.0.1', port: '8080'
    })

    const popupPage = await context.newPage()
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`)
    await popupPage.waitForLoadState('domcontentloaded')
    await popupPage.waitForTimeout(500)

    // Click profile to activate
    await popupPage.locator('.profile-item').click()
    await popupPage.waitForTimeout(500)

    // Verify profile becomes active
    await expect(popupPage.locator('.profile-item.active')).toHaveCount(1)
    await expect(popupPage.locator('#statusText')).not.toHaveText('System')
  })

  test('should switch back to system proxy', async ({ context, extensionId }) => {
    await createProfileViaOptions(context, extensionId, {
      name: 'Deactivate Test', type: 'http', host: '10.0.0.1', port: '8080'
    })

    const popupPage = await context.newPage()
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`)
    await popupPage.waitForLoadState('domcontentloaded')
    await popupPage.waitForTimeout(500)

    // Activate
    await popupPage.locator('.profile-item').click()
    await popupPage.waitForTimeout(500)

    // Deactivate via system proxy button
    await popupPage.click('#systemProxy')
    await popupPage.waitForTimeout(500)

    await expect(popupPage.locator('.profile-item.active')).toHaveCount(0)
    await expect(popupPage.locator('#statusText')).toHaveText('System')
  })

  test('should activate PAC profile on click', async ({ context, extensionId }) => {
    await createProfileViaOptions(context, extensionId, {
      name: 'PAC Activate', type: 'pac', pacUrl: 'http://example.com/proxy.pac'
    })

    const popupPage = await context.newPage()
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`)
    await popupPage.waitForLoadState('domcontentloaded')
    await popupPage.waitForTimeout(500)

    await popupPage.locator('.profile-item').click()
    await popupPage.waitForTimeout(500)

    // PAC profile should become active (may fail if URL is unreachable, but the click should work)
    await expect(popupPage.locator('.profile-item.active')).toHaveCount(1)
  })
})

test.describe('Popup - Navigation', () => {
  test('should have settings button', async ({ popupPage }) => {
    await expect(popupPage.locator('#settingsBtn')).toBeVisible()
  })

  test('should have footer links', async ({ popupPage }) => {
    await expect(popupPage.locator('#helpBtn')).toBeVisible()
    await expect(popupPage.locator('#donateBtn')).toBeVisible()
  })
})
