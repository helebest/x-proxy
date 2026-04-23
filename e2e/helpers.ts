import type { Page } from '@playwright/test'

/**
 * Disable all CSS transitions and animations on the page.
 *
 * Must run **before** `page.emulateMedia({ colorScheme: ... })` when a test
 * flips the color scheme. Rationale observed empirically:
 *   emulateMedia flips :root custom properties synchronously, but elements
 *   with `transition: all var(--transition-base)` animate their resolved
 *   color between the old and new var() value over the transition duration
 *   (~250ms in this design system). Axe / toHaveScreenshot sampling during
 *   that window read intermediate rgba values and report spurious diffs.
 *
 * `playwright.config.ts`'s `toHaveScreenshot.animations: 'disabled'` only
 * applies to screenshots. Axe runs in-page JS and needs CSS-level
 * suppression. This helper handles both.
 *
 * Shared between a11y.spec.ts and modal-visual.spec.ts — extracted because
 * the code was a verbatim duplicate.
 */
export async function disableTransitions(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      transition: none !important;
      animation-duration: 0s !important;
      animation-delay: 0s !important;
    }`,
  })
}
