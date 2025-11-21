import { CacheService } from "../cache.service";

describe("CacheService", () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService();
  });

  it("stores and retrieves typed values", () => {
    interface SessionToken {
      token: string;
      expiresInSeconds: number;
    }

    const session: SessionToken = {
      token: "session-token",
      expiresInSeconds: 3600,
    };

    cache.set<SessionToken>("session", session);

    expect(cache.get<SessionToken>("session")).toEqual(session);
  });

  it("returns undefined for missing keys", () => {
    expect(cache.get("missing")).toBeUndefined();
  });

  it("overwrites existing entries and deletes individual keys", () => {
    cache.set("key", "initial");
    cache.set("key", "updated");
    cache.set("other", 42);

    expect(cache.get("key")).toBe("updated");

    cache.delete("key");

    expect(cache.get("key")).toBeUndefined();
    expect(cache.get("other")).toBe(42);
  });

  it("clears the entire cache at once", () => {
    cache.set("alpha", 1);
    cache.set("beta", { ready: true });

    cache.clear();

    expect(cache.get("alpha")).toBeUndefined();
    expect(cache.get("beta")).toBeUndefined();
  });
});
