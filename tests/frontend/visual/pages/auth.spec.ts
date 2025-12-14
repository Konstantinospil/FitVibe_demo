import { test, expect } from "@playwright/test";
import { freezeTime } from "../helpers/fakeClock.js";
import { getDynamicMasks } from "../helpers/mask.js";
import { assertNoHorizontalOverflow } from "../helpers/responsive.js";
import { shouldRunForProject, getCurrentProject } from "../helpers/project.js";

test.describe("Auth Page Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await freezeTime(page);
    await page.goto("/login");
    // Wait for page to be fully loaded
    await page.waitForLoadState("networkidle");
  });

  test("login page - light theme - xs", async ({ page }, testInfo) => {
    if (!shouldRunForProject(testInfo, "light", "xs")) {
      test.skip();
    }
    page.setDefaultTimeout(30000);
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("auth/login-light-xs.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("login page - light theme - sm", async ({ page }, testInfo) => {
    if (!shouldRunForProject(testInfo, "light", "sm")) {
      test.skip();
    }
    page.setDefaultTimeout(30000);
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("auth/login-light-sm.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("login page - dark theme - xs", async ({ page }, testInfo) => {
    if (!shouldRunForProject(testInfo, "dark", "xs")) {
      test.skip();
    }
    page.setDefaultTimeout(30000);
    // Ensure dark theme is set (project config should set colorScheme, but we also set data-theme for CSS)
    const { theme } = getCurrentProject(testInfo);
    if (theme === "dark") {
      await page.evaluate(() => {
        document.documentElement.setAttribute("data-theme", "dark");
      });
      await page.waitForTimeout(100); // Allow theme transition
    }

    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("auth/login-dark-xs.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("login page - dark theme - sm", async ({ page }, testInfo) => {
    if (!shouldRunForProject(testInfo, "dark", "sm")) {
      test.skip();
    }
    page.setDefaultTimeout(30000);
    // Ensure dark theme is set (project config should set colorScheme, but we also set data-theme for CSS)
    const { theme } = getCurrentProject(testInfo);
    if (theme === "dark") {
      await page.evaluate(() => {
        document.documentElement.setAttribute("data-theme", "dark");
      });
      await page.waitForTimeout(100); // Allow theme transition
    }

    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("auth/login-dark-sm.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("register page - light theme - xs", async ({ page }, testInfo) => {
    if (!shouldRunForProject(testInfo, "light", "xs")) {
      test.skip();
    }
    page.setDefaultTimeout(30000);
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("auth/register-light-xs.png", {
      mask: masks,
      fullPage: true,
    });
  });
});
