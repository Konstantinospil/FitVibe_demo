import { test, expect } from "@playwright/test";
import { freezeTime } from "../helpers/fakeClock.js";
import { getDynamicMasks } from "../helpers/mask.js";
import { gotoAuthenticated } from "../helpers/auth.js";
import { mockCookieConsent, mockCurrentUser, mockSystemConfig } from "../helpers/mockApi.js";

test.describe("Navbar Component Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await freezeTime(page);
    await mockSystemConfig(page);
    await mockCurrentUser(page);
    await mockCookieConsent(page);
    await gotoAuthenticated(page, "/");
    await page.waitForLoadState("networkidle");
  });

  test("navbar - light theme - sm", async ({ page }) => {
    page.setDefaultTimeout(30000);
    const navbar = page.locator("nav").first();
    const masks = await getDynamicMasks(page);
    await expect(navbar).toHaveScreenshot("components/navbar-light-sm.png", {
      mask: masks,
    });
  });

  test("navbar - light theme - md", async ({ page }) => {
    page.setDefaultTimeout(30000);
    const navbar = page.locator("nav").first();
    const masks = await getDynamicMasks(page);
    await expect(navbar).toHaveScreenshot("components/navbar-light-md.png", {
      mask: masks,
    });
  });

  test("navbar - dark theme - sm", async ({ page }) => {
    page.setDefaultTimeout(30000);
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(100);

    const navbar = page.locator("nav").first();
    const masks = await getDynamicMasks(page);
    await expect(navbar).toHaveScreenshot("components/navbar-dark-sm.png", {
      mask: masks,
    });
  });
});
