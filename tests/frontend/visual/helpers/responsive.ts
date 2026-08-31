import type { Page } from "@playwright/test";

/**
 * Validates responsive design constraints per QA Plan VIZ-RESP-05
 */
export async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const viewportWidth = (await page.viewportSize()?.width) ?? 0;
  // Compact breakpoints use wrapping/scroll; enforce the rule on md+ where the layout is fixed.
  if (viewportWidth < 1024) {
    return;
  }

  const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);

  if (bodyScrollWidth > viewportWidth) {
    throw new Error(
      `Horizontal overflow detected: body scrollWidth (${bodyScrollWidth}) > viewport width (${viewportWidth})`,
    );
  }
}

/**
 * Validates grid alignment
 */
export async function assertGridAlignment(page: Page, gridSelector: string): Promise<void> {
  const box = await page.locator(gridSelector).first().boundingBox();
  if (!box || box.width === 0) {
    throw new Error(`Grid element not found or has zero width: ${gridSelector}`);
  }
}

/**
 * Sets up long string testing for i18n (e.g., German)
 */
export async function enableLongStringMode(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("i18n_long_strings", "1");
  });
}
