import { test, expect } from "@playwright/test";
import { freezeTime } from "../helpers/fakeClock.js";
import { getDynamicMasks } from "../helpers/mask.js";
import { assertNoHorizontalOverflow } from "../helpers/responsive.js";
import { gotoAuthenticated } from "../helpers/auth.js";
import {
  mockCookieConsent,
  mockCurrentUser,
  mockSystemConfig,
  mockUserAttributes,
} from "../helpers/mockApi.js";

test.describe("Profile Page Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await freezeTime(page);
    await mockSystemConfig(page);
    await mockCurrentUser(page);
    await mockUserAttributes(page);
    await mockCookieConsent(page);
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    await gotoAuthenticated(page, "/profile");
    await page.waitForLoadState("networkidle");
  });

  test("profile - light theme - xs", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("profile/profile-light-xs.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("profile - light theme - sm", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("profile/profile-light-sm.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("profile - light theme - md", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("profile/profile-light-md.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("profile - light theme - lg", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("profile/profile-light-lg.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("profile - dark theme - xs", async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(100);

    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("profile/profile-dark-xs.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("profile - dark theme - lg", async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(100);

    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("profile/profile-dark-lg.png", {
      mask: masks,
      fullPage: true,
    });
  });
});
