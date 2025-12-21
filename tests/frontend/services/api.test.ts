import MockAdapter from "axios-mock-adapter";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { apiClient, rawHttpClient } from "../../src/services/api";
import { useAuthStore } from "../../src/store/auth.store";

describe("API client interceptors", () => {
  let apiMock: MockAdapter;
  let rawMock: MockAdapter;

  beforeEach(() => {
    apiMock = new MockAdapter(apiClient);
    rawMock = new MockAdapter(rawHttpClient);
  });

  afterEach(() => {
    apiMock.restore();
    rawMock.restore();
    vi.restoreAllMocks();
  });

  it("refreshes cookies and retries a 401 request", async () => {
    rawMock.onPost("/api/v1/auth/refresh").reply(200);
    apiMock.onGet("/secure").replyOnce(401).onGet("/secure").reply(200, { ok: true });

    const response = await apiClient.get("/secure");

    expect(response.data).toEqual({ ok: true });
    expect(rawMock.history.post.filter((req) => req.url === "/api/v1/auth/refresh")).toHaveLength(
      1,
    );
  });

  it("queues concurrent requests during a refresh cycle", async () => {
    rawMock.onPost("/api/v1/auth/refresh").reply(200);
    apiMock.onGet("/secure").replyOnce(401).onGet("/secure").reply(200, { ok: true });

    const [first, second] = await Promise.all([apiClient.get("/secure"), apiClient.get("/secure")]);

    expect(first.data).toEqual({ ok: true });
    expect(second.data).toEqual({ ok: true });
    expect(rawMock.history.post.filter((req) => req.url === "/api/v1/auth/refresh")).toHaveLength(
      1,
    );
  });

  it("signs out when the refresh request fails", async () => {
    const originalState = useAuthStore.getState();
    const signOut = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ ...originalState, signOut });

    rawMock.onPost("/api/v1/auth/refresh").reply(500);
    rawMock.onPost("/api/v1/auth/logout").reply(200);
    apiMock.onGet("/secure").reply(401);

    await expect(apiClient.get("/secure")).rejects.toThrow();

    // Wait for async signOut to be called
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(signOut).toHaveBeenCalled();
    expect(rawMock.history.post.filter((req) => req.url === "/api/v1/auth/logout")).toHaveLength(1);

    useAuthStore.setState(originalState);
  });

  it("does not retry if request has no response", async () => {
    apiMock.onGet("/secure").networkError();

    await expect(apiClient.get("/secure")).rejects.toThrow();
    expect(rawMock.history.post.filter((req) => req.url === "/api/v1/auth/refresh")).toHaveLength(
      0,
    );
  });

  it("does not retry if request has no config", async () => {
    const error = new Error("Network error");
    await expect(apiClient.request({ method: "GET", url: "/secure" })).rejects.toThrow();
  });

  it("does not retry if status is not 401", async () => {
    apiMock.onGet("/secure").reply(403, { error: "Forbidden" });

    await expect(apiClient.get("/secure")).rejects.toThrow();
    expect(rawMock.history.post.filter((req) => req.url === "/api/v1/auth/refresh")).toHaveLength(
      0,
    );
  });

  it("does not retry if request already retried", async () => {
    apiMock.onGet("/secure").reply(401);

    const config = { method: "GET", url: "/secure", _retry: true };
    await expect(apiClient.request(config)).rejects.toThrow();
    expect(rawMock.history.post.filter((req) => req.url === "/api/v1/auth/refresh")).toHaveLength(
      0,
    );
  });

  it("redirects to terms reacceptance when refresh fails with TERMS_VERSION_OUTDATED", async () => {
    const originalLocation = window.location;
    delete (window as { location?: unknown }).location;
    window.location = { ...originalLocation, href: "" } as Location;

    rawMock.onPost("/api/v1/auth/refresh").reply(401, {
      error: {
        code: "TERMS_VERSION_OUTDATED",
        message: "Terms version outdated",
      },
    });
    apiMock.onGet("/secure").reply(401);

    await expect(apiClient.get("/secure")).rejects.toThrow();

    expect(window.location.href).toBe("/terms-reacceptance");

    window.location = originalLocation;
  });

  it("handles refresh failure with non-Axios error", async () => {
    const originalState = useAuthStore.getState();
    const signOut = vi.fn();
    useAuthStore.setState({ ...originalState, signOut });

    rawMock.onPost("/api/v1/auth/refresh").reply(() => {
      throw new Error("Network error");
    });
    rawMock.onPost("/api/v1/auth/logout").reply(200);
    apiMock.onGet("/secure").reply(401);

    await expect(apiClient.get("/secure")).rejects.toThrow();

    expect(signOut).toHaveBeenCalled();

    useAuthStore.setState(originalState);
  });

  it("handles logout failure during error handling", async () => {
    const originalState = useAuthStore.getState();
    const signOut = vi.fn();
    useAuthStore.setState({ ...originalState, signOut });

    rawMock.onPost("/api/v1/auth/refresh").reply(500);
    rawMock.onPost("/api/v1/auth/logout").reply(500);
    apiMock.onGet("/secure").reply(401);

    await expect(apiClient.get("/secure")).rejects.toThrow();

    expect(signOut).toHaveBeenCalled();

    useAuthStore.setState(originalState);
  });

  it("processes queued requests with error when refresh fails", async () => {
    const originalState = useAuthStore.getState();
    const signOut = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ ...originalState, signOut });

    rawMock.onPost("/api/v1/auth/refresh").reply(500);
    rawMock.onPost("/api/v1/auth/logout").reply(200);
    apiMock.onGet("/secure").reply(401);

    const promises = [apiClient.get("/secure"), apiClient.get("/secure"), apiClient.get("/secure")];

    await Promise.allSettled(promises);

    // Wait for async signOut to be called
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(signOut).toHaveBeenCalled();
    expect(rawMock.history.post.filter((req) => req.url === "/api/v1/auth/logout")).toHaveLength(1);

    useAuthStore.setState(originalState);
  });

  it("handles refresh error without response object", async () => {
    const originalState = useAuthStore.getState();
    const signOut = vi.fn();
    useAuthStore.setState({ ...originalState, signOut });

    rawMock.onPost("/api/v1/auth/refresh").reply(() => {
      return Promise.reject(new Error("Simple error"));
    });
    rawMock.onPost("/api/v1/auth/logout").reply(200);
    apiMock.onGet("/secure").reply(401);

    await expect(apiClient.get("/secure")).rejects.toThrow();

    expect(signOut).toHaveBeenCalled();

    useAuthStore.setState(originalState);
  });
});
