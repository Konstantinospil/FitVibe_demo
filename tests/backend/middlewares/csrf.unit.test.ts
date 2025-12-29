import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

jest.mock("../../../apps/backend/src/config/env.js", () => ({
  env: {
    isProduction: false,
    csrf: {
      cookieKey: Buffer.alloc(32, 1),
    },
  },
}));

const buildReqRes = () => {
  const res = {
    cookie: jest.fn(),
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return {
    req: { cookies: {}, headers: {}, body: {}, query: {} } as Request,
    res,
  };
};

describe("csrf middleware internals", () => {
  const next = jest.fn<ReturnType<NextFunction>, Parameters<NextFunction>>();

  beforeEach(() => {
    jest.resetModules();
    next.mockClear();
  });

  it("issues CSRF tokens and cookies via csrfTokenRoute", async () => {
    const { csrfTokenRoute } = await import("../../../apps/backend/src/middlewares/csrf.js");
    const { req, res } = buildReqRes();

    csrfTokenRoute(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      "fitvibe-csrf",
      expect.stringMatching(/^v1\./),
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
    const bodySchema = z.object({ csrfToken: z.string() });
    const payload = (res.json as jest.Mock).mock.calls[0]?.[0];
    expect(bodySchema.parse(payload).csrfToken).toEqual(expect.any(String));
  });

  it("accepts tokens from headers and body", async () => {
    const { csrfProtection, csrfTokenRoute } =
      await import("../../../apps/backend/src/middlewares/csrf.js");
    const { req, res } = buildReqRes();

    csrfTokenRoute(req, res);
    const token = (res.json as jest.Mock).mock.calls[0][0].csrfToken as string;

    req.method = "POST";
    req.headers = { "x-csrf-token": token };

    csrfProtection(req, res, next);
    expect(next).toHaveBeenCalledWith();

    next.mockClear();
    req.headers = {};
    req.body = { _csrf: token };
    csrfProtection(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("bypasses validation for safe methods", async () => {
    const { csrfProtection } = await import("../../../apps/backend/src/middlewares/csrf.js");
    const { req, res } = buildReqRes();
    req.method = "GET";

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("rejects missing tokens", async () => {
    const { csrfProtection } = await import("../../../apps/backend/src/middlewares/csrf.js");
    const { req, res } = buildReqRes();
    req.method = "POST";

    csrfProtection(req, res, next);

    expect(next.mock.calls[0]?.[0]).toBeDefined();
  });
});

describe("validateOrigin", () => {
  const next = jest.fn<ReturnType<NextFunction>, Parameters<NextFunction>>();

  beforeEach(() => {
    jest.resetModules();
    next.mockClear();
  });

  it("allows requests from matching origin", async () => {
    const { validateOrigin } = await import("../../../apps/backend/src/middlewares/csrf.js");
    const { req, res } = buildReqRes();
    req.method = "POST";
    req.headers = { origin: "https://fitvibe.dev" };

    const middleware = validateOrigin(["https://fitvibe.dev"]);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("blocks requests with disallowed origin", async () => {
    const { validateOrigin } = await import("../../../apps/backend/src/middlewares/csrf.js");
    const { req, res } = buildReqRes();
    req.method = "POST";
    req.headers = { origin: "https://evil.dev" };

    const middleware = validateOrigin(["https://fitvibe.dev"]);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "FORBIDDEN", message: "Origin not allowed" },
    });
  });

  it("uses referer when origin is missing", async () => {
    const { validateOrigin } = await import("../../../apps/backend/src/middlewares/csrf.js");
    const { req, res } = buildReqRes();
    req.method = "POST";
    req.headers = { referer: "https://fitvibe.dev/profile" };

    const middleware = validateOrigin(["https://fitvibe.dev"]);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("rejects invalid referer values", async () => {
    const { validateOrigin } = await import("../../../apps/backend/src/middlewares/csrf.js");
    const { req, res } = buildReqRes();
    req.method = "POST";
    req.headers = { referer: "not-a-url" };

    const middleware = validateOrigin(["https://fitvibe.dev"]);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "FORBIDDEN", message: "Invalid referer" },
    });
  });

  it("rejects missing origin and referer", async () => {
    const { validateOrigin } = await import("../../../apps/backend/src/middlewares/csrf.js");
    const { req, res } = buildReqRes();
    req.method = "POST";

    const middleware = validateOrigin(["https://fitvibe.dev"]);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "FORBIDDEN", message: "Missing Origin/Referer header" },
    });
  });
});
