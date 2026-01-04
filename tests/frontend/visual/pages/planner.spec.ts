import { test, expect } from "@playwright/test";
import { freezeTime } from "../helpers/fakeClock.js";
import { getDynamicMasks } from "../helpers/mask.js";
import { assertNoHorizontalOverflow } from "../helpers/responsive.js";
import { gotoAuthenticated } from "../helpers/auth.js";
import { mockCookieConsent, mockCurrentUser, mockSystemConfig } from "../helpers/mockApi.js";

test.describe("Planner Page Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await freezeTime(page);
    await mockSystemConfig(page);
    await mockCurrentUser(page);
    await mockCookieConsent(page);
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    await gotoAuthenticated(page, "/planner");
    await page.waitForLoadState("networkidle");
  });

  test("planner - light theme - xs", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("planner/planner-light-xs.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("planner - light theme - sm", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("planner/planner-light-sm.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("planner - light theme - md", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("planner/planner-light-md.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("planner - light theme - lg", async ({ page }) => {
    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("planner/planner-light-lg.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("planner - dark theme - xs", async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(100);

    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("planner/planner-dark-xs.png", {
      mask: masks,
      fullPage: true,
    });
  });

  test("planner - dark theme - lg", async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(100);

    await assertNoHorizontalOverflow(page);
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("planner/planner-dark-lg.png", {
      mask: masks,
      fullPage: true,
    });
  });
});
