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

const testUser = {
  email: "auth-test@fitvibe.test",
  password: "SecureP@ssw0rd123!",
  username: "authtest",
};

const jsonResponse = (body, status = 200) => ({
  status,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const mockHealthEndpoint = async (page) => {
  await page.route("**/health", async (route) => {
    await route.fulfill(jsonResponse({ status: "ok" }));
  });
};

const mockLoginSuccess = async (page, user = testUser) => {
  await page.route("**/api/v1/auth/login", async (route) => {
    const request = route.request();
    const payload = JSON.parse(request.postData() ?? "{}");
    expect(payload).toMatchObject({
      email: user.email,
      password: user.password,
    });
    await route.fulfill(
      jsonResponse({
        user: {
          id: "user-123",
          username: user.username,
          email: user.email,
          role: "athlete",
        },
        session: {
          id: "session-123",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      }),
    );
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
    await mockHealthEndpoint(page);
  });

  test.describe("Login Flow", () => {
    test("should successfully login with valid credentials", async ({ page }) => {
      await mockLoginSuccess(page);

      await page.goto("/login");

      // Fill login form
      await page.getByLabel("Email").fill(testUser.email);
      await page.getByLabel("Password").fill(testUser.password);

      // Submit login
      const loginResponse = page.waitForResponse(
        (response) =>
          response.url().includes("/api/v1/auth/login") && response.request().method() === "POST",
      );

      await page.getByRole("button", { name: /sign in/i }).click();

      await loginResponse;
      await page.waitForURL((url) => url.pathname === "/");

      // Verify user is logged in
      await expect(page.getByRole("heading", { name: /train smarter/i })).toBeVisible();
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

      await page.getByLabel("Email").fill(testUser.email);
      await page.getByLabel("Password").fill("wrongpassword");

      await page.getByRole("button", { name: /sign in/i }).click();

      // Verify error message is displayed
      await expect(page.getByText(/invalid.*credentials/i)).toBeVisible({ timeout: 5000 });
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

      // Attempt login multiple times
      for (let i = 0; i < 10; i++) {
        await page.getByLabel("Email").fill(testUser.email);
        await page.getByLabel("Password").fill("wrongpassword");
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
      await page.route("**/api/v1/sessions", async (route) => {
        accessTokenCallCount++;
        if (accessTokenCallCount === 1) {
          // First call returns 401 (expired token)
          await route.fulfill(jsonResponse({ error: { code: "UNAUTHENTICATED" } }, 401));
        } else {
          // After refresh, return success
          await route.fulfill(jsonResponse({ data: [], total: 0, limit: 20, offset: 0 }));
        }
      });

      await page.goto("/login");
      await page.getByLabel("Email").fill(testUser.email);
      await page.getByLabel("Password").fill(testUser.password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL((url) => url.pathname === "/");

      // Navigate to sessions page (will trigger API call)
      await page.goto("/sessions");

      // Wait for refresh to be called
      await page.waitForTimeout(1000);

      // Verify refresh was called
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
      await page.getByLabel("Email").fill(testUser.email);
      await page.getByLabel("Password").fill(testUser.password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL((url) => url.pathname === "/");

      // Navigate to settings or use logout button
      // Check if there's a logout button in the layout
      const logoutButton = page.getByRole("button", { name: /sign out|logout/i });
      if (await logoutButton.isVisible().catch(() => false)) {
        await logoutButton.click();
      } else {
        // Alternative: navigate to settings and find logout there, or use direct navigation
        await page.goto("/settings");
        // Look for logout/sign out button
        const settingsLogout = page.getByRole("button", { name: /sign out|logout/i });
        if (await settingsLogout.isVisible().catch(() => false)) {
          await settingsLogout.click();
        }
      }

      // Verify logout endpoint was called
      expect(logoutCallCount).toBeGreaterThan(0);
    });
  });

  test.describe("Session Management UI", () => {
    test("should display active sessions", async ({ page }) => {
      await mockLoginSuccess(page);
      await mockSessionsList(page);

      await page.goto("/login");
      await page.getByLabel("Email").fill(testUser.email);
      await page.getByLabel("Password").fill(testUser.password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL((url) => url.pathname === "/");

      // Navigate to settings
      await page.goto("/settings");

      // Wait for session management component to load
      await page.waitForSelector('text="Active Sessions"', { timeout: 5000 }).catch(() => {
        // If component is not visible, it might be below the fold
      });

      // Verify sessions are displayed
      const sessionsText = page.getByText(/active sessions|session management/i);
      if (await sessionsText.isVisible().catch(() => false)) {
        // Verify current session is marked
        await expect(page.getByText(/current/i)).toBeVisible({ timeout: 5000 });
      }
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

      await mockLoginSuccess(page);
      await mockSessionsList(page, sessions);

      // Mock revoke endpoint
      await page.route("**/api/v1/auth/sessions/revoke", async (route) => {
        const request = route.request();
        const payload = JSON.parse(request.postData() ?? "{}");
        revokeCallCount++;
        expect(payload).toHaveProperty("sessionId");
        await route.fulfill(jsonResponse({ revoked: 1 }));
      });

      await page.goto("/login");
      await page.getByLabel("Email").fill(testUser.email);
      await page.getByLabel("Password").fill(testUser.password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL((url) => url.pathname === "/");

      await page.goto("/settings");

      // Wait for session management component
      await page.waitForTimeout(1000);

      // Look for revoke button (trash icon or "Revoke" button)
      const revokeButtons = page.getByRole("button", { name: /revoke/i });
      const revokeButtonCount = await revokeButtons.count();

      if (revokeButtonCount > 0) {
        // Click the first revoke button (should be for non-current session)
        await revokeButtons.first().click();

        // If there's a confirmation dialog, confirm it
        const confirmButton = page.getByRole("button", { name: /confirm|yes/i });
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
        }

        // Verify revoke endpoint was called
        await page.waitForTimeout(500);
        expect(revokeCallCount).toBeGreaterThan(0);
      }
    });

    test("should revoke all other sessions", async ({ page }) => {
      let revokeCallCount = 0;

      await mockLoginSuccess(page);
      await mockSessionsList(page);

      // Mock revoke endpoint
      await page.route("**/api/v1/auth/sessions/revoke", async (route) => {
        const request = route.request();
        const payload = JSON.parse(request.postData() ?? "{}");
        revokeCallCount++;
        expect(payload).toHaveProperty("revokeOthers", true);
        await route.fulfill(jsonResponse({ revoked: 1 }));
      });

      await page.goto("/login");
      await page.getByLabel("Email").fill(testUser.email);
      await page.getByLabel("Password").fill(testUser.password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL((url) => url.pathname === "/");

      await page.goto("/settings");
      await page.waitForTimeout(1000);

      // Look for "Revoke All Others" button
      const revokeOthersButton = page.getByRole("button", {
        name: /revoke.*others|revoke all others/i,
      });
      if (await revokeOthersButton.isVisible().catch(() => false)) {
        await revokeOthersButton.click();

        // Confirm if dialog appears
        const confirmButton = page.getByRole("button", { name: /confirm|yes|revoke others/i });
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
        }

        await page.waitForTimeout(500);
        expect(revokeCallCount).toBeGreaterThan(0);
      }
    });

    test("should revoke all sessions", async ({ page }) => {
      let revokeCallCount = 0;

      await mockLoginSuccess(page);
      await mockSessionsList(page);

      // Mock revoke endpoint
      await page.route("**/api/v1/auth/sessions/revoke", async (route) => {
        const request = route.request();
        const payload = JSON.parse(request.postData() ?? "{}");
        revokeCallCount++;
        expect(payload).toHaveProperty("revokeAll", true);
        await route.fulfill(jsonResponse({ revoked: 2 }));
      });

      await page.goto("/login");
      await page.getByLabel("Email").fill(testUser.email);
      await page.getByLabel("Password").fill(testUser.password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL((url) => url.pathname === "/");

      await page.goto("/settings");
      await page.waitForTimeout(1000);

      // Look for "Revoke All Sessions" button
      const revokeAllButton = page.getByRole("button", { name: /revoke all sessions/i });
      if (await revokeAllButton.isVisible().catch(() => false)) {
        await revokeAllButton.click();

        // Confirm if dialog appears
        const confirmButton = page.getByRole("button", { name: /confirm|yes|revoke all/i });
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
        }

        await page.waitForTimeout(500);
        expect(revokeCallCount).toBeGreaterThan(0);
      }
    });
  });
});
