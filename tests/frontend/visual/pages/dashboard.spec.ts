import { test, expect } from "@playwright/test";
import { freezeTime } from "../helpers/fakeClock.js";
import { getDynamicMasks } from "../helpers/mask.js";
import { assertNoHorizontalOverflow } from "../helpers/responsive.js";
import { gotoAuthenticated } from "../helpers/auth.js";

test.describe("Dashboard Page Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await freezeTime(page);
    // Set explicit timeout for network operations
    page.setDefaultTimeout(30000); // 30s for network operations
    // Set default navigation timeout
    page.setDefaultNavigationTimeout(30000);
  });

  test.describe("Unauthenticated State", () => {
    test("dashboard redirect - light theme - xs", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      await assertNoHorizontalOverflow(page);
      const masks = await getDynamicMasks(page);
      // Test the redirect/error state when not authenticated
      await expect(page).toHaveScreenshot("dashboard/redirect-light-xs.png", {
        mask: masks,
        fullPage: true,
      });
    });
  });

  test.describe("Authenticated State", () => {
    test("dashboard - light theme - xs", async ({ page }) => {
      await gotoAuthenticated(page, "/dashboard");
      await assertNoHorizontalOverflow(page);
      const masks = await getDynamicMasks(page);
      await expect(page).toHaveScreenshot("dashboard/dashboard-light-xs.png", {
        mask: masks,
        fullPage: true,
      });
    });

    test("dashboard - light theme - sm", async ({ page }) => {
      await gotoAuthenticated(page, "/dashboard");
      await assertNoHorizontalOverflow(page);
      const masks = await getDynamicMasks(page);
      await expect(page).toHaveScreenshot("dashboard/dashboard-light-sm.png", {
        mask: masks,
        fullPage: true,
      });
    });

    test("dashboard - light theme - md", async ({ page }) => {
      await gotoAuthenticated(page, "/dashboard");
      await assertNoHorizontalOverflow(page);
      const masks = await getDynamicMasks(page);
      await expect(page).toHaveScreenshot("dashboard/dashboard-light-md.png", {
        mask: masks,
        fullPage: true,
      });
    });

    test("dashboard - light theme - lg", async ({ page }) => {
      await gotoAuthenticated(page, "/dashboard");
      await assertNoHorizontalOverflow(page);
      const masks = await getDynamicMasks(page);
      await expect(page).toHaveScreenshot("dashboard/dashboard-light-lg.png", {
        mask: masks,
        fullPage: true,
      });
    });

    test("dashboard - dark theme - xs", async ({ page }) => {
      await gotoAuthenticated(page, "/dashboard");
      await page.evaluate(() => {
        document.documentElement.setAttribute("data-theme", "dark");
      });
      await page.waitForTimeout(100);

      await assertNoHorizontalOverflow(page);
      const masks = await getDynamicMasks(page);
      await expect(page).toHaveScreenshot("dashboard/dashboard-dark-xs.png", {
        mask: masks,
        fullPage: true,
      });
    });

    test("dashboard - dark theme - lg", async ({ page }) => {
      await gotoAuthenticated(page, "/dashboard");
      await page.evaluate(() => {
        document.documentElement.setAttribute("data-theme", "dark");
      });
      await page.waitForTimeout(100);

      await assertNoHorizontalOverflow(page);
      const masks = await getDynamicMasks(page);
      await expect(page).toHaveScreenshot("dashboard/dashboard-dark-lg.png", {
        mask: masks,
        fullPage: true,
      });
    });
  });
});
