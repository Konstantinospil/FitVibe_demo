import type { Page } from "@playwright/test";

/**
 * Freezes time in the browser to a fixed UTC timestamp for deterministic visual tests.
 * Per QA Plan D.4 - Determinism Controls
 */
export async function freezeTime(page: Page, iso = "2025-10-01T12:00:00.000Z"): Promise<void> {
  const fixedTimestamp = Date.parse(iso);
  await page.addInitScript((timestamp: number) => {
    // Override Date.now and new Date()
    const originalDate = Date;
    // Overriding Date for test determinism
    (globalThis as any).Date = class extends originalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(timestamp);
        } else if (args.length === 1) {
          super(args[0]);
        } else if (args.length === 2) {
          super(args[0], args[1]);
        } else if (args.length === 3) {
          super(args[0], args[1], args[2]);
        } else if (args.length === 4) {
          super(args[0], args[1], args[2], args[3]);
        } else if (args.length === 5) {
          super(args[0], args[1], args[2], args[3], args[4]);
        } else if (args.length === 6) {
          super(args[0], args[1], args[2], args[3], args[4], args[5]);
        } else {
          super(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
        }
      }
      static now() {
        return timestamp;
      }
    };
    // Overriding Date.now for test determinism
    Date.now = () => timestamp;
  }, fixedTimestamp);
}
