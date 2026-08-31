import type { Page } from "@playwright/test";

/**
 * Freeze Date.now() only. Do not replace the Date constructor or install Playwright
 * fake timers — both prevent the production bundle from mounting.
 */
export async function freezeTime(page: Page, iso = "2025-10-01T12:00:00.000Z"): Promise<void> {
  const fixedTimestamp = Date.parse(iso);
  await page.addInitScript((timestamp: number) => {
    Date.now = () => timestamp;
  }, fixedTimestamp);
}
