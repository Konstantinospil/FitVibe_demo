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
    const signOut = vi.fn();
    useAuthStore.setState({ ...originalState, signOut });

    rawMock.onPost("/api/v1/auth/refresh").reply(500);
    rawMock.onPost("/api/v1/auth/logout").reply(200);
    apiMock.onGet("/secure").reply(401);

    await expect(apiClient.get("/secure")).rejects.toThrow();

    expect(signOut).toHaveBeenCalled();
    expect(rawMock.history.post.filter((req) => req.url === "/api/v1/auth/logout")).toHaveLength(1);

    useAuthStore.setState(originalState);
  });
});
