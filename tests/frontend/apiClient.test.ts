import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { apiClient, rawHttpClient } from "../src/services/api";
import { useAuthStore } from "../src/store/auth.store";
import type { User } from "../src/store/auth.store";

describe("apiClient authentication flow", () => {
  let apiMock: MockAdapter;
  let rawMock: MockAdapter;

  const mockUser: User = {
    id: "user-123",
    username: "testuser",
    email: "test@example.com",
    role: "athlete",
  };

  beforeEach(() => {
    apiMock = new MockAdapter(apiClient);
    rawMock = new MockAdapter(rawHttpClient);
    useAuthStore.getState().signOut();
  });

  afterEach(() => {
    apiMock.restore();
    rawMock.restore();
  });

  it("sends requests with cookies (no Authorization header needed)", async () => {
    useAuthStore.getState().signIn(mockUser);

    apiMock.onGet("/api/protected").reply((config) => {
      // With HttpOnly cookies, no Authorization header should be present
      // The browser automatically sends cookies
      expect(config.headers?.Authorization).toBeUndefined();
      return [200, { ok: true }];
    });

    const response = await apiClient.get("/api/protected");

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ ok: true });
  });

  it("refreshes the session on the first 401", async () => {
    useAuthStore.getState().signIn(mockUser);

    let callCount = 0;

    apiMock.onGet("/api/protected").reply(() => {
      callCount += 1;
      if (callCount === 1) {
        return [401];
      }

      // After refresh, request should succeed
      return [200, { ok: true }];
    });

    // Mock the refresh endpoint - no body needed, cookies sent automatically
    rawMock.onPost("/api/v1/auth/refresh").reply(200);

    const response = await apiClient.get("/api/protected");

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ ok: true });
    expect(callCount).toBe(2);
    // User should still be authenticated
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("signs out when refresh fails", async () => {
    useAuthStore.getState().signIn(mockUser);

    apiMock.onGet("/api/protected").reply(401);
    rawMock.onPost("/api/v1/auth/refresh").reply(400);
    // Mock logout endpoint that might be called during error handling
    rawMock.onPost("/api/v1/auth/logout").reply(200);

    await expect(apiClient.get("/api/protected")).rejects.toBeDefined();

    // Should have signed out
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("handles requests without authentication", async () => {
    // Not signed in
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    apiMock.onGet("/api/public").reply((config) => {
      expect(config.headers?.Authorization).toBeUndefined();
      return [200, { ok: true }];
    });

    const response = await apiClient.get("/api/public");

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ ok: true });
  });

  it("queues concurrent requests during token refresh", async () => {
    useAuthStore.getState().signIn(mockUser);

    let apiCallCount = 0;
    let refreshCallCount = 0;

    apiMock.onGet("/api/protected").reply(() => {
      apiCallCount += 1;
      if (apiCallCount <= 3) {
        // First 3 calls return 401
        return [401];
      }
      // After refresh, succeed
      return [200, { ok: true, call: apiCallCount }];
    });

    rawMock.onPost("/api/v1/auth/refresh").reply(() => {
      refreshCallCount += 1;
      return [200];
    });

    // Make 3 concurrent requests that will all trigger 401
    const promises = [
      apiClient.get("/api/protected"),
      apiClient.get("/api/protected"),
      apiClient.get("/api/protected"),
    ];

    const results = await Promise.all(promises);

    // All should succeed
    results.forEach((res) => {
      expect(res.status).toBe(200);
    });

    // Refresh should only be called once (not 3 times)
    expect(refreshCallCount).toBe(1);
  });
});
