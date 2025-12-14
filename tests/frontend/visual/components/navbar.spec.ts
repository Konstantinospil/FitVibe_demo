import { test, expect } from "@playwright/test";
import { freezeTime } from "../helpers/fakeClock.js";
import { getDynamicMasks } from "../helpers/mask.js";
import { shouldRunForProject, getCurrentProject } from "../helpers/project.js";

test.describe("Navbar Component Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await freezeTime(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("navbar - light theme - sm", async ({ page }, testInfo) => {
    if (!shouldRunForProject(testInfo, "light", "sm")) {
      test.skip();
    }
    page.setDefaultTimeout(30000);
    const navbar = page.locator("nav").first();
    const masks = await getDynamicMasks(page);
    await expect(navbar).toHaveScreenshot("components/navbar-light-sm.png", {
      mask: masks,
    });
  });

  test("navbar - light theme - md", async ({ page }, testInfo) => {
    if (!shouldRunForProject(testInfo, "light", "md")) {
      test.skip();
    }
    page.setDefaultTimeout(30000);
    const navbar = page.locator("nav").first();
    const masks = await getDynamicMasks(page);
    await expect(navbar).toHaveScreenshot("components/navbar-light-md.png", {
      mask: masks,
    });
  });

  test("navbar - dark theme - sm", async ({ page }, testInfo) => {
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
      await page.waitForTimeout(100);
    }

    const navbar = page.locator("nav").first();
    const masks = await getDynamicMasks(page);
    await expect(navbar).toHaveScreenshot("components/navbar-dark-sm.png", {
      mask: masks,
    });
  });
});
