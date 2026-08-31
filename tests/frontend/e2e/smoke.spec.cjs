const { test, expect } = require("@playwright/test");
const { preparePage, waitForApp } = require("./helpers.cjs");

test("login page renders the FitVibe welcome heading", async ({ page }) => {
  await preparePage(page);
  await page.goto("/");
  await waitForApp(page);
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});
