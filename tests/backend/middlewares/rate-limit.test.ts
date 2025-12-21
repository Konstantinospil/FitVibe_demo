import type { Request, Response, NextFunction } from "express";
import type { JwtPayload } from "../../../apps/backend/src/modules/auth/auth.types.js";
import { rateLimit, rateLimitByUser } from "../../../apps/backend/src/middlewares/rate-limit.js";

type TestRequest = Request & { user?: JwtPayload };

type ResponseStub = {
  locals: { requestId: string };
  status: jest.MockedFunction<(code: number) => ResponseStub>;
  json: jest.MockedFunction<(payload: unknown) => ResponseStub>;
  setHeader: jest.MockedFunction<(name: string, value: string) => ResponseStub>;
  statusCode?: number;
  body?: unknown;
};

type Harness = {
  res: ResponseStub;
  expressRes: Response;
  next: jest.Mock;
  done: Promise<void>;
};

function createHarness(): Harness {
  let resolve!: () => void;
  let settled = false;
  const done = new Promise<void>((res) => {
    resolve = res;
  });
  const finish = () => {
    if (!settled) {
      settled = true;
      resolve();
    }
  };

  const res: ResponseStub = {
    locals: { requestId: "test-request" },
    status: jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((payload: unknown) => {
      res.body = payload;
      finish();
      return res;
    }),
    setHeader: jest.fn((name: string, value: string) => {
      return res;
    }),
  };

  const next = jest.fn(() => finish());
  return {
    res,
    expressRes: res as unknown as Response,
    next,
    done,
  };
}

async function runMiddleware(
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  overrides: Partial<TestRequest> = {},
) {
  const baseReq: Partial<TestRequest> = {
    method: "POST",
    headers: {} as Request["headers"],
    socket: { remoteAddress: "127.0.0.1" } as unknown as Request["socket"],
  };
  const req = { ...baseReq, ...overrides } as TestRequest;
  const harness = createHarness();
  middleware(req, harness.expressRes, harness.next);
  await harness.done;
  return { res: harness.res, next: harness.next };
}

describe("rateLimit middleware", () => {
  it("allows requests under the configured limit", async () => {
    const middleware = rateLimit("allow-test", 1, 60);
    const { next, res } = await runMiddleware(middleware);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("blocks requests after the limit is exceeded", async () => {
    const middleware = rateLimit("block-test", 1, 60);

    await runMiddleware(middleware);
    const { res, next } = await runMiddleware(middleware);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.body).toMatchObject({
      error: {
        code: "RATE_LIMITED",
        requestId: "test-request",
      },
    });
  });
});

describe("rateLimitByUser middleware", () => {
  it("keys rate limits by user id when present", async () => {
    const middleware = rateLimitByUser("user-scope", 1, 60);

    const user = { sub: "user-1", role: "athlete", sid: "session-1" };

    await runMiddleware(middleware, { user });
    const { res, next } = await runMiddleware(middleware, { user });

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
  });

  it("falls back to IP-based limiting when user context is missing", async () => {
    const middleware = rateLimitByUser("ip-fallback", 1, 60);
    const requestOverrides: Partial<TestRequest> = {
      headers: { "x-forwarded-for": "203.0.113.10" } as Request["headers"],
      socket: { remoteAddress: "203.0.113.10" } as unknown as Request["socket"],
    };

    await runMiddleware(middleware, requestOverrides);
    const { res, next } = await runMiddleware(middleware, requestOverrides);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
  });
});
