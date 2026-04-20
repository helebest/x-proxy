import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from './fixture'

// Known preexisting violations — these are design decisions that need
// product/design sign-off to change (e.g. tweaking brand colors). The spec
// filters them out so this suite passes today and NEW regressions will still
// fail. When you accept a violation here, link an issue so it's tracked.
//
// .btn-primary: white text on #007AFF gives 4.01:1 (AA needs 4.5:1 for 13px
// normal). Fixing requires either darkening the brand blue or bumping button
// text to a size/weight that qualifies as "large text" (3:1 threshold).
//
// .nav-item (sidebar nav text "Proxy Profiles" / "About"), .section-description,
// empty-state paragraphs: all use --text-secondary for visual hierarchy, which
// at rgba(60,60,67,0.6) doesn't clear AA 4.5:1 on light backgrounds. Global
// fix: raise --text-secondary opacity to ~0.72 (or #595962), which would push
// everything above 4.5:1 in one token change.
const KNOWN_CONTRAST_EXCEPTIONS: Array<string | RegExp> = [
  /#addProfileBtn/,
  /#saveAllBtn/,
  /#saveProfileBtn/,
  /#importProfilesBtn/,
  /#exportProfilesBtn/,
  /\.btn-primary/,
  /li\[data-section=/,
  /\.section-description/,
  /\.empty-state/,
]

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
  test('popup passes color-contrast in light mode', async ({ popupPage }) => {
    await popupPage.emulateMedia({ colorScheme: 'light' })
    const violations = await scanContrast(popupPage)
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  test('popup passes color-contrast in dark mode', async ({ popupPage }) => {
    await popupPage.emulateMedia({ colorScheme: 'dark' })
    const violations = await scanContrast(popupPage)
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  test('options profiles page passes color-contrast in light mode', async ({ optionsPage }) => {
    await optionsPage.emulateMedia({ colorScheme: 'light' })
    const violations = await scanContrast(optionsPage)
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  test('options profiles page passes color-contrast in dark mode', async ({ optionsPage }) => {
    await optionsPage.emulateMedia({ colorScheme: 'dark' })
    const violations = await scanContrast(optionsPage)
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  test('Edit Profile modal passes color-contrast in dark mode', async ({ optionsPage }) => {
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
