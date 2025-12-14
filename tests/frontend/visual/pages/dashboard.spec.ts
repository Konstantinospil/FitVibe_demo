import { test, expect } from "@playwright/test";
import { freezeTime } from "../helpers/fakeClock.js";
import { getDynamicMasks } from "../helpers/mask.js";
import { assertNoHorizontalOverflow } from "../helpers/responsive.js";
import { gotoAuthenticated } from "../helpers/auth.js";
import { shouldRunForProject, getCurrentProject } from "../helpers/project.js";

test.describe("Dashboard Page Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await freezeTime(page);
    // Set explicit timeout for network operations
    page.setDefaultTimeout(30000); // 30s for network operations
    // Set default navigation timeout
    page.setDefaultNavigationTimeout(30000);
  });

  test.describe("Unauthenticated State", () => {
    test("dashboard redirect - light theme - xs", async ({ page }, testInfo) => {
      if (!shouldRunForProject(testInfo, "light", "xs")) {
        test.skip();
      }
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
    test("dashboard - light theme - xs", async ({ page }, testInfo) => {
      if (!shouldRunForProject(testInfo, "light", "xs")) {
        test.skip();
      }
      await gotoAuthenticated(page, "/dashboard");
      await assertNoHorizontalOverflow(page);
      const masks = await getDynamicMasks(page);
      await expect(page).toHaveScreenshot("dashboard/dashboard-light-xs.png", {
        mask: masks,
        fullPage: true,
      });
    });

    test("dashboard - light theme - sm", async ({ page }, testInfo) => {
      if (!shouldRunForProject(testInfo, "light", "sm")) {
        test.skip();
      }
      await gotoAuthenticated(page, "/dashboard");
      await assertNoHorizontalOverflow(page);
      const masks = await getDynamicMasks(page);
      await expect(page).toHaveScreenshot("dashboard/dashboard-light-sm.png", {
        mask: masks,
        fullPage: true,
      });
    });

    test("dashboard - light theme - md", async ({ page }, testInfo) => {
      if (!shouldRunForProject(testInfo, "light", "md")) {
        test.skip();
      }
      await gotoAuthenticated(page, "/dashboard");
      await assertNoHorizontalOverflow(page);
      const masks = await getDynamicMasks(page);
      await expect(page).toHaveScreenshot("dashboard/dashboard-light-md.png", {
        mask: masks,
        fullPage: true,
      });
    });

    test("dashboard - light theme - lg", async ({ page }, testInfo) => {
      if (!shouldRunForProject(testInfo, "light", "lg")) {
        test.skip();
      }
      await gotoAuthenticated(page, "/dashboard");
      await assertNoHorizontalOverflow(page);
      const masks = await getDynamicMasks(page);
      await expect(page).toHaveScreenshot("dashboard/dashboard-light-lg.png", {
        mask: masks,
        fullPage: true,
      });
    });

    test("dashboard - dark theme - xs", async ({ page }, testInfo) => {
      if (!shouldRunForProject(testInfo, "dark", "xs")) {
        test.skip();
      }
      await gotoAuthenticated(page, "/dashboard");
      // Ensure dark theme is set (project config should set colorScheme, but we also set data-theme for CSS)
      const { theme } = getCurrentProject(testInfo);
      if (theme === "dark") {
        await page.evaluate(() => {
          document.documentElement.setAttribute("data-theme", "dark");
        });
        await page.waitForTimeout(100);
      }

      await assertNoHorizontalOverflow(page);
      const masks = await getDynamicMasks(page);
      await expect(page).toHaveScreenshot("dashboard/dashboard-dark-xs.png", {
        mask: masks,
        fullPage: true,
      });
    });

    test("dashboard - dark theme - lg", async ({ page }, testInfo) => {
      if (!shouldRunForProject(testInfo, "dark", "lg")) {
        test.skip();
      }
      await gotoAuthenticated(page, "/dashboard");
      // Ensure dark theme is set (project config should set colorScheme, but we also set data-theme for CSS)
      const { theme } = getCurrentProject(testInfo);
      if (theme === "dark") {
        await page.evaluate(() => {
          document.documentElement.setAttribute("data-theme", "dark");
        });
        await page.waitForTimeout(100);
      }

      await assertNoHorizontalOverflow(page);
      const masks = await getDynamicMasks(page);
      await expect(page).toHaveScreenshot("dashboard/dashboard-dark-lg.png", {
        mask: masks,
        fullPage: true,
      });
    });
  });
});
