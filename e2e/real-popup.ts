import type { BrowserContext, Page } from '@playwright/test'

// Thin wrapper that drives the REAL browser-action popup over raw CDP.
// Playwright does not expose toolbar popups as `context.pages()` entries, so
// we attach directly to the popup target via the browser-level CDPSession
// and pipe Runtime.evaluate through Target.sendMessageToTarget.
//
// Usage:
//   const popup = await openRealPopup(context, extensionId)
//   if (!popup) return test.skip(true, 'browser-action popup unavailable')
//   await popup.click('#directConnection')
//   const state = await popup.getState()
//   await popup.close()

const DEFAULT_TIMEOUT = 5000

export interface RealPopup {
  click(selector: string): Promise<void>
  getState(): Promise<any>
  eval<T = unknown>(source: string): Promise<T>
  close(): Promise<void>
}

// Opens the real extension popup and returns a handle for interaction.
// Returns null when Chromium refuses to open it (wrong focus state, older build,
// etc.) so callers can cleanly skip.
export async function openRealPopup(
  context: BrowserContext,
  extensionId: string,
  options: { focusedPage?: Page; timeoutMs?: number } = {}
): Promise<RealPopup | null> {
  const { focusedPage, timeoutMs = DEFAULT_TIMEOUT } = options

  if (focusedPage) await focusedPage.bringToFront()

  const sw = context.serviceWorkers()[0]
  if (!sw) return null

  const browserCdp = await context.browser()!.newBrowserCDPSession()
  const popupUrl = `chrome-extension://${extensionId}/popup.html`

  try {
    await sw.evaluate(() => chrome.action.openPopup())
  } catch {
    // openPopup may reject when no normal window is focused; fall through to
    // the polling loop — sometimes it opens anyway.
  }

  // Poll Target.getTargets for the popup — it lands a few ms after openPopup().
  const deadline = Date.now() + timeoutMs
  let targetId: string | null = null
  while (Date.now() < deadline) {
    const { targetInfos } = (await browserCdp.send('Target.getTargets')) as any
    const hit = targetInfos.find(
      (t: any) => t.type === 'page' && t.url.startsWith(popupUrl)
    )
    if (hit) {
      targetId = hit.targetId
      break
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  if (!targetId) {
    await browserCdp.detach().catch(() => {})
    return null
  }

  const { sessionId } = (await browserCdp.send('Target.attachToTarget', {
    targetId,
    flatten: false,
  })) as any

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

  async function rawSend<T = any>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = ++msgId
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve, reject })
      browserCdp
        .send('Target.sendMessageToTarget', {
          sessionId,
          message: JSON.stringify({ id, method, params }),
        })
        .catch(reject)
    })
  }

  async function evalInPopup<T = unknown>(source: string): Promise<T> {
    const result: any = await rawSend('Runtime.evaluate', {
      expression: `(async () => { ${source} })()`,
      awaitPromise: true,
      returnByValue: true,
    })
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails))
    }
    return result.result?.value
  }

  // Wait for popup DOM content to render before the first interaction.
  await evalInPopup(`
    if (document.readyState !== 'complete') {
      await new Promise(r => {
        if (document.readyState === 'complete') r();
        else window.addEventListener('load', () => r(), { once: true });
      });
    }
    await new Promise(r => setTimeout(r, 400));
  `)

  return {
    async click(selector: string) {
      await evalInPopup(`
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) throw new Error('selector not found: ' + ${JSON.stringify(selector)});
        el.click();
        await new Promise(r => setTimeout(r, 400));
      `)
    },
    async getState() {
      return evalInPopup(`
        return await new Promise(resolve =>
          chrome.runtime.sendMessage({ type: 'GET_STATE' }, resolve)
        );
      `)
    },
    eval: evalInPopup,
    async close() {
      await browserCdp.detach().catch(() => {})
    },
  }
}

// Helper: seed one or more profiles into storage via an extension page.
export async function seedProfiles(
  context: BrowserContext,
  extensionId: string,
  profiles: Array<Record<string, unknown>>
): Promise<void> {
  const seedPage = await context.newPage()
  await seedPage.goto(`chrome-extension://${extensionId}/popup.html`)
  await seedPage.waitForLoadState('domcontentloaded')
  await seedPage.evaluate(async (ps) => {
    await chrome.storage.local.set({
      'x-proxy-data': {
        version: 2,
        mode: 'system',
        profiles: ps,
        activeProfileId: undefined,
        settings: {},
      },
    })
  }, profiles)
  await seedPage.close()
}

export function makeProfile(
  overrides: Partial<{
    id: string
    name: string
    color: string
    routingEnabled: boolean
    routingDomains: string[]
  }> = {}
) {
  const {
    id = 'p-' + Math.random().toString(36).slice(2, 8),
    name = 'Test',
    color = '#F44336',
    routingEnabled = false,
    routingDomains = [],
  } = overrides
  return {
    id,
    name,
    color,
    config: {
      type: 'http',
      host: '127.0.0.1',
      port: 8888,
      auth: { username: '', password: '' },
      bypassList: [],
      pacUrl: '',
      routingRules: { enabled: routingEnabled, mode: 'whitelist', domains: routingDomains },
    },
  }
}
