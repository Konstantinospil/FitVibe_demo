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
  acceptRegisterLegal,
} = require("./helpers.cjs");

const registerPayload = {
  email: "jamie@fitvibe.test",
  password: "SuperSecure123!",
  name: "Jamie Carter",
};

const loginPayload = {
  email: registerPayload.email,
  password: registerPayload.password,
};

test("user can register, login, and open the sessions planner", async ({ page }) => {
  await preparePage(page);

  await page.route("**/api/v1/auth/register", async (route) => {
    const payload = JSON.parse(route.request().postData() ?? "{}");
    expect(payload).toMatchObject({
      email: registerPayload.email,
      password: registerPayload.password,
      username: "jamie",
      profile: {
        display_name: registerPayload.name,
      },
    });
    await route.fulfill(jsonResponse({ message: "accepted" }, 202));
  });

  await page.route("**/api/v1/auth/login", async (route) => {
    const payload = JSON.parse(route.request().postData() ?? "{}");
    expect(payload).toMatchObject(loginPayload);
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

  await page.route("**/api/v1/sessions**", async (route) => {
    if (route.request().url().includes("/auth/sessions")) {
      await route.continue();
      return;
    }
    await route.fulfill(jsonResponse({ data: [], total: 0, limit: 50, offset: 0 }));
  });

  await page.goto("/register");
  await waitForApp(page);

  await displayNameInput(page).fill(registerPayload.name);
  await emailInput(page).fill(registerPayload.email);
  await passwordInput(page).fill(registerPayload.password);
  await confirmPasswordInput(page).fill(registerPayload.password);
  await acceptRegisterLegal(page);

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
  await waitForApp(page);

  await emailInput(page).fill(loginPayload.email);
  await passwordInput(page).fill(loginPayload.password);

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/auth/login") && response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);

  await page.waitForURL((url) => url.pathname === "/");
  await expect(page.getByRole("heading", { name: /choose your vibe/i })).toBeVisible();

  await page.goto("/sessions");
  await waitForApp(page);
  await expect(page.getByRole("heading", { name: "Plan and log your workouts" })).toBeVisible();
  await expect(page.getByRole("tab", { name: /planner/i })).toBeVisible();

  await page.getByRole("tab", { name: /logger/i }).click();
  await expect(page.getByRole("tab", { name: /logger/i })).toHaveAttribute("aria-selected", "true");
});
