import { test, expect } from './fixture'

// Drives the REAL browser-action popup — the tiny window that appears when a
// user clicks the extension's toolbar icon — via chrome.action.openPopup() +
// raw Chrome DevTools Protocol (CDP). Playwright's high-level Page API does
// not surface browser-action popups as `context.pages()` entries (verified on
// current bundled Chromium), so we work at the CDP target level: list targets,
// find the popup target, attach, evaluate script inside it.

const RED = '#F44336'
const POPUP_TIMEOUT_MS = 5000

test('activate profile from the real browser-action popup updates icon immediately', async ({ context, extensionId }) => {
  // A focused normal window is required for openPopup() to anchor. We
  // deliberately leave the active tab on about:blank — the user hits this bug
  // when clicking the toolbar icon from the new-tab page (non-http URL).
  const browsingTab = await context.newPage()
  await browsingTab.bringToFront()

  // Seed a red profile.
  const seedPage = await context.newPage()
  await seedPage.goto(`chrome-extension://${extensionId}/popup.html`)
  await seedPage.waitForLoadState('domcontentloaded')
  await seedPage.evaluate(async (color) => {
    await chrome.storage.local.set({
      'x-proxy-data': {
        version: 2,
        mode: 'system',
        profiles: [{
          id: 'p-red',
          name: 'Red',
          color,
          config: {
            type: 'http', host: '127.0.0.1', port: 8888,
            auth: { username: '', password: '' },
            bypassList: [], pacUrl: '',
            routingRules: { enabled: false, mode: 'whitelist', domains: [] }
          }
        }],
        activeProfileId: undefined,
        settings: {}
      }
    })
  }, RED)
  await seedPage.close()
  await browsingTab.bringToFront()

  // Open a browser-level CDP session so we can enumerate all targets
  // (a per-page session would only see that page's children).
  const browserCdp = await context.browser()!.newBrowserCDPSession()

  const popupUrl = `chrome-extension://${extensionId}/popup.html`

  // Fire the real browser-action popup from the service worker.
  const sw = context.serviceWorkers()[0]
  let openError: string | null = null
  try {
    await sw.evaluate(() => chrome.action.openPopup())
  } catch (e: any) {
    openError = e?.message || String(e)
  }

  // Poll Target.getTargets for up to POPUP_TIMEOUT_MS — the popup may land a
  // few ms after openPopup() resolves.
  let targetId: string | null = null
  const deadline = Date.now() + POPUP_TIMEOUT_MS
  while (Date.now() < deadline) {
    const { targetInfos } = await browserCdp.send('Target.getTargets') as any
    const hit = targetInfos.find((t: any) =>
      t.type === 'page' && t.url.startsWith(popupUrl)
    )
    if (hit) { targetId = hit.targetId; break }
    await new Promise(r => setTimeout(r, 100))
  }
  if (!targetId) {
    // Popup didn't materialize — Chromium build / focus state doesn't
    // permit it. The popup-window-icon.spec.ts suite covers the same bug
    // via chrome.windows.create({type:'popup'}), so we skip rather than
    // fail hard.
    test.skip(true, `browser-action popup target never appeared (openPopup error: ${openError ?? 'none'})`)
    return
  }

  // Attach to the popup target with flatten:false so we can pipe raw CDP
  // through Target.sendMessageToTarget — Playwright doesn't expose a public
  // CDPSession for arbitrary (non-Page) targets, so we route everything
  // manually through the browser session.
  const { sessionId } = await browserCdp.send('Target.attachToTarget', {
    targetId,
    flatten: false,
  }) as any

  let msgId = 0
  const pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>()
  browserCdp.on('Target.receivedMessageFromTarget', (ev: any) => {
    if (ev.sessionId !== sessionId) return
    const parsed = JSON.parse(ev.message)
    const p = pending.get(parsed.id)
    if (!p) return
    pending.delete(parsed.id)
    if (parsed.error) p.reject(new Error(parsed.error.message || 'CDP error'))
    else p.resolve(parsed.result)
  })

  async function sendToPopup<T = any>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = ++msgId
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve, reject })
      browserCdp.send('Target.sendMessageToTarget', {
        sessionId,
        message: JSON.stringify({ id, method, params }),
      }).catch(reject)
    })
  }

  async function popupEval<T = unknown>(source: string): Promise<T> {
    const result: any = await sendToPopup('Runtime.evaluate', {
      expression: `(async () => { ${source} })()`,
      awaitPromise: true,
      returnByValue: true,
    })
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails))
    }
    return result.result?.value
  }

  // Wait for popup DOM to be ready, then click the first profile item.
  await popupEval(`
    await new Promise(r => setTimeout(r, 500));
    const item = document.querySelector('.profile-item');
    if (!item) throw new Error('profile-item not rendered');
    item.click();
    await new Promise(r => setTimeout(r, 500));
  `)

  // Read last icon color from the popup via chrome.runtime.sendMessage.
  const state = await popupEval<any>(`
    return await new Promise(resolve =>
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, resolve)
    );
  `)

  expect(state?.success).toBe(true)
  expect(state?.mode).toBe('profile')
  expect(state?.lastIconColor, 'real-popup activation must repaint toolbar icon').toBe(RED)
})
