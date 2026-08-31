const { test, expect } = require("@playwright/test");
const {
  jsonResponse,
  loginUserBody,
  preparePage,
  waitForApp,
  emailInput,
  passwordInput,
  confirmPasswordInput,
  displayNameInput,
} = require("./helpers.cjs");

const loginPayload = {
  email: "jamie@fitvibe.test",
  password: "SuperSecure123!",
};

const registerPayload = {
  name: "Jamie Carter",
  email: "jamie@fitvibe.test",
  password: "SuperSecure123!",
};
const derivedUsername = registerPayload.email.split("@")[0].replace(/[^a-zA-Z0-9_.-]/g, "_");

const summaryResponse = {
  totalSessions: 18,
  totalVolume: 32500,
  currentStreak: 8,
  personalRecords: [
    {
      exerciseName: "Back squat",
      value: 180,
      unit: "kg",
      achievedAt: "2025-10-01",
      visibility: "public",
    },
  ],
  streakChange: 2,
  sessionsChange: 1,
  volumeChange: 1200,
};

const trendsResponse = [
  { label: "Week 40", date: "2025-09-28", volume: 12500, sessions: 4, avgIntensity: 7 },
  { label: "Week 39", date: "2025-09-21", volume: 12010, sessions: 4, avgIntensity: 6.5 },
  { label: "Week 38", date: "2025-09-14", volume: 11840, sessions: 3, avgIntensity: 6.8 },
];

async function focusByTab(page, locator, maxTabs = 40) {
  await locator.waitFor({ state: "visible" });
  for (let i = 0; i < maxTabs; i += 1) {
    const isFocused = await locator.evaluate((element) => element === document.activeElement);
    if (isFocused) {
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error("Unable to focus locator via Tab.");
}

test.describe("Q-18 keyboard-only accessibility flows", () => {
  test("user can complete the login form using keyboard navigation only", async ({ page }) => {
    await preparePage(page);

    await page.route("**/api/v1/auth/login", async (route) => {
      const payload = JSON.parse(route.request().postData() ?? "{}");
      expect(payload).toMatchObject({
        email: loginPayload.email,
        password: loginPayload.password,
      });
      await route.fulfill(
        jsonResponse(
          loginUserBody({
            id: "user-123",
            email: loginPayload.email,
            username: "jamie",
            role: "athlete",
          }),
        ),
      );
    });

    await page.goto("/login");
    await waitForApp(page);

    await focusByTab(page, emailInput(page));
    await page.keyboard.type(loginPayload.email);

    await focusByTab(page, passwordInput(page));
    await page.keyboard.type(loginPayload.password);

    const loginResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/auth/login") && response.request().method() === "POST",
    );
    await focusByTab(page, page.getByRole("button", { name: /sign in/i }));
    await page.keyboard.press("Enter");

    await loginResponse;
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByRole("heading", { name: /choose your vibe/i })).toBeVisible();
  });

  test("user can register entirely with keyboard controls", async ({ page }) => {
    await preparePage(page);

    await page.route("**/api/v1/auth/register", async (route) => {
      const payload = JSON.parse(route.request().postData() ?? "{}");
      expect(payload).toMatchObject({
        email: registerPayload.email,
        password: registerPayload.password,
        username: derivedUsername,
        profile: {
          display_name: registerPayload.name,
        },
      });
      await route.fulfill(jsonResponse({ message: "accepted" }, 202));
    });

    await page.goto("/register");
    await waitForApp(page);

    await focusByTab(page, displayNameInput(page));
    await page.keyboard.type(registerPayload.name);

    await focusByTab(page, emailInput(page));
    await page.keyboard.type(registerPayload.email);
    await page.locator("form.form input[name='username']").fill(derivedUsername);

    await focusByTab(page, passwordInput(page));
    await page.keyboard.type(registerPayload.password);

    await focusByTab(page, confirmPasswordInput(page));
    await page.keyboard.type(registerPayload.password);

    const checkboxes = page.locator("form.form input[type='checkbox']");
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    const registerResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/auth/register") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: /create account/i }).click();

    await registerResponse;
    await expect(page.getByRole("heading", { name: /check your email/i })).toBeVisible();
  });

  test("planner and logger tabs are reachable via keyboard", async ({ page }) => {
    await preparePage(page, { authenticated: true });
    await page.route("**/api/v1/sessions**", async (route) => {
      if (route.request().url().includes("/auth/sessions")) {
        await route.continue();
        return;
      }
      await route.fulfill(jsonResponse({ data: [], total: 0, limit: 50, offset: 0 }));
    });

    await page.goto("/sessions");
    await waitForApp(page);

    const plannerTab = page.getByRole("tab", { name: /planner/i });
    await focusByTab(page, plannerTab);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Plan and log your workouts" })).toBeVisible();

    const loggerTab = page.getByRole("tab", { name: /logger/i });
    await focusByTab(page, loggerTab);
    await page.keyboard.press("Enter");
    await expect(loggerTab).toHaveAttribute("aria-selected", "true");
  });

  test("insights filters and export action work with keyboard only", async ({ page }) => {
    await preparePage(page, { authenticated: true });

    await page.route("**/api/v1/progress/summary**", (route) =>
      route.fulfill(jsonResponse(summaryResponse)),
    );
    await page.route("**/api/v1/progress/trends**", (route) =>
      route.fulfill(jsonResponse(trendsResponse)),
    );
    await page.route("**/api/v1/progress/export**", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/octet-stream" },
        body: "mock-csv",
      });
    });
    await page.route("**/api/v1/progress/exercises**", async (route) => {
      await route.fulfill(jsonResponse({ data: [], total: 0 }));
    });

    await page.goto("/insights");
    await waitForApp(page);

    await page.getByRole("button", { name: /^progress$/i }).click();

    const periodSelect = page.getByLabel(/period/i);
    await focusByTab(page, periodSelect);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    const groupBySelect = page.getByLabel(/group by/i);
    await focusByTab(page, groupBySelect);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    const exportRequest = page.waitForRequest("**/api/v1/progress/export**");
    const exportButton = page.getByRole("button", { name: /export/i });
    await focusByTab(page, exportButton);
    await page.keyboard.press("Enter");
    await exportRequest;

    await expect(page.getByText(/volume trend/i)).toBeVisible();
  });
});
