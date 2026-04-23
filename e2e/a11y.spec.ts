import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from './fixture'
import { disableTransitions } from './helpers'

// Known preexisting violations — filtered here so the suite passes today while
// NEW regressions still fail. Keep this list minimal and annotated: each entry
// is a design decision the project has consciously accepted. Empty by default.
const KNOWN_CONTRAST_EXCEPTIONS: Array<string | RegExp> = []

function isKnownException(target: string[]): boolean {
  return target.some(sel =>
    KNOWN_CONTRAST_EXCEPTIONS.some(ex =>
      typeof ex === 'string' ? sel.includes(ex) : ex.test(sel)
    )
  )
}

// Runs axe's color-contrast rule against a page, optionally scoped to a
// selector. Returns violations (minus known exceptions), each annotated with
// the offending element's HTML snippet + computed fg/bg so failures are
// self-explanatory.
async function scanContrast(page: Page, include?: string) {
  let builder = new AxeBuilder({ page })
    .withRules(['color-contrast'])
  if (include) builder = builder.include(include)
  const { violations } = await builder.analyze()
  return violations
    .flatMap(v =>
      v.nodes.map(n => ({
        rule: v.id,
        impact: v.impact,
        target: n.target as string[],
        summary: n.failureSummary,
        html: n.html,
      }))
    )
    .filter(v => !isKnownException(v.target))
}

async function openEditModal(optionsPage: Page) {
  await optionsPage.click('#addProfileBtn')
  await optionsPage.waitForSelector('#profileModal.active, #profileModal.show, #profileModal[style*="flex"], #profileModal[style*="block"]', {
    state: 'visible',
    timeout: 2000,
  }).catch(() => {
    // Fallback: the modal may toggle via a class we don't know — just wait for inputs
    return optionsPage.waitForSelector('#profileName', { state: 'visible', timeout: 2000 })
  })
}

test.describe('Accessibility — color contrast', () => {
  // NOTE: disableTransitions MUST run before emulateMedia. Otherwise, the
  // transitions are already armed at the moment the media flip happens, and
  // the in-flight color animation is what the !important rule can't unwind.
  test('popup passes color-contrast in light mode', async ({ popupPage }) => {
    await disableTransitions(popupPage)
    await popupPage.emulateMedia({ colorScheme: 'light' })
    const violations = await scanContrast(popupPage)
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  test('popup passes color-contrast in dark mode', async ({ popupPage }) => {
    await disableTransitions(popupPage)
    await popupPage.emulateMedia({ colorScheme: 'dark' })
    const violations = await scanContrast(popupPage)
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  test('options profiles page passes color-contrast in light mode', async ({ optionsPage }) => {
    await disableTransitions(optionsPage)
    await optionsPage.emulateMedia({ colorScheme: 'light' })
    const violations = await scanContrast(optionsPage)
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  test('options profiles page passes color-contrast in dark mode', async ({ optionsPage }) => {
    await disableTransitions(optionsPage)
    await optionsPage.emulateMedia({ colorScheme: 'dark' })
    const violations = await scanContrast(optionsPage)
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  test('Edit Profile modal passes color-contrast in dark mode', async ({ optionsPage }) => {
    await disableTransitions(optionsPage)
    await optionsPage.emulateMedia({ colorScheme: 'dark' })
    await openEditModal(optionsPage)

    // Exercise a populated input so the color-contrast rule has real value
    // text to measure, not just an empty placeholder.
    await optionsPage.fill('#profileName', 'Sample Profile')
    await optionsPage.fill('#proxyHost', '127.0.0.1').catch(() => {})
    await optionsPage.fill('#proxyPort', '8080').catch(() => {})

    const violations = await scanContrast(optionsPage, '#profileModal')
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })
})
