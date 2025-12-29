import type { Request } from "express";

jest.mock("../../../apps/backend/src/config/logger.js", () => ({
  logger: {
    info: jest.fn(),
  },
}));

jest.mock("../../../apps/backend/src/config/env.js", () => ({
  env: {
    NODE_ENV: "production",
  },
}));

describe("httpLogger", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const loadLogger = async () => {
    let lastOptions: {
      stream: { write: (message: string) => void };
      skip: (req: Request) => boolean;
    } | null = null;

    jest.doMock("morgan", () => {
      const fn = jest.fn((_formatter, options) => {
        lastOptions = options;
        return jest.fn();
      });
      (fn as typeof fn & { token: jest.Mock }).token = jest.fn();
      return { __esModule: true, default: fn };
    });

    await import("../../../apps/backend/src/middlewares/request-logger.js");

    expect(lastOptions).not.toBeNull();
    const { logger } = await import("../../../apps/backend/src/config/logger.js");
    const { env } = await import("../../../apps/backend/src/config/env.js");
    jest.mocked(logger.info).mockClear();
    return { options: lastOptions!, logger, env };
  };

  it("logs structured payloads from JSON", async () => {
    const { options, logger } = await loadLogger();
    const { stream } = options;

    stream.write(JSON.stringify({ status: 200, route: "/api" }));

    expect(logger.info).toHaveBeenCalledWith({ status: 200, route: "/api" }, "http_request");
  });

  it("logs primitive JSON payloads as message + raw", async () => {
    const { options, logger } = await loadLogger();
    const { stream } = options;

    stream.write(JSON.stringify("simple"));

    expect(logger.info).toHaveBeenCalledWith({ message: "simple", raw: "simple" }, "http_request");
  });

  it("logs unstructured messages when JSON parsing fails", async () => {
    const { options, logger } = await loadLogger();
    const { stream } = options;

    stream.write("plain log");

    expect(logger.info).toHaveBeenCalledWith({ message: "plain log" }, "http_request");
  });

  it("skips logging in test mode and for health/metrics routes", async () => {
    const { options, env } = await loadLogger();
    const { skip } = options;

    const req = { originalUrl: "/health" } as Request;
    expect(skip(req, {} as never)).toBe(true);

    const metricsReq = { originalUrl: "/metrics?prom=true" } as Request;
    expect(skip(metricsReq, {} as never)).toBe(true);

    (env as { NODE_ENV: string }).NODE_ENV = "test";
    const otherReq = { originalUrl: "/api" } as Request;
    expect(skip(otherReq, {} as never)).toBe(true);

    (env as { NODE_ENV: string }).NODE_ENV = "production";
    expect(skip(otherReq, {} as never)).toBe(false);
  });
});
