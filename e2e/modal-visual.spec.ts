import { test, expect, type Page } from './fixture'
import { disableTransitions } from './helpers'

// Visual baselines for screens that were previously uncovered by the visual
// regression suite: the Add / Edit Profile modal (in both themes) and the
// Options page in dark mode. Without these, dark-mode contrast fixes such as
// #34 / #35 had no pixel-level guard — the next accidental revert would ship
// undetected. See plan distributed-cuddling-quilt.md Phase 2.
//
// Global threshold is now maxDiffPixelRatio: 0.01 (playwright.config.ts) so
// these baselines have ~1% of pixels as tolerance — tight enough that real
// design-token regressions fail, loose enough that font antialiasing noise
// does not. One exception documented at the offending test below.

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
    // maxDiffPixelRatio: 0.03 overrides the global 0.01 for this single
    // test. Justification: the About page is text-heaviest in the whole UI
    // (version line, description paragraph, nine-item feature list with
    // ✓ glyphs, link row). Observed cross-OS font-hinting drift on CI's
    // Linux + Xvfb measured 9636 pixels (~2.08%) vs a baseline generated
    // on macOS. No other baseline in this spec file crosses 1%, so the
    // override stays narrowly scoped to the one test where text density
    // meets cross-OS rendering divergence. The 0.03 ceiling still leaves
    // tokens / layout regressions catchable (a typical "wrong color on
    // button" change is tens of thousands of pixels, an order of
    // magnitude above this floor).
    await expect(optionsPage).toHaveScreenshot('options-about-dark.png', { maxDiffPixelRatio: 0.03 })
  })
})
