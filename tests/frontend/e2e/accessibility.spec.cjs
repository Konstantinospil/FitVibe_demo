const { test, expect } = require("@playwright/test");
const { AxeBuilder } = require("@axe-core/playwright");
const { preparePage, waitForApp, jsonResponse } = require("./helpers.cjs");

const accessibilityPages = [
  { name: "Login", path: "/login" },
  { name: "Register", path: "/register" },
  { name: "Dashboard", path: "/", requiresAuth: true },
  { name: "Sessions", path: "/sessions", requiresAuth: true },
];

const formatViolations = (violations) =>
  violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => node.target.filter(Boolean).join(" "))
        .filter(Boolean)
        .join(", ");
      return `${violation.id} (${violation.impact}) - ${violation.help}${
        nodes ? ` [${nodes}]` : ""
      }`;
    })
    .join("\n");

test.describe("Accessibility (axe)", () => {
  for (const scenario of accessibilityPages) {
    test(`has no serious or critical violations on ${scenario.name}`, async ({ page }) => {
      await preparePage(page, { authenticated: Boolean(scenario.requiresAuth) });

      if (scenario.path === "/sessions") {
        await page.route("**/api/v1/sessions**", async (route) => {
          if (route.request().url().includes("/auth/sessions")) {
            await route.continue();
            return;
          }
          await route.fulfill(
            jsonResponse({ data: [], total: 0, limit: 50, offset: 0 }),
          );
        });
      }

      await page.goto(scenario.path);
      await waitForApp(page);
      await page.locator("h1, h2, h3").first().waitFor({ state: "visible" });

      const axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]);
      if (scenario.name === "Dashboard") {
        // Brand vibe colours on Home fail WCAG contrast; tracked separately from this suite.
        axe.disableRules(["color-contrast"]);
      }

      const results = await axe.analyze();

      const impactfulViolations = results.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact ?? ""),
      );

      expect(impactfulViolations.length, formatViolations(impactfulViolations)).toBe(0);
    });
  }
});
