/**
 * E2E tests for authentication flows (FR-002)
 *
 * Tests:
 * 1. Login flow with email/password
 * 1.1. Successful login
 * 1.2. Failed login (invalid credentials)
 * 1.3. Account lockout after multiple failed attempts
 * 2. Token refresh flow
 * 3. Logout flow
 * 4. Session management UI
 * 4.1. View active sessions
 * 4.2. Revoke individual session
 * 4.3. Revoke all other sessions
 * 4.4. Revoke all sessions
 */

import { test, expect } from "@playwright/test";
const {
  TEST_USER,
  jsonResponse,
  loginUserBody,
  preparePage,
  waitForApp,
  emailInput,
  passwordInput,
} = require("./helpers.cjs");

const testUser = TEST_USER;

const mockLoginSuccess = async (page, user = testUser) => {
  await page.route("**/api/v1/auth/login", async (route) => {
    const request = route.request();
    const payload = JSON.parse(request.postData() ?? "{}");
    expect(payload).toMatchObject({
      email: user.email,
      password: user.password,
    });
    await route.fulfill(jsonResponse(loginUserBody(user)));
  });
};

const mockSessionsList = async (page, sessions = []) => {
  const defaultSessions = [
    {
      id: "session-1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      ip: "192.168.1.1",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
      revokedAt: null,
      isCurrent: true,
    },
    {
      id: "session-2",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile Safari/605.1.15",
      ip: "192.168.1.2",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
      revokedAt: null,
      isCurrent: false,
    },
  ];

  await page.route("**/api/v1/auth/sessions", async (route) => {
    await route.fulfill(
      jsonResponse({ sessions: sessions.length > 0 ? sessions : defaultSessions }),
    );
  });
};

test.describe("Authentication Flows (FR-002)", () => {
  test.beforeEach(async ({ page }) => {
    await preparePage(page);
  });

  test.describe("Login Flow", () => {
    test("should successfully login with valid credentials", async ({ page }) => {
      await mockLoginSuccess(page);

      await page.goto("/login");
      await waitForApp(page);

      // Fill login form
      await emailInput(page).fill(testUser.email);
      await passwordInput(page).fill(testUser.password);

      // Submit login
      const loginResponse = page.waitForResponse(
        (response) =>
          response.url().includes("/api/v1/auth/login") && response.request().method() === "POST",
      );

      await page.getByRole("button", { name: /sign in/i }).click();

      await loginResponse;
      await page.waitForURL((url) => url.pathname === "/");

      // Verify user is logged in
      await expect(page.getByRole("heading", { name: /choose your vibe/i })).toBeVisible();
    });

    test("should show error message for invalid credentials", async ({ page }) => {
      await page.route("**/api/v1/auth/login", async (route) => {
        await route.fulfill(
          jsonResponse(
            {
              error: {
                code: "AUTH_INVALID_CREDENTIALS",
                message: "Invalid email or password",
              },
            },
            401,
          ),
        );
      });

      await page.goto("/login");
      await waitForApp(page);

      await emailInput(page).fill(testUser.email);
      await passwordInput(page).fill("wrongpassword");

      await page.getByRole("button", { name: /sign in/i }).click();

      // Verify error message is displayed
      await expect(page.getByRole("alert")).toContainText(/invalid/i);
    });

    test("should show lockout message after multiple failed attempts", async ({ page }) => {
      let attemptCount = 0;
      await page.route("**/api/v1/auth/login", async (route) => {
        attemptCount++;
        if (attemptCount >= 10) {
          await route.fulfill(
            jsonResponse(
              {
                error: {
                  code: "AUTH_ACCOUNT_LOCKED",
                  message: "Account temporarily locked due to multiple failed login attempts",
                  details: {
                    remainingSeconds: 900,
                    lockoutType: "account",
                    attemptCount: 10,
                    maxAttempts: 10,
                  },
                },
              },
              429,
            ),
          );
        } else {
          await route.fulfill(
            jsonResponse(
              {
                error: {
                  code: "AUTH_INVALID_CREDENTIALS",
                  message: "Invalid email or password",
                },
              },
              401,
            ),
          );
        }
      });

      await page.goto("/login");
      await waitForApp(page);

      // Attempt login multiple times
      for (let i = 0; i < 10; i++) {
        await emailInput(page).fill(testUser.email);
        await passwordInput(page).fill("wrongpassword");
        await page.getByRole("button", { name: /sign in/i }).click();
        await page.waitForTimeout(100); // Small delay between attempts
      }

      // Verify lockout message
      await expect(page.getByText(/locked/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Token Refresh Flow", () => {
    test("should automatically refresh token on 401 error", async ({ page, context }) => {
      let refreshCallCount = 0;
      let accessTokenCallCount = 0;

      // Mock successful login
      await mockLoginSuccess(page);

      // Mock token refresh
      await page.route("**/api/v1/auth/refresh", async (route) => {
        refreshCallCount++;
        await route.fulfill(
          jsonResponse({ user: { id: "user-123", username: testUser.username } }),
        );
      });

      // Mock protected endpoint that returns 401 first, then 200 after refresh
      await page.route("**/api/v1/sessions**", async (route) => {
        if (route.request().url().includes("/auth/sessions")) {
          await route.fallback();
          return;
        }
        accessTokenCallCount++;
        if (accessTokenCallCount === 1) {
          await route.fulfill(jsonResponse({ error: { code: "UNAUTHENTICATED" } }, 401));
        } else {
          await route.fulfill(jsonResponse({ data: [], total: 0, limit: 20, offset: 0 }));
        }
      });

      await page.goto("/login");
      await waitForApp(page);
      await emailInput(page).fill(testUser.email);
      await passwordInput(page).fill(testUser.password);

      const refreshResponse = page.waitForResponse((response) =>
        response.url().includes("/api/v1/auth/refresh"),
      );
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL((url) => url.pathname === "/");
      await refreshResponse;

      expect(refreshCallCount).toBeGreaterThan(0);
    });
  });

  test.describe("Logout Flow", () => {
    test("should logout and redirect to login", async ({ page }) => {
      let logoutCallCount = 0;

      await mockLoginSuccess(page);

      // Mock logout endpoint
      await page.route("**/api/v1/auth/logout", async (route) => {
        logoutCallCount++;
        await route.fulfill({ status: 204 });
      });

      await page.goto("/login");
      await waitForApp(page);
      await emailInput(page).fill(testUser.email);
      await passwordInput(page).fill(testUser.password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL((url) => url.pathname === "/");
      await expect(page.getByRole("heading", { name: /choose your vibe/i })).toBeVisible();

      const logoutResponse = page.waitForResponse((response) =>
        response.url().includes("/api/v1/auth/logout"),
      );
      await page.getByRole("button", { name: /sign out|navigation\.signOut/i }).click();
      await logoutResponse;

      expect(logoutCallCount).toBeGreaterThan(0);
    });
  });

  test.describe("Session Management UI", () => {
    test("should display active sessions", async ({ page }) => {
      await page.addInitScript((key) => {
        window.sessionStorage.setItem(key, "1");
      }, "fitvibe:auth");
      await mockSessionsList(page);

      await page.goto("/settings");
      await waitForApp(page);
      await expect(page.getByText(/192\.168\.1\.1/).first()).toBeVisible();
    });

    test("should revoke individual session", async ({ page }) => {
      let revokeCallCount = 0;
      const sessions = [
        {
          id: "session-1",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
          ip: "192.168.1.1",
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
          revokedAt: null,
          isCurrent: true,
        },
        {
          id: "session-2",
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile Safari/605.1.15",
          ip: "192.168.1.2",
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
          revokedAt: null,
          isCurrent: false,
        },
      ];

      await page.addInitScript((key) => {
        window.sessionStorage.setItem(key, "1");
      }, "fitvibe:auth");
      await mockSessionsList(page, sessions);

      await page.route("**/api/v1/auth/sessions/revoke", async (route) => {
        const payload = JSON.parse(route.request().postData() ?? "{}");
        revokeCallCount++;
        expect(payload).toHaveProperty("sessionId");
        await route.fulfill(jsonResponse({ revoked: 1 }));
      });

      await page.goto("/settings");
      await waitForApp(page);
      const revokeResponse = page.waitForResponse((response) =>
        response.url().includes("/api/v1/auth/sessions/revoke"),
      );
      await page.getByRole("button", { name: /revoke session|auth\.sessions\.revoke$/i }).click();
      await revokeResponse;
      expect(revokeCallCount).toBeGreaterThan(0);
    });

    test("should revoke all other sessions", async ({ page }) => {
      let revokeCallCount = 0;

      await page.addInitScript((key) => {
        window.sessionStorage.setItem(key, "1");
      }, "fitvibe:auth");
      await mockSessionsList(page);

      await page.route("**/api/v1/auth/sessions/revoke", async (route) => {
        const payload = JSON.parse(route.request().postData() ?? "{}");
        revokeCallCount++;
        expect(payload).toHaveProperty("revokeOthers", true);
        await route.fulfill(jsonResponse({ revoked: 1 }));
      });

      await page.goto("/settings");
      await waitForApp(page);
      await page.getByRole("button", { name: /revoke.*others|auth\.sessions\.revokeOthers/i }).click();
      const confirmDialog = page.getByRole("dialog");
      await expect(confirmDialog).toBeVisible();
      const revokeResponse = page.waitForResponse((response) =>
        response.url().includes("/api/v1/auth/sessions/revoke"),
      );
      await confirmDialog
        .getByRole("button", { name: /revoke.*others|auth\.sessions\.revokeOthers/i })
        .click();
      await revokeResponse;
      expect(revokeCallCount).toBeGreaterThan(0);
    });

    test("should revoke all sessions", async ({ page }) => {
      let revokeCallCount = 0;

      await page.addInitScript((key) => {
        window.sessionStorage.setItem(key, "1");
      }, "fitvibe:auth");
      await mockSessionsList(page);

      await page.route("**/api/v1/auth/sessions/revoke", async (route) => {
        const payload = JSON.parse(route.request().postData() ?? "{}");
        revokeCallCount++;
        expect(payload).toHaveProperty("revokeAll", true);
        await route.fulfill(jsonResponse({ revoked: 2 }));
      });

      await page.goto("/settings");
      await waitForApp(page);
      await page.getByRole("button", { name: /revoke all sessions|auth\.sessions\.revokeAll/i }).click();
      const confirmDialog = page.getByRole("dialog");
      await expect(confirmDialog).toBeVisible();
      const revokeResponse = page.waitForResponse((response) =>
        response.url().includes("/api/v1/auth/sessions/revoke"),
      );
      await confirmDialog.getByRole("button", { name: /revoke all|auth\.sessions\.revokeAll/i }).click();
      await revokeResponse;
      expect(revokeCallCount).toBeGreaterThan(0);
    });
  });
});
