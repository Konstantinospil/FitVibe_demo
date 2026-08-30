import { test, expect } from "@playwright/test";
import { freezeTime } from "../helpers/fakeClock.js";
import { getDynamicMasks } from "../helpers/mask.js";
import { assertNoHorizontalOverflow } from "../helpers/responsive.js";
import { gotoAuthenticated } from "../helpers/auth.js";
import {
  mockCookieConsent,
  mockCurrentUser,
  mockFeed,
  mockSystemConfig,
} from "../helpers/mockApi.js";

test.describe("Feed Page Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await freezeTime(page);
    await mockSystemConfig(page);
    await mockCurrentUser(page);
    await mockFeed(page);
    await mockCookieConsent(page);
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    await gotoAuthenticated(page, "/feed");
    await page.waitForLoadState("networkidle");
  });

  test("feed - light theme - xs", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("feed/feed-light-xs.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("feed - light theme - sm", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("feed/feed-light-sm.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("feed - light theme - md", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("feed/feed-light-md.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("feed - light theme - lg", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("feed/feed-light-lg.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("feed - dark theme - xs", async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(100);

    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("feed/feed-dark-xs.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("feed - dark theme - lg", async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(100);

    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("feed/feed-dark-lg.png", {
      mask: masks,
      fullPage: true,
    });
  });
});
