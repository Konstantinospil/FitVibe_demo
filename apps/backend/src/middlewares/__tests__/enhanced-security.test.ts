import { EventEmitter } from "events";
import type { Request, Response } from "express";
import {
  additionalSecurityHeaders,
  detectSuspiciousPatterns,
  enhancedCSP,
  generateNonce,
  logSecurityHeaders,
  noCacheHeaders,
  requestSizeLimiter,
  slowRequestTimeout,
  validateForwardedIP,
} from "../enhanced-security.js";

type TypedRequest = Request<
  Record<string, string>,
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>
>;

type TypedResponse = Response<Record<string, unknown>, Record<string, unknown>>;

type MockResponse = TypedResponse & {
  locals: Record<string, unknown>;
  status: jest.MockedFunction<TypedResponse["status"]>;
  json: jest.MockedFunction<TypedResponse["json"]>;
  setHeader: jest.MockedFunction<(key: string, value: string) => MockResponse>;
  getHeader: jest.MockedFunction<
    ((name: "set-cookie") => string[] | undefined) & ((name: string) => string | undefined)
  >;
  removeHeader: jest.MockedFunction<(key: string) => MockResponse>;
  on: jest.MockedFunction<
    (event: string | symbol, listener: (...args: unknown[]) => void) => MockResponse
  >;
};

describe("enhanced security middleware", () => {
  const createMockRes = (): MockResponse => {
    const headers: Record<string, string> = {};
    const res = new EventEmitter() as MockResponse;
    const baseOn = res.on.bind(res);

    res.locals = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn((key: string, value: string) => {
      headers[key] = value;
      return res;
    });
    res.getHeader = jest.fn((key: string) => {
      if (key === "set-cookie") {
        return undefined;
      }
      return headers[key];
    }) as jest.MockedFunction<
      ((name: "set-cookie") => string[] | undefined) & ((name: string) => string | undefined)
    >;
    res.removeHeader = jest.fn((key: string) => {
      return res;
    });
    res.on = jest.fn((event: string | symbol, handler: (...args: unknown[]) => void) => {
      baseOn(event, handler);
      return res;
    });

    return res;
  };

  it("generates a cryptographically random nonce", () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(nonce.length).toBeGreaterThanOrEqual(22);
  });

  it("applies CSP headers and stores nonce", () => {
    const res = createMockRes();
    const next = jest.fn();

    enhancedCSP({} as TypedRequest as Request, res, next);

    expect(typeof res.locals.cspNonce).toBe("string");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Security-Policy",
      expect.stringContaining("default-src"),
    );
    expect(next).toHaveBeenCalled();
  });

  it("adds strict security headers", () => {
    const res = createMockRes();
    const next = jest.fn();

    additionalSecurityHeaders({} as TypedRequest as Request, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Referrer-Policy",
      "strict-origin-when-cross-origin",
    );
    expect(res.removeHeader).toHaveBeenCalledWith("X-Powered-By");
    expect(next).toHaveBeenCalled();
  });

  it("limits request payload size", () => {
    const limiter = requestSizeLimiter(10);
    const req = new EventEmitter() as unknown as Request & {
      pause: jest.Mock;
      connection: { destroy: jest.Mock };
    };
    req.pause = jest.fn();
    req.connection = { destroy: jest.fn() } as any;
    const res = createMockRes();
    const next = jest.fn();

    limiter(req as unknown as Request, res, next);
    expect(next).toHaveBeenCalled();

    req.emit("data", Buffer.alloc(6));
    req.emit("data", Buffer.alloc(8));

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "E.VALIDATION.PAYLOAD_TOO_LARGE" }),
      }),
    );
    expect(req.pause).toHaveBeenCalled();
    expect(req.connection.destroy).toHaveBeenCalled();
  });

  it("times out slow requests", () => {
    jest.useFakeTimers();
    const timeout = slowRequestTimeout(1000);
    const res = createMockRes();
    const next = jest.fn();

    timeout({} as TypedRequest as Request, res, next);
    expect(next).toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    expect(res.status).toHaveBeenCalledWith(408);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "E.TIMEOUT.REQUEST_TIMEOUT" }),
      }),
    );

    res.emit("finish");
    jest.useRealTimers();
  });

  it("validates forwarded IP values and logs sanitised failures", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const next = jest.fn();
    const req: TypedRequest = {
      headers: {
        "x-forwarded-for": "bad.ip.address\r\nINJECT",
      },
    } as unknown as TypedRequest;
    const res = createMockRes();

    validateForwardedIP(req as unknown as Request, res, next);
    expect(warnSpy).toHaveBeenCalledWith(
      "[Security] Invalid X-Forwarded-For header:",
      expect.stringContaining("bad.ip.address"),
    );
    expect(next).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("blocks suspicious input patterns", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const req: TypedRequest = {
      query: { q: "<script>alert(1)</script>" },
      params: {},
      body: {},
      method: "GET",
      path: "/malicious",
      ip: "127.0.0.1",
      headers: { "user-agent": "test" },
    } as unknown as TypedRequest;
    const res = createMockRes();
    const next = jest.fn();

    detectSuspiciousPatterns(req as unknown as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "E.SECURITY.SUSPICIOUS_INPUT" }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("allows benign payloads through the suspicious pattern detector", () => {
    const req: TypedRequest = {
      query: { q: "legit search" },
      params: {},
      body: { value: "normal" },
    } as unknown as TypedRequest;
    const res = createMockRes();
    const next = jest.fn();

    detectSuspiciousPatterns(req as unknown as Request, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("applies no-cache headers", () => {
    const res = createMockRes();
    noCacheHeaders({} as TypedRequest as Request, res, jest.fn());

    expect(res.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private",
    );
    expect(res.setHeader).toHaveBeenCalledWith("Pragma", "no-cache");
  });

  it("logs missing security headers in development mode", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const res = createMockRes();

    logSecurityHeaders({ path: "/secure" } as TypedRequest as Request, res, jest.fn());

    res.emit("finish");
    expect(warnSpy).toHaveBeenCalledWith(
      "[Security] Missing security headers:",
      expect.objectContaining({ path: "/secure" }),
    );

    warnSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });
});
