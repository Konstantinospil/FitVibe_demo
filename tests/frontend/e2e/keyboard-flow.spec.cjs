import { test, expect } from "@playwright/test";

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

const tokensResponse = {
  accessToken: "test-access-token",
  refreshToken: "test-refresh-token",
};

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

const persistedAuthState = JSON.stringify({
  state: {
    isAuthenticated: true,
    accessToken: "keyboard-access-token",
    refreshToken: "keyboard-refresh-token",
  },
  version: 1,
});

const jsonResponse = (body, status = 200) => ({
  status,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

async function seedAuthState(page) {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: "fitvibe:auth", value: persistedAuthState },
  );
}

async function mockHealthEndpoint(page) {
  await page.route("**/health", (route) => route.fulfill(jsonResponse({ status: "ok" })));
}

async function focusByTab(page, locator, maxTabs = 30) {
  await locator.waitFor({ state: "visible" });
  for (let i = 0; i < maxTabs; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const isFocused = await locator.evaluate((element) => element === document.activeElement);
    if (isFocused) {
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await page.keyboard.press("Tab");
  }
  throw new Error(
    `Unable to focus locator ${await locator.evaluate((el) => el?.outerHTML)} via Tab.`,
  );
}

test.describe("Q-18 keyboard-only accessibility flows", () => {
  test("user can complete the login form using keyboard navigation only", async ({ page }) => {
    await mockHealthEndpoint(page);

    await page.route("**/api/v1/auth/login", async (route) => {
      const request = route.request();
      const payload = JSON.parse(request.postData() ?? "{}");
      expect(payload).toMatchObject({
        email: loginPayload.email,
        password: loginPayload.password,
      });
      await route.fulfill(jsonResponse(tokensResponse));
    });

    await page.goto("/login");

    await focusByTab(page, page.getByLabel("Email"));
    await page.keyboard.type(loginPayload.email);

    await focusByTab(page, page.getByLabel("Password"));
    await page.keyboard.type(loginPayload.password);

    const loginResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/auth/login") && response.request().method() === "POST",
    );
    await focusByTab(page, page.getByRole("button", { name: /sign in/i }));
    await page.keyboard.press("Enter");

    await loginResponse;
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByRole("heading", { name: /Train smarter/i })).toBeVisible();
  });

  test("user can register entirely with keyboard controls", async ({ page }) => {
    await mockHealthEndpoint(page);

    await page.route("**/api/v1/auth/register", async (route) => {
      const request = route.request();
      const payload = JSON.parse(request.postData() ?? "{}");
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

    await focusByTab(page, page.getByLabel("Display name"));
    await page.keyboard.type(registerPayload.name);

    await focusByTab(page, page.getByLabel("Email"));
    await page.keyboard.type(registerPayload.email);

    await focusByTab(page, page.getByLabel("Password"));
    await page.keyboard.type(registerPayload.password);

    await focusByTab(page, page.getByLabel("Confirm password"));
    await page.keyboard.type(registerPayload.password);

    const registerResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/auth/register") && response.request().method() === "POST",
    );
    await focusByTab(page, page.getByRole("button", { name: /create account/i }));
    await page.keyboard.press("Enter");

    await registerResponse;
    await expect(page.getByRole("heading", { name: /Check your email/i })).toBeVisible();
  });

  test("planner and logger tabs are reachable via keyboard", async ({ page }) => {
    await mockHealthEndpoint(page);
    await seedAuthState(page);

    await page.goto("/sessions");

    const plannerTab = page.getByRole("button", { name: /planner/i });
    await focusByTab(page, plannerTab);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Plan and log your workouts" })).toBeVisible();

    const loggerTab = page.getByRole("button", { name: /logger/i });
    await focusByTab(page, loggerTab);
    await page.keyboard.press("Enter");
    await expect(page.getByText("Back Squat").first()).toBeVisible();
  });

  test("insights filters and export action work with keyboard only", async ({ page }) => {
    await mockHealthEndpoint(page);
    await seedAuthState(page);

    await page.route("**/api/v1/progress/summary**", (route) =>
      route.fulfill(jsonResponse(summaryResponse)),
    );
    await page.route("**/api/v1/progress/trends**", (route) =>
      route.fulfill(jsonResponse(trendsResponse)),
    );
    await page.route("**/api/v1/progress/export**", async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "application/octet-stream",
        },
        body: "mock-csv",
      });
    });

    await page.goto("/insights");

    const periodSelect = page.getByLabel(/period/i);
    await focusByTab(page, periodSelect);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    const groupBySelect = page.getByLabel(/Group by/i);
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
