import { test, expect, type Page } from './fixture'

// E2E regression guard for v1 → v2 storage migration.
//
// lib/storage-migration.js has exhaustive Vitest unit tests in
// tests/mode-migration.test.js (11 cases covering every branch). This spec
// exists to catch a different class of regression: someone unhooking
// migrateData() from the read or write path, which unit tests would not
// detect because they call the function directly.
//
// Scope note — what's NOT tested here and why:
//   UI-level "seed v1 → popup shows migrated mode" would be complementary
//   but requires forcing the background service worker to re-initialize
//   against the seeded data (the worker caches its state on first boot).
//   chrome.runtime.reload() in a persistent Playwright context leaves the
//   extension in a transient ERR_BLOCKED_BY_CLIENT state that does not
//   reliably clear within a reasonable timeout. With full unit coverage
//   already in place, the E2E value is in *integration* — that migrate is
//   actually wired up on read + write — which the three tests below cover.
//
// The three tests pin down integration invariants that would silently
// break if someone bypassed migrateData():
//   - Read path is non-destructive (storage stays v1 when only read)
//   - First write through the System button upgrades to v2
//   - First write through the Direct button also upgrades to v2 with the
//     distinct mode value (covers v2's raison d'être branch — Direct vs
//     System — that the System-only test wouldn't distinguish)

type V1Profile = { id: string; name: string; type: string; host: string; port: number }

async function seedV1(page: Page, shape: {
  activeProfileId?: string
  profiles?: V1Profile[]
}) {
  await page.evaluate(async (data) => {
    await chrome.storage.local.set({
      'x-proxy-data': {
        version: 1,
        profiles: data.profiles || [],
        activeProfileId: data.activeProfileId,
        settings: {},
      },
    })
  }, shape)
}

async function readStorageRaw(page: Page) {
  return page.evaluate(async () => {
    const result = await chrome.storage.local.get(['x-proxy-data'])
    return result['x-proxy-data']
  })
}

const SAMPLE_PROFILE: V1Profile = {
  id: 'p1',
  name: 'Sample',
  type: 'http',
  host: '127.0.0.1',
  port: 8080,
}

test.describe('Storage migration v1 → v2 (integration guard)', () => {
  test('reading v1 data through the popup does not mutate storage shape', async ({ popupPage }) => {
    // Invariant: migrateData() is pure. popup.js calls it for rendering
    // state, which must NOT silently rewrite storage to v2 — that would
    // mutate user data on mere popup opens and mask read-path bugs. If
    // someone adds a "helpful" auto-persist in the read path, this fails.
    await seedV1(popupPage, {
      profiles: [SAMPLE_PROFILE],
      activeProfileId: 'p1',
    })
    await popupPage.reload()
    await popupPage.waitForLoadState('domcontentloaded')
    await popupPage.waitForTimeout(500)

    const raw = await readStorageRaw(popupPage)
    // Still v1-shaped: version=1, no top-level `mode` field.
    expect(raw.version).toBe(1)
    expect(raw.mode).toBeUndefined()
    expect(raw.activeProfileId).toBe('p1')
  })

  test('clicking System after v1 data is present upgrades storage to v2', async ({ popupPage }) => {
    // When an action actually persists state, v2 shape takes over. This
    // pins down the "lazy-upgrade-on-first-write" contract. If someone
    // disconnects migrateData() from the write path, or forgets to set
    // version: SCHEMA_VERSION in writeData(), this fails.
    await seedV1(popupPage, {
      profiles: [SAMPLE_PROFILE],
      activeProfileId: 'p1',
    })
    await popupPage.reload()
    await popupPage.waitForLoadState('domcontentloaded')
    await popupPage.waitForTimeout(500)

    await popupPage.click('#systemProxy')
    await popupPage.waitForTimeout(500)

    const raw = await readStorageRaw(popupPage)
    expect(raw.version).toBe(2)
    expect(raw.mode).toBe('system')
    expect(raw.activeProfileId).toBeUndefined()
    // Profiles array is preserved through the upgrade.
    expect(raw.profiles).toHaveLength(1)
    expect(raw.profiles[0].id).toBe('p1')
  })

  test('clicking Direct after v1 data is present upgrades storage to v2 with mode=direct', async ({ popupPage }) => {
    // Same write-path guard for Direct mode, since Direct is newer (1.6.0)
    // and the v2 schema was introduced specifically to represent it
    // distinctly from System. A regression that collapses Direct back onto
    // System would not be caught by the previous test alone.
    await seedV1(popupPage, {
      profiles: [SAMPLE_PROFILE],
      activeProfileId: 'p1',
    })
    await popupPage.reload()
    await popupPage.waitForLoadState('domcontentloaded')
    await popupPage.waitForTimeout(500)

    await popupPage.click('#directConnection')
    await popupPage.waitForTimeout(500)

    const raw = await readStorageRaw(popupPage)
    expect(raw.version).toBe(2)
    expect(raw.mode).toBe('direct')
    expect(raw.activeProfileId).toBeUndefined()
  })
})
