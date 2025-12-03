import { test, expect } from "@playwright/test";

const registerPayload = {
  email: "jamie@fitvibe.test",
  password: "SuperSecure123!",
  name: "Jamie Carter",
};

const loginPayload = {
  email: registerPayload.email,
  password: registerPayload.password,
};

const summaryResponse = {
  totalSessions: 24,
  totalVolume: 48250,
  currentStreak: 12,
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
  sessionsChange: 3,
  volumeChange: 5200,
};

const trendsResponse = [
  { label: "Week 40", date: "2025-09-28", volume: 12500, sessions: 4, avgIntensity: 7 },
  { label: "Week 39", date: "2025-09-21", volume: 12010, sessions: 4, avgIntensity: 6.5 },
  { label: "Week 38", date: "2025-09-14", volume: 11840, sessions: 3, avgIntensity: 6.8 },
  { label: "Week 37", date: "2025-09-07", volume: 11020, sessions: 3, avgIntensity: 6.4 },
  { label: "Week 36", date: "2025-08-31", volume: 10880, sessions: 3, avgIntensity: 6.2 },
];

const tokensResponse = {
  accessToken: "test-access-token",
  refreshToken: "test-refresh-token",
};

const jsonResponse = (body, status = 200) => ({
  status,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

test("user can register, login, plan a session, and review logged workout details", async ({
  page,
}) => {
  await page.route("**/health", async (route) => {
    await route.fulfill(jsonResponse({ status: "ok" }));
  });

  await page.route("**/api/v1/progress/summary**", async (route) => {
    await route.fulfill(jsonResponse(summaryResponse));
  });

  await page.route("**/api/v1/progress/trends**", async (route) => {
    await route.fulfill(jsonResponse(trendsResponse));
  });

  await page.route(
    "**/api/v1/auth/register",
    async (route) => {
      const request = route.request();
      const payload = JSON.parse(request.postData() ?? "{}");
      expect(payload).toMatchObject({
        email: registerPayload.email,
        password: registerPayload.password,
        username: "jamie",
        profile: {
          display_name: registerPayload.name,
        },
      });
      await route.fulfill(jsonResponse({ message: "accepted" }, 202));
    },
    { times: 1 },
  );

  await page.route(
    "**/api/v1/auth/login",
    async (route) => {
      const request = route.request();
      const payload = JSON.parse(request.postData() ?? "{}");
      expect(payload).toMatchObject(loginPayload);
      await route.fulfill(jsonResponse(tokensResponse));
    },
    { times: 1 },
  );

  await page.goto("/register");

  await page.getByLabel("Display name").fill(registerPayload.name);
  await page.getByLabel("Email").fill(registerPayload.email);
  await page.getByLabel("Password").fill(registerPayload.password);
  await page.getByLabel("Confirm password").fill(registerPayload.password);

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/auth/register") && response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Create account" }).click(),
  ]);

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  await page.getByRole("link", { name: "Go to login" }).click();
  await page.waitForURL("**/login");

  await page.getByLabel("Email").fill(loginPayload.email);
  await page.getByLabel("Password").fill(loginPayload.password);

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/auth/login") && response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);

  await page.waitForURL((url) => url.pathname === "/");
  await expect(page.getByRole("heading", { name: /Train smarter/i })).toBeVisible();

  await page.getByRole("link", { name: "Sessions" }).click();
  await page.waitForURL("**/sessions");

  await expect(page.getByRole("heading", { name: "Plan and log your workouts" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit block" })).toBeVisible();

  await page.getByRole("button", { name: "Logger" }).click();
  await expect(page.getByText("Back Squat").first()).toBeVisible();
});
