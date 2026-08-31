import { test } from "@playwright/test";
import { capturePageScreenshot, openAuthenticatedPage } from "../helpers/capture.js";

test.describe("Navbar Component Visual Tests", () => {
  test("navbar", async ({ page }, testInfo) => {
    await openAuthenticatedPage(page, testInfo, "/", { viewports: ["sm", "md"] });
    await capturePageScreenshot(page, testInfo, "navbar", {
      locator: page.locator("header nav").first(),
      waitFor: "header nav",
    });
  });
});
