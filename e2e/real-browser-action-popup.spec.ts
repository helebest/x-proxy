import { test, expect } from './fixture'
import { openRealPopup, seedProfiles, makeProfile } from './real-popup'

// End-to-end coverage of clicks inside the REAL toolbar popup (the one a user
// gets by clicking the extension icon), driven via chrome.action.openPopup()
// + raw CDP. See e2e/real-popup.ts for the bridge that works around
// Playwright's lack of Page support for browser-action popups.
//
// The active "browsing" tab is intentionally left on about:blank — that's the
// new-tab-page scenario where the earlier icon-repaint bug manifested.

const RED = '#F44336'
const BLUE = '#007AFF'
const GREEN = '#4CAF50'

async function setupBlankTab(context: import('@playwright/test').BrowserContext) {
  const page = await context.newPage()
  await page.bringToFront()
  return page
}

async function openPopupOrSkip(
  context: import('@playwright/test').BrowserContext,
  extensionId: string,
  focusedPage: import('@playwright/test').Page
) {
  const popup = await openRealPopup(context, extensionId, { focusedPage })
  if (!popup) {
    test.skip(true, 'browser-action popup could not be opened on this Chromium build')
    throw new Error('unreachable')
  }
  return popup
}

test.describe('Real browser-action popup — click interactions', () => {
  test('activating a profile repaints the toolbar icon with the profile color', async ({ context, extensionId }) => {
    const focused = await setupBlankTab(context)
    await seedProfiles(context, extensionId, [makeProfile({ id: 'p-red', color: RED })])

    const popup = await openPopupOrSkip(context, extensionId, focused)
    await popup.click('.profile-item')

    const state = await popup.getState()
    expect(state.success).toBe(true)
    expect(state.mode).toBe('profile')
    expect(state.activeProfile?.id).toBe('p-red')
    expect(state.lastIconColor).toBe(RED)
    await popup.close()
  })

  test('clicking Direct switches mode to direct and clears icon color', async ({ context, extensionId }) => {
    const focused = await setupBlankTab(context)
    await seedProfiles(context, extensionId, [makeProfile({ id: 'p-red', color: RED })])

    const popup = await openPopupOrSkip(context, extensionId, focused)
    await popup.click('#directConnection')

    const state = await popup.getState()
    expect(state.mode).toBe('direct')
    expect(state.isDirectMode).toBe(true)
    expect(state.activeProfile).toBeFalsy()
    expect(state.lastIconColor).toBe(null)
    await popup.close()
  })

  test('clicking System switches mode to system and clears icon color', async ({ context, extensionId }) => {
    const focused = await setupBlankTab(context)
    await seedProfiles(context, extensionId, [makeProfile({ id: 'p-red', color: RED })])

    const popup = await openPopupOrSkip(context, extensionId, focused)
    // activate a profile first so system is a real state transition, not the default
    await popup.click('.profile-item')
    await popup.click('#systemProxy')

    const state = await popup.getState()
    expect(state.mode).toBe('system')
    expect(state.isSystemProxy).toBe(true)
    expect(state.activeProfile).toBeFalsy()
    expect(state.lastIconColor).toBe(null)
    await popup.close()
  })

  test('switching between profiles updates the icon color each time', async ({ context, extensionId }) => {
    const focused = await setupBlankTab(context)
    await seedProfiles(context, extensionId, [
      makeProfile({ id: 'p-red', name: 'Red', color: RED }),
      makeProfile({ id: 'p-blue', name: 'Blue', color: BLUE }),
      makeProfile({ id: 'p-green', name: 'Green', color: GREEN }),
    ])

    const popup = await openPopupOrSkip(context, extensionId, focused)
    // Profiles render in insertion order. Click the third (green) first, then
    // second (blue), then first (red) — verifies the icon tracks each click.
    await popup.click('.profile-item:nth-child(3)')
    let state = await popup.getState()
    expect(state.activeProfile?.id).toBe('p-green')
    expect(state.lastIconColor).toBe(GREEN)

    await popup.click('.profile-item:nth-child(2)')
    state = await popup.getState()
    expect(state.activeProfile?.id).toBe('p-blue')
    expect(state.lastIconColor).toBe(BLUE)

    await popup.click('.profile-item:nth-child(1)')
    state = await popup.getState()
    expect(state.activeProfile?.id).toBe('p-red')
    expect(state.lastIconColor).toBe(RED)
    await popup.close()
  })

  test('profile → Direct → profile round-trip leaves the icon reflecting the latest selection', async ({ context, extensionId }) => {
    const focused = await setupBlankTab(context)
    await seedProfiles(context, extensionId, [makeProfile({ id: 'p-blue', color: BLUE })])

    const popup = await openPopupOrSkip(context, extensionId, focused)
    await popup.click('.profile-item')
    expect((await popup.getState()).lastIconColor).toBe(BLUE)

    await popup.click('#directConnection')
    expect((await popup.getState()).lastIconColor).toBe(null)

    await popup.click('.profile-item')
    const state = await popup.getState()
    expect(state.mode).toBe('profile')
    expect(state.activeProfile?.id).toBe('p-blue')
    expect(state.lastIconColor).toBe(BLUE)
    await popup.close()
  })

  test('popup status text and selected state follow the active mode', async ({ context, extensionId }) => {
    const focused = await setupBlankTab(context)
    await seedProfiles(context, extensionId, [makeProfile({ id: 'p-red', name: 'Red', color: RED })])

    const popup = await openPopupOrSkip(context, extensionId, focused)

    // Initial state — system.
    expect(await popup.eval(`return document.querySelector('#statusText').textContent.trim();`)).toBe('System')
    expect(await popup.eval(`return document.querySelector('#systemProxy').classList.contains('selected');`)).toBe(true)

    // Direct.
    await popup.click('#directConnection')
    expect(await popup.eval(`return document.querySelector('#statusText').textContent.trim();`)).toBe('Direct')
    expect(await popup.eval(`return document.querySelector('#directConnection').classList.contains('selected');`)).toBe(true)
    expect(await popup.eval(`return document.querySelector('#systemProxy').classList.contains('selected');`)).toBe(false)

    // Profile.
    await popup.click('.profile-item')
    expect(await popup.eval(`return document.querySelector('#statusText').textContent.trim();`)).toBe('Red')
    expect(await popup.eval(`return document.querySelector('.profile-item').classList.contains('active');`)).toBe(true)
    expect(await popup.eval(`return document.querySelector('#directConnection').classList.contains('selected');`)).toBe(false)
    await popup.close()
  })
})
