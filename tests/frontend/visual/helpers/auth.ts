import type { Page } from "@playwright/test";

/**
 * Authentication helpers for visual regression tests.
 * Sets up authenticated state for testing protected pages.
 */

/**
 * Sets up authenticated state by storing a mock JWT token in localStorage.
 * This allows testing authenticated pages without a full auth flow.
 *
 * Note: This is a simplified approach for visual testing. In a real scenario,
 * you might want to use Playwright's authentication state storage or API-based auth.
 */
export async function setupAuthenticatedState(page: Page): Promise<void> {
  // Store a mock token in localStorage
  // The app should handle this token (or we need to mock the auth check)
  await page.addInitScript(() => {
    // Mock authentication token
    // In a real implementation, this would be a valid JWT or the app would
    // need to be configured to accept this mock token
    localStorage.setItem("auth_token", "mock-jwt-token-for-visual-tests");
    localStorage.setItem("user_id", "test-user-123");
  });

  // Wait for any auth initialization
  await page.waitForTimeout(100);
}

/**
 * Clears authentication state
 */
export async function clearAuthenticatedState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_id");
  });
}

/**
 * Navigates to a page with authentication setup
 */
export async function gotoAuthenticated(
  page: Page,
  url: string,
  options?: { waitUntil?: "load" | "domcontentloaded" | "networkidle" },
): Promise<void> {
  await setupAuthenticatedState(page);
  await page.goto(url, { waitUntil: options?.waitUntil || "networkidle" });
}
