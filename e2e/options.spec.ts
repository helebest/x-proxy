import { test, expect } from './fixture'

test.describe('Options Page - Profile CRUD', () => {
  test('should show empty state when no profiles exist', async ({ optionsPage }) => {
    const emptyState = optionsPage.locator('.empty-state')
    await expect(emptyState).toBeVisible()
    await expect(emptyState).toContainText('No proxy profiles configured')
  })

  test('should open Add Profile modal', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    const modal = optionsPage.locator('#profileModal')
    await expect(modal).toHaveClass(/show/)
    await expect(optionsPage.locator('#profileModalTitle')).toHaveText('Add Proxy Profile')
  })

  test('should create an HTTP profile', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'My HTTP Proxy')
    await optionsPage.selectOption('#proxyType', 'http')
    await optionsPage.fill('#proxyHost', '192.168.1.100')
    await optionsPage.fill('#proxyPort', '8080')
    await optionsPage.click('#saveProfileBtn')

    // Verify profile card appears
    const profileCard = optionsPage.locator('.profile-card')
    await expect(profileCard).toHaveCount(1)
    await expect(profileCard).toContainText('My HTTP Proxy')
    await expect(profileCard).toContainText('HTTP/HTTPS')
    await expect(profileCard).toContainText('192.168.1.100:8080')
  })

  test('should create a SOCKS5 profile', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'My SOCKS5 Proxy')
    await optionsPage.selectOption('#proxyType', 'socks5')
    await optionsPage.fill('#proxyHost', '127.0.0.1')
    await optionsPage.fill('#proxyPort', '1080')
    await optionsPage.click('#saveProfileBtn')

    const profileCard = optionsPage.locator('.profile-card')
    await expect(profileCard).toHaveCount(1)
    await expect(profileCard).toContainText('My SOCKS5 Proxy')
    await expect(profileCard).toContainText('SOCKS5')
    await expect(profileCard).toContainText('127.0.0.1:1080')
  })

  test('should create a PAC profile', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'My PAC Config')
    await optionsPage.selectOption('#proxyType', 'pac')

    // Verify PAC URL field is visible, host/port hidden
    await expect(optionsPage.locator('#pacDetails')).toBeVisible()
    await expect(optionsPage.locator('#proxyDetails')).toBeHidden()
    await expect(optionsPage.locator('#authSection')).toBeHidden()
    await expect(optionsPage.locator('#routingSection')).toBeHidden()

    await optionsPage.fill('#pacUrl', 'http://example.com/proxy.pac')
    await optionsPage.click('#saveProfileBtn')

    const profileCard = optionsPage.locator('.profile-card')
    await expect(profileCard).toHaveCount(1)
    await expect(profileCard).toContainText('My PAC Config')
    await expect(profileCard).toContainText('PAC')
    await expect(profileCard).toContainText('http://example.com/proxy.pac')
  })

  test('should create a PAC profile with local file path', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'Local PAC')
    await optionsPage.selectOption('#proxyType', 'pac')
    await optionsPage.fill('#pacUrl', 'C:\\data\\proxy.pac')
    await optionsPage.click('#saveProfileBtn')

    const profileCard = optionsPage.locator('.profile-card')
    await expect(profileCard).toContainText('Local PAC')
    await expect(profileCard).toContainText('PAC')
  })

  test('should edit an existing profile', async ({ optionsPage }) => {
    // Create a profile first
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'Original Name')
    await optionsPage.selectOption('#proxyType', 'http')
    await optionsPage.fill('#proxyHost', '10.0.0.1')
    await optionsPage.fill('#proxyPort', '3128')
    await optionsPage.click('#saveProfileBtn')

    // Click Edit button
    await optionsPage.click('[data-action="edit"]')
    const modal = optionsPage.locator('#profileModal')
    await expect(modal).toHaveClass(/show/)
    await expect(optionsPage.locator('#profileModalTitle')).toHaveText('Edit Proxy Profile')

    // Verify form is populated
    await expect(optionsPage.locator('#profileName')).toHaveValue('Original Name')
    await expect(optionsPage.locator('#proxyHost')).toHaveValue('10.0.0.1')
    await expect(optionsPage.locator('#proxyPort')).toHaveValue('3128')

    // Modify and save
    await optionsPage.fill('#profileName', 'Updated Name')
    await optionsPage.fill('#proxyHost', '10.0.0.2')
    await optionsPage.click('#saveProfileBtn')

    const profileCard = optionsPage.locator('.profile-card')
    await expect(profileCard).toContainText('Updated Name')
    await expect(profileCard).toContainText('10.0.0.2:3128')
  })

  test('should edit a PAC profile and preserve pacUrl', async ({ optionsPage }) => {
    // Create PAC profile
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'PAC Edit Test')
    await optionsPage.selectOption('#proxyType', 'pac')
    await optionsPage.fill('#pacUrl', 'https://corp.example.com/proxy.pac')
    await optionsPage.click('#saveProfileBtn')

    // Edit it
    await optionsPage.click('[data-action="edit"]')
    await expect(optionsPage.locator('#proxyType')).toHaveValue('pac')
    await expect(optionsPage.locator('#pacUrl')).toHaveValue('https://corp.example.com/proxy.pac')
    await expect(optionsPage.locator('#pacDetails')).toBeVisible()
    await expect(optionsPage.locator('#proxyDetails')).toBeHidden()

    // Update URL
    await optionsPage.fill('#pacUrl', 'https://new.example.com/proxy.pac')
    await optionsPage.click('#saveProfileBtn')

    await expect(optionsPage.locator('.profile-card')).toContainText('https://new.example.com/proxy.pac')
  })

  test('should delete a profile', async ({ optionsPage }) => {
    // Create a profile
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'Delete Me')
    await optionsPage.selectOption('#proxyType', 'http')
    await optionsPage.fill('#proxyHost', '1.2.3.4')
    await optionsPage.fill('#proxyPort', '80')
    await optionsPage.click('#saveProfileBtn')
    await expect(optionsPage.locator('.profile-card')).toHaveCount(1)

    // Accept the confirm dialog
    optionsPage.on('dialog', dialog => dialog.accept())
    await optionsPage.click('[data-action="delete"]')

    // Verify profile is gone
    await expect(optionsPage.locator('.profile-card')).toHaveCount(0)
    await expect(optionsPage.locator('.empty-state')).toBeVisible()
  })

  test('should duplicate a profile', async ({ optionsPage }) => {
    // Create original
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'Original')
    await optionsPage.selectOption('#proxyType', 'socks5')
    await optionsPage.fill('#proxyHost', '10.0.0.1')
    await optionsPage.fill('#proxyPort', '1080')
    await optionsPage.click('#saveProfileBtn')

    // Duplicate
    await optionsPage.click('[data-action="duplicate"]')

    // Verify two cards exist
    const cards = optionsPage.locator('.profile-card')
    await expect(cards).toHaveCount(2)
    await expect(cards.nth(1)).toContainText('Original (Copy)')
    await expect(cards.nth(1)).toContainText('SOCKS5')
    await expect(cards.nth(1)).toContainText('10.0.0.1:1080')
  })

  test('should create multiple profiles of different types', async ({ optionsPage }) => {
    // HTTP
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'HTTP One')
    await optionsPage.selectOption('#proxyType', 'http')
    await optionsPage.fill('#proxyHost', '10.0.0.1')
    await optionsPage.fill('#proxyPort', '8080')
    await optionsPage.click('#saveProfileBtn')

    // SOCKS5
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'SOCKS One')
    await optionsPage.selectOption('#proxyType', 'socks5')
    await optionsPage.fill('#proxyHost', '10.0.0.2')
    await optionsPage.fill('#proxyPort', '1080')
    await optionsPage.click('#saveProfileBtn')

    // PAC
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'PAC One')
    await optionsPage.selectOption('#proxyType', 'pac')
    await optionsPage.fill('#pacUrl', 'http://pac.example.com/proxy.pac')
    await optionsPage.click('#saveProfileBtn')

    const cards = optionsPage.locator('.profile-card')
    await expect(cards).toHaveCount(3)
    await expect(cards.nth(0)).toContainText('HTTP/HTTPS')
    await expect(cards.nth(1)).toContainText('SOCKS5')
    await expect(cards.nth(2)).toContainText('PAC')
  })
})

test.describe('Options Page - Form Toggling', () => {
  test('should show host/port for HTTP type', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.selectOption('#proxyType', 'http')

    await expect(optionsPage.locator('#proxyDetails')).toBeVisible()
    await expect(optionsPage.locator('#pacDetails')).toBeHidden()
    await expect(optionsPage.locator('#authSection')).toBeVisible()
    await expect(optionsPage.locator('#routingSection')).toBeVisible()
  })

  test('should show host/port for SOCKS5 type', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.selectOption('#proxyType', 'socks5')

    await expect(optionsPage.locator('#proxyDetails')).toBeVisible()
    await expect(optionsPage.locator('#pacDetails')).toBeHidden()
    await expect(optionsPage.locator('#authSection')).toBeVisible()
    await expect(optionsPage.locator('#routingSection')).toBeVisible()
  })

  test('should show PAC URL field for PAC type', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.selectOption('#proxyType', 'pac')

    await expect(optionsPage.locator('#pacDetails')).toBeVisible()
    await expect(optionsPage.locator('#proxyDetails')).toBeHidden()
    await expect(optionsPage.locator('#authSection')).toBeHidden()
    await expect(optionsPage.locator('#routingSection')).toBeHidden()
  })

  test('should toggle back to HTTP fields from PAC', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')

    // Switch to PAC
    await optionsPage.selectOption('#proxyType', 'pac')
    await expect(optionsPage.locator('#pacDetails')).toBeVisible()
    await expect(optionsPage.locator('#proxyDetails')).toBeHidden()

    // Switch back to HTTP
    await optionsPage.selectOption('#proxyType', 'http')
    await expect(optionsPage.locator('#proxyDetails')).toBeVisible()
    await expect(optionsPage.locator('#pacDetails')).toBeHidden()
    await expect(optionsPage.locator('#authSection')).toBeVisible()
    await expect(optionsPage.locator('#routingSection')).toBeVisible()
  })
})

test.describe('Options Page - Form Validation', () => {
  test('should alert when profile name is empty', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#proxyHost', '1.2.3.4')
    await optionsPage.fill('#proxyPort', '8080')

    optionsPage.on('dialog', dialog => dialog.accept())
    await optionsPage.click('#saveProfileBtn')
    // If save succeeded there would be a profile card; there should be none
    await optionsPage.waitForTimeout(300)
    await expect(optionsPage.locator('.profile-card')).toHaveCount(0)
  })

  test('should alert when host is empty for HTTP profile', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'Test')
    await optionsPage.fill('#proxyPort', '8080')

    optionsPage.on('dialog', dialog => dialog.accept())
    await optionsPage.click('#saveProfileBtn')
    await optionsPage.waitForTimeout(300)
    await expect(optionsPage.locator('.profile-card')).toHaveCount(0)
  })

  test('should alert when PAC URL is empty for PAC profile', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'PAC Test')
    await optionsPage.selectOption('#proxyType', 'pac')

    optionsPage.on('dialog', dialog => dialog.accept())
    await optionsPage.click('#saveProfileBtn')
    await optionsPage.waitForTimeout(300)
    await expect(optionsPage.locator('.profile-card')).toHaveCount(0)
  })
})

test.describe('Options Page - Routing Rules', () => {
  test('should toggle routing rules panel', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')

    // Panel should be hidden initially
    await expect(optionsPage.locator('#routingRulesPanel')).toBeHidden()

    // Enable routing rules (checkbox is visually hidden, use force)
    await optionsPage.locator('label.switch').click()
    await expect(optionsPage.locator('#routingRulesPanel')).toBeVisible()

    // Disable routing rules
    await optionsPage.locator('label.switch').click()
    await expect(optionsPage.locator('#routingRulesPanel')).toBeHidden()
  })

  test('should create profile with whitelist routing rules', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'Routed Proxy')
    await optionsPage.selectOption('#proxyType', 'http')
    await optionsPage.fill('#proxyHost', '10.0.0.1')
    await optionsPage.fill('#proxyPort', '8080')

    // Enable routing
    await optionsPage.locator('label.switch').click()
    await optionsPage.locator('label.radio-option:has(#routingModeWhitelist)').click()
    await optionsPage.fill('#domainListTextarea', '*.google.com\ngithub.com')
    await optionsPage.click('#saveProfileBtn')

    await expect(optionsPage.locator('.profile-card')).toHaveCount(1)
    await expect(optionsPage.locator('.profile-card')).toContainText('Routed Proxy')
  })

  test('should create profile with blacklist routing rules', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'Blacklist Proxy')
    await optionsPage.selectOption('#proxyType', 'socks5')
    await optionsPage.fill('#proxyHost', '127.0.0.1')
    await optionsPage.fill('#proxyPort', '1080')

    await optionsPage.locator('label.switch').click()
    await optionsPage.locator('label.radio-option:has(#routingModeBlacklist)').click()
    await optionsPage.fill('#domainListTextarea', 'localhost\n127.0.0.1\n*.local')
    await optionsPage.click('#saveProfileBtn')

    await expect(optionsPage.locator('.profile-card')).toContainText('Blacklist Proxy')
  })

  test('should alert when routing enabled but no domains', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'No Domains')
    await optionsPage.selectOption('#proxyType', 'http')
    await optionsPage.fill('#proxyHost', '10.0.0.1')
    await optionsPage.fill('#proxyPort', '8080')
    await optionsPage.locator('label.switch').click()

    optionsPage.on('dialog', dialog => dialog.accept())
    await optionsPage.click('#saveProfileBtn')
    await optionsPage.waitForTimeout(300)
    await expect(optionsPage.locator('.profile-card')).toHaveCount(0)
  })

  test('should hide routing section for PAC type', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.selectOption('#proxyType', 'pac')
    await expect(optionsPage.locator('#routingSection')).toBeHidden()
  })
})

test.describe('Options Page - Authentication', () => {
  test('should save profile with auth credentials', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'Auth Proxy')
    await optionsPage.selectOption('#proxyType', 'http')
    await optionsPage.fill('#proxyHost', '10.0.0.1')
    await optionsPage.fill('#proxyPort', '8080')
    await optionsPage.fill('#proxyUsername', 'testuser')
    await optionsPage.fill('#proxyPassword', 'testpass')
    await optionsPage.click('#saveProfileBtn')

    // Edit to verify auth was saved
    await optionsPage.click('[data-action="edit"]')
    await expect(optionsPage.locator('#proxyUsername')).toHaveValue('testuser')
    await expect(optionsPage.locator('#proxyPassword')).toHaveValue('testpass')
  })

  test('should toggle password visibility', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    const passwordInput = optionsPage.locator('#proxyPassword')

    await expect(passwordInput).toHaveAttribute('type', 'password')
    await optionsPage.click('#togglePassword')
    await expect(passwordInput).toHaveAttribute('type', 'text')
    await optionsPage.click('#togglePassword')
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('should hide auth section for PAC type', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.selectOption('#proxyType', 'pac')
    await expect(optionsPage.locator('#authSection')).toBeHidden()
  })
})

test.describe('Options Page - Import/Export', () => {
  test('should export profiles as JSON', async ({ optionsPage }) => {
    // Create a profile first
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'Export Test')
    await optionsPage.selectOption('#proxyType', 'http')
    await optionsPage.fill('#proxyHost', '10.0.0.1')
    await optionsPage.fill('#proxyPort', '8080')
    await optionsPage.click('#saveProfileBtn')

    // Trigger export and capture the download
    const downloadPromise = optionsPage.waitForEvent('download')
    await optionsPage.click('#exportProfilesBtn')
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/x-proxy-profiles-.*\.json/)
  })

  test('should import profiles from JSON', async ({ optionsPage }) => {
    // Prepare import data
    const importData = JSON.stringify({
      format: 'x-proxy-export',
      version: 1,
      profiles: [
        {
          name: 'Imported HTTP',
          color: '#4CAF50',
          config: {
            type: 'http',
            host: '192.168.1.1',
            port: 3128,
            routingRules: { enabled: false, mode: 'whitelist', domains: [] }
          }
        },
        {
          name: 'Imported PAC',
          color: '#007AFF',
          config: {
            type: 'pac',
            pacUrl: 'http://import.example.com/proxy.pac',
            host: '',
            port: 0,
            routingRules: { enabled: false, mode: 'whitelist', domains: [] }
          }
        }
      ]
    })

    // Use fileChooser to handle file input
    const fileChooserPromise = optionsPage.waitForEvent('filechooser')
    await optionsPage.click('#importProfilesBtn')
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
      name: 'import.json',
      mimeType: 'application/json',
      buffer: Buffer.from(importData)
    })

    // Wait for import to complete
    await optionsPage.waitForTimeout(500)

    // Verify imported profiles
    const cards = optionsPage.locator('.profile-card')
    await expect(cards).toHaveCount(2)
    await expect(cards.nth(0)).toContainText('Imported HTTP')
    await expect(cards.nth(1)).toContainText('Imported PAC')
  })
})

test.describe('Options Page - About Section', () => {
  test('should navigate to About section', async ({ optionsPage }) => {
    await optionsPage.click('[data-section="about"]')
    await expect(optionsPage.locator('#about-section')).toBeVisible()
    await expect(optionsPage.locator('#about-section')).toContainText('X-Proxy v1.6.1')
  })

  test('should show feature list', async ({ optionsPage }) => {
    await optionsPage.click('[data-section="about"]')
    const aboutSection = optionsPage.locator('#about-section')
    await expect(aboutSection).toContainText('Multiple proxy profiles')
    await expect(aboutSection).toContainText('SOCKS5')
    await expect(aboutSection).toContainText('PAC (Auto-Config)')
    await expect(aboutSection).toContainText('Import/Export')
  })

  test('should navigate back to Profiles section', async ({ optionsPage }) => {
    await optionsPage.click('[data-section="about"]')
    await expect(optionsPage.locator('#about-section')).toBeVisible()

    await optionsPage.click('[data-section="profiles"]')
    await expect(optionsPage.locator('#profiles-section')).toBeVisible()
  })
})

test.describe('Options Page - Color Selection', () => {
  test('should select a profile color', async ({ optionsPage }) => {
    await optionsPage.click('#addProfileBtn')
    await optionsPage.fill('#profileName', 'Colored Profile')
    await optionsPage.selectOption('#proxyType', 'http')
    await optionsPage.fill('#proxyHost', '10.0.0.1')
    await optionsPage.fill('#proxyPort', '8080')

    // Select green color (radio input is hidden, use label or force)
    await optionsPage.click('label[for="color-green"]')
    await optionsPage.click('#saveProfileBtn')

    // Verify color indicator
    const colorIndicator = optionsPage.locator('.profile-color-indicator')
    await expect(colorIndicator).toHaveAttribute('style', /background:\s*#4CAF50/)
  })
})
