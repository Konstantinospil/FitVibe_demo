import type { Page } from "@playwright/test";

/**
 * Creates masks for dynamic regions that should be excluded from visual comparisons.
 * Per QA Plan D.8 - Masking Dynamic Regions
 */
export async function getDynamicMasks(page: Page) {
  const masks = [
    // Timestamps
    page.locator("[data-testid*='timestamp'], [data-testid*='time'], [data-testid*='date']"),
    // Avatars
    page.locator("img[alt*='avatar'], img[alt*='Avatar'], [data-testid*='avatar']"),
    // Charts and sparklines
    page.locator("canvas, svg[data-testid*='chart'], [data-testid*='sparkline']"),
    // Animated loaders
    page.locator("[data-testid*='loader'], [data-testid*='spinner'], [aria-label*='loading']"),
    // Live counters
    page.locator("[data-testid*='counter'], [data-testid*='count']"),
    // User-generated content that may vary
    page.locator("[data-testid*='user-content']"),
  ];

  // In CI, log which masks are being applied for debugging
  if (process.env.CI) {
    const maskCounts = await Promise.all(
      masks.map(async (mask) => {
        const count = await mask.count();
        return count;
      }),
    );

    const totalMasks = maskCounts.reduce((sum, count) => sum + count, 0);
    const activeMaskTypes = maskCounts.filter((count) => count > 0).length;
    if (totalMasks > 0) {
      // Use console.warn for CI debugging (allowed by linter)
      await page.evaluate(
        (info) => {
          console.warn(
            `[Visual Test] Applying ${info.total} dynamic masks across ${info.types} mask types`,
          );
        },
        { total: totalMasks, types: activeMaskTypes },
      );
    }
  }

  return masks;
}

/**
 * Masks specific elements by selector
 */
export function maskSelector(page: Page, selector: string) {
  return page.locator(selector);
}
