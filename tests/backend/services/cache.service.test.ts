import { CacheService } from "../../../apps/backend/src/services/cache.service.js";
import { logger } from "../../../apps/backend/src/config/logger.js";
import Redis from "ioredis";

jest.mock("../../../apps/backend/src/jobs/services/queue.factory.js", () => ({
  shutdownQueue: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("ioredis", () => {
  const constructor = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    removeListener: jest.fn(),
    getMaxListeners: jest.fn().mockReturnValue(10),
    setMaxListeners: jest.fn(),
    defineCommand: jest.fn(),
    info: jest.fn().mockResolvedValue("redis_version:6.2.0"),
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    flushdb: jest.fn(),
    quit: jest.fn(),
    status: "ready",
  }));
  return { __esModule: true, default: constructor };
});

jest.mock("../../../apps/backend/src/config/logger.js", () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("CacheService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.REDIS_ENABLED;
  });

  it("stores and expires values in memory", async () => {
    process.env.REDIS_ENABLED = "false";
    const service = new CacheService();
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1000);

    await service.set("key", { value: 1 }, 1);
    expect(await service.get("key")).toEqual({ value: 1 });

    nowSpy.mockReturnValue(3000);
    expect(await service.get("key")).toBeUndefined();

    nowSpy.mockRestore();
  });

  it("uses redis when enabled and available", async () => {
    process.env.REDIS_ENABLED = "true";
    const service = new CacheService();
    const redisMock = Redis as unknown as jest.Mock;
    const redisInstance = redisMock.mock.results.at(-1)?.value as {
      get: jest.Mock;
      set: jest.Mock;
      status: string;
    };
    expect(redisInstance).toBeDefined();

    redisInstance.get.mockResolvedValueOnce(JSON.stringify({ ok: true }));

    expect(await service.get("alpha")).toEqual({ ok: true });
    await service.set("alpha", { ok: true });
    expect(redisInstance.set).toHaveBeenCalled();
    expect(service.isRedisAvailable()).toBe(true);
  });

  it("falls back to memory when redis operations fail", async () => {
    process.env.REDIS_ENABLED = "true";
    const service = new CacheService();
    const redisMock = Redis as unknown as jest.Mock;
    const redisInstance = redisMock.mock.results.at(-1)?.value as {
      get: jest.Mock;
      set: jest.Mock;
      del: jest.Mock;
      flushdb: jest.Mock;
      on: jest.Mock;
    };
    expect(redisInstance).toBeDefined();

    redisInstance.set.mockRejectedValueOnce(new Error("boom"));
    redisInstance.get.mockRejectedValueOnce(new Error("boom"));
    await service.set("beta", 123);
    expect(await service.get("beta")).toBe(123);

    await service.delete("beta");
    await service.clear();

    const errorHandler = redisInstance.on.mock.calls.find(([event]) => event === "error")?.[1];
    errorHandler?.(new Error("redis down"));
    expect(service.isRedisAvailable()).toBe(false);
    expect(logger.warn).toHaveBeenCalled();
  });
});
