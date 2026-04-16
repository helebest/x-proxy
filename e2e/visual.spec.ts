import { test, expect } from './fixture'

test.describe('Visual Regression - Popup', () => {
  test('popup default state', async ({ popupPage }) => {
    await expect(popupPage).toHaveScreenshot('popup-default.png')
  })

  test('popup dark mode', async ({ popupPage }) => {
    await popupPage.emulateMedia({ colorScheme: 'dark' })
    await expect(popupPage).toHaveScreenshot('popup-dark.png')
  })
})

test.describe('Visual Regression - Options', () => {
  test('options profiles section', async ({ optionsPage }) => {
    await expect(optionsPage).toHaveScreenshot('options-profiles.png')
  })

  test('options about section', async ({ optionsPage }) => {
    await optionsPage.click('[data-section="about"]')
    await optionsPage.waitForSelector('#about-section', { state: 'visible' })
    await expect(optionsPage).toHaveScreenshot('options-about.png')
  })
})
