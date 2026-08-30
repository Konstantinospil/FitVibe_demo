import { test, expect } from "@playwright/test";
import { freezeTime } from "../helpers/fakeClock.js";
import { getDynamicMasks } from "../helpers/mask.js";
import { assertNoHorizontalOverflow } from "../helpers/responsive.js";
import { gotoAuthenticated } from "../helpers/auth.js";
import {
  mockCookieConsent,
  mockCurrentUser,
  mockSession,
  mockSystemConfig,
} from "../helpers/mockApi.js";

test.describe("Logger Page Visual Tests", () => {
  const sessionId = "session-123";

  test.beforeEach(async ({ page }) => {
    await freezeTime(page);
    await mockSystemConfig(page);
    await mockCurrentUser(page);
    await mockSession(page, sessionId);
    await mockCookieConsent(page);
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    await gotoAuthenticated(page, `/logger/${sessionId}`);
    await page.waitForLoadState("networkidle");
  });

  test("logger - light theme - xs", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("logger/logger-light-xs.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("logger - light theme - sm", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("logger/logger-light-sm.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("logger - light theme - md", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("logger/logger-light-md.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("logger - light theme - lg", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("logger/logger-light-lg.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("logger - dark theme - xs", async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(100);

    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("logger/logger-dark-xs.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("logger - dark theme - lg", async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(100);

    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("logger/logger-dark-lg.png", {
      mask: masks,
      fullPage: true,
    });
  });
});
