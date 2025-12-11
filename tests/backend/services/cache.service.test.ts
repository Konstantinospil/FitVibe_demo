import { CacheService } from "../../../apps/backend/src/services/cache.service.js";

describe("CacheService", () => {
  let cache: CacheService;
  let originalRedisEnabled: string | undefined;

  beforeEach(() => {
    // Ensure Redis is disabled for tests to use in-memory cache
    originalRedisEnabled = process.env.REDIS_ENABLED;
    process.env.REDIS_ENABLED = "false";
    cache = new CacheService();
  });

  afterEach(async () => {
    await cache.clear();
    await cache.close();
    // Restore original env var for test isolation
    if (originalRedisEnabled === undefined) {
      delete process.env.REDIS_ENABLED;
    } else {
      process.env.REDIS_ENABLED = originalRedisEnabled;
    }
  });

  it("stores and retrieves typed values", async () => {
    interface SessionToken {
      token: string;
      expiresInSeconds: number;
    }

    const session: SessionToken = {
      token: "session-token",
      expiresInSeconds: 3600,
    };

    await cache.set<SessionToken>("session", session);

    const result = await cache.get<SessionToken>("session");
    expect(result).toEqual(session);
  });

  it("returns undefined for missing keys", async () => {
    const result = await cache.get("missing");
    expect(result).toBeUndefined();
  });

  it("overwrites existing entries and deletes individual keys", async () => {
    await cache.set("key", "initial");
    await cache.set("key", "updated");
    await cache.set("other", 42);

    expect(await cache.get("key")).toBe("updated");

    await cache.delete("key");

    expect(await cache.get("key")).toBeUndefined();
    expect(await cache.get("other")).toBe(42);
  });

  it("clears the entire cache at once", async () => {
    await cache.set("alpha", 1);
    await cache.set("beta", { ready: true });

    await cache.clear();

    expect(await cache.get("alpha")).toBeUndefined();
    expect(await cache.get("beta")).toBeUndefined();
  });
});
