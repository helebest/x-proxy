import { test, expect, type Page } from './fixture'

// Visual baselines for screens that were previously uncovered by the visual
// regression suite: the Add / Edit Profile modal (in both themes) and the
// Options page in dark mode. Without these, dark-mode contrast fixes such as
// #34 / #35 had no pixel-level guard — the next accidental revert would ship
// undetected. See plan distributed-cuddling-quilt.md Phase 2.
//
// Global threshold is now maxDiffPixelRatio: 0.01 (playwright.config.ts) so
// these baselines have ~1% of pixels as tolerance — tight enough that real
// design-token regressions fail, loose enough that font antialiasing noise
// does not.

// Kill CSS transitions and animations before any emulateMedia flip. Rationale
// documented in detail in e2e/a11y.spec.ts: without this, the ~250ms color
// transition interpolates between old and new var() values and the
// screenshot captures a mid-transition state, not the final pixel. Must run
// BEFORE emulateMedia so transitions are disarmed at the moment the media
// change fires.
async function disableTransitions(page: Page) {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      transition: none !important;
      animation-duration: 0s !important;
      animation-delay: 0s !important;
    }`,
  })
}

// Seed a single deterministic profile into chrome.storage.local so the Edit
// Profile modal has a real card to trigger from. Shape matches v2 schema as
// written in lib/storage-migration.js so no migration hops happen mid-test.
async function seedSingleProfile(page: Page) {
  await page.evaluate(async () => {
    await chrome.storage.local.set({
      'x-proxy-data': {
        version: 2,
        mode: 'system',
        activeProfileId: undefined,
        profiles: [
          {
            id: 'p-modal-visual',
            name: 'Sample HTTP Profile',
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
          },
        ],
        settings: {},
      },
    })
  })
}

async function openAddModal(page: Page) {
  await page.click('#addProfileBtn')
  await expect(page.locator('#profileModal')).toHaveClass(/show/)
}

async function openEditModal(page: Page) {
  await page.click('[data-action="edit"]')
  await expect(page.locator('#profileModal')).toHaveClass(/show/)
  await expect(page.locator('#profileModalTitle')).toHaveText('Edit Proxy Profile')
}

test.describe('Modal visual baselines (Phase 2)', () => {
  test('Add Profile modal — light mode', async ({ optionsPage }) => {
    await disableTransitions(optionsPage)
    await optionsPage.emulateMedia({ colorScheme: 'light' })
    await openAddModal(optionsPage)
    await expect(optionsPage).toHaveScreenshot('modal-add-light.png')
  })

  test('Add Profile modal — dark mode', async ({ optionsPage }) => {
    await disableTransitions(optionsPage)
    await optionsPage.emulateMedia({ colorScheme: 'dark' })
    await openAddModal(optionsPage)
    await expect(optionsPage).toHaveScreenshot('modal-add-dark.png')
  })

  test('Edit Profile modal — light mode', async ({ optionsPage }) => {
    await optionsPage.emulateMedia({ colorScheme: 'light' })
    await seedSingleProfile(optionsPage)
    await optionsPage.reload()
    await optionsPage.waitForLoadState('domcontentloaded')
    // addStyleTag is wiped by reload — re-apply in the new document.
    await disableTransitions(optionsPage)
    await openEditModal(optionsPage)
    await expect(optionsPage).toHaveScreenshot('modal-edit-light.png')
  })

  test('Edit Profile modal — dark mode', async ({ optionsPage }) => {
    await optionsPage.emulateMedia({ colorScheme: 'dark' })
    await seedSingleProfile(optionsPage)
    await optionsPage.reload()
    await optionsPage.waitForLoadState('domcontentloaded')
    await disableTransitions(optionsPage)
    await openEditModal(optionsPage)
    await expect(optionsPage).toHaveScreenshot('modal-edit-dark.png')
  })
})

test.describe('Options page dark mode baselines (Phase 2)', () => {
  test('Profiles section — dark mode', async ({ optionsPage }) => {
    await disableTransitions(optionsPage)
    await optionsPage.emulateMedia({ colorScheme: 'dark' })
    await expect(optionsPage).toHaveScreenshot('options-profiles-dark.png')
  })

  test('About section — dark mode', async ({ optionsPage }) => {
    await disableTransitions(optionsPage)
    await optionsPage.emulateMedia({ colorScheme: 'dark' })
    await optionsPage.click('[data-section="about"]')
    await expect(optionsPage.locator('#about-section')).toBeVisible()
    await expect(optionsPage).toHaveScreenshot('options-about-dark.png')
  })
})
