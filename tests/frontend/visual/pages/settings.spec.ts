import { test, expect } from "@playwright/test";
import { freezeTime } from "../helpers/fakeClock.js";
import { getDynamicMasks } from "../helpers/mask.js";
import { assertNoHorizontalOverflow } from "../helpers/responsive.js";
import { gotoAuthenticated } from "../helpers/auth.js";
import {
  mockCookieConsent,
  mock2FAStatus,
  mockAuthSessions,
  mockCurrentUser,
  mockSystemConfig,
} from "../helpers/mockApi.js";

test.describe("Settings Page Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await freezeTime(page);
    await mockSystemConfig(page);
    await mockCurrentUser(page);
    await mock2FAStatus(page, false);
    await mockAuthSessions(page);
    await mockCookieConsent(page);
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    await gotoAuthenticated(page, "/settings");
    await page.waitForLoadState("networkidle");
  });

  test("settings - light theme - xs", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("settings/settings-light-xs.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("settings - light theme - sm", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("settings/settings-light-sm.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("settings - light theme - md", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("settings/settings-light-md.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("settings - light theme - lg", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("settings/settings-light-lg.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("settings - dark theme - xs", async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(100);

    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("settings/settings-dark-xs.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("settings - dark theme - lg", async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(100);

    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("settings/settings-dark-lg.png", {
      mask: masks,
      fullPage: true,
    });
  });
});
