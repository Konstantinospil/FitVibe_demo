import express from "express";
import cookieParser from "cookie-parser";
import { z } from "zod";
import { invokeExpress } from "../test-helpers/express-request";
import {
  csrfProtection,
  csrfTokenRoute,
  validateOrigin,
} from "../../../apps/backend/src/middlewares/csrf.js";
import { HttpError } from "../../../apps/backend/src/utils/http.js";

const errorHandler: express.ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code } });
  }
  return next(err);
};

const buildCsrfApp = () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.get("/csrf-token", csrfTokenRoute);
  app.post("/protected", csrfProtection, (_req, res) => {
    res.json({ success: true });
  });
  app.use(errorHandler);
  return app;
};

const csrfResponseSchema = z.object({ csrfToken: z.string() });
const forbiddenSchema = z.object({ error: z.object({ code: z.string() }) });

describe("csrfProtection integration", () => {
  it("issues CSRF tokens via the token route", async () => {
    const res = await invokeExpress(buildCsrfApp(), { method: "GET", url: "/csrf-token" });
    expect(res.statusCode).toBe(200);
    const body = csrfResponseSchema.parse(res.json);
    expect(body.csrfToken).toEqual(expect.any(String));
    // Cookie name is environment-dependent: __Host-fitvibe-csrf (production) or fitvibe-csrf (development/test)
    const setCookieHeader = res.headers["set-cookie"];
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : setCookieHeader
        ? [setCookieHeader]
        : [];
    const hasCsrfCookie = cookies.some((cookie) => {
      return cookie.includes("__Host-fitvibe-csrf") || cookie.includes("fitvibe-csrf");
    });
    expect(hasCsrfCookie).toBe(true);
  });

  it("blocks unsafe requests without a token", async () => {
    const res = await invokeExpress(buildCsrfApp(), {
      method: "POST",
      url: "/protected",
      body: {},
    });
    expect(res.statusCode).toBe(403);
    const body = forbiddenSchema.parse(res.json);
    expect(body.error.code).toBe("CSRF_TOKEN_INVALID");
  });

  it("accepts unsafe requests when a valid token and cookie are provided", async () => {
    const tokenResponse = await invokeExpress(buildCsrfApp(), {
      method: "GET",
      url: "/csrf-token",
    });
    const setCookieHeader = tokenResponse.headers["set-cookie"];
    const csrfCookie = Array.isArray(setCookieHeader)
      ? setCookieHeader[0]
      : (setCookieHeader ?? "");
    const csrfToken = csrfResponseSchema.parse(tokenResponse.json).csrfToken;

    const res = await invokeExpress(buildCsrfApp(), {
      method: "POST",
      url: "/protected",
      headers: {
        cookie: csrfCookie,
        "x-csrf-token": csrfToken,
      },
      body: {},
    });

    expect(res.statusCode).toBe(200);
    expect(res.json).toEqual({ success: true });
  });
});

const buildOriginApp = () => {
  const app = express();
  const middleware = validateOrigin(["https://app.fitvibe.test"]);
  app.post("/action", middleware, (_req, res) => res.json({ ok: true }));
  return app;
};

describe("validateOrigin middleware", () => {
  it("allows requests when the Origin header is whitelisted", async () => {
    const res = await invokeExpress(buildOriginApp(), {
      method: "POST",
      url: "/action",
      headers: { origin: "https://app.fitvibe.test" },
      body: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.json).toEqual({ ok: true });
  });

  it("rejects requests with an invalid Referer header", async () => {
    const res = await invokeExpress(buildOriginApp(), {
      method: "POST",
      url: "/action",
      headers: { referer: "https://evil.example.com/page" },
      body: {},
    });

    expect(res.statusCode).toBe(403);
    expect(forbiddenSchema.parse(res.json).error.code).toBe("FORBIDDEN");
  });
});
