const { test, expect } = require("@playwright/test");
const { AxeBuilder } = require("@axe-core/playwright");

const persistedAuthState = JSON.stringify({
  state: {
    isAuthenticated: true,
    accessToken: "axe-access-token",
    refreshToken: "axe-refresh-token",
  },
  version: 1,
});

const accessibilityPages = [
  { name: "Login", path: "/login" },
  { name: "Register", path: "/register" },
  { name: "Dashboard", path: "/", requiresAuth: true },
  { name: "Sessions", path: "/sessions", requiresAuth: true },
];

const jsonResponse = (body, status = 200) => ({
  status,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

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

async function seedAuthState(page) {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: "fitvibe:auth", value: persistedAuthState },
  );
}

async function mockHealthEndpoint(page) {
  await page.route("**/health", (route) => {
    route.fulfill(jsonResponse({ status: "ok" }));
  });
}

test.describe("Accessibility (axe)", () => {
  for (const scenario of accessibilityPages) {
    test(`has no serious or critical violations on ${scenario.name}`, async ({ page }) => {
      await mockHealthEndpoint(page);

      if (scenario.requiresAuth) {
        await seedAuthState(page);
      }

      await page.goto(scenario.path);
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      const impactfulViolations = results.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact ?? ""),
      );

      expect(impactfulViolations.length, formatViolations(impactfulViolations)).toBe(0);
    });
  }
});
