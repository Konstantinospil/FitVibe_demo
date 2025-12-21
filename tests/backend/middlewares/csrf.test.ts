import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { z } from "zod";
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
    const app = buildCsrfApp();

    const res = await request(app).get("/csrf-token").expect(200);
    const body = csrfResponseSchema.parse(res.body);
    expect(body.csrfToken).toEqual(expect.any(String));
    // Cookie name is environment-dependent: __Host-fitvibe-csrf (production) or fitvibe-csrf (development/test)
    const cookies = res.headers["set-cookie"] ?? [];
    const hasCsrfCookie = cookies.some(
      (cookie: string) => cookie.includes("__Host-fitvibe-csrf") || cookie.includes("fitvibe-csrf"),
    );
    expect(hasCsrfCookie).toBe(true);
  });

  it("blocks unsafe requests without a token", async () => {
    const app = buildCsrfApp();

    const res = await request(app).post("/protected").send({}).expect(403);
    const body = forbiddenSchema.parse(res.body);
    expect(body.error.code).toBe("CSRF_TOKEN_INVALID");
  });

  it("accepts unsafe requests when a valid token and cookie are provided", async () => {
    const app = buildCsrfApp();
    const tokenResponse = await request(app).get("/csrf-token").expect(200);
    const csrfCookie = tokenResponse.headers["set-cookie"]?.[0];
    const csrfToken = csrfResponseSchema.parse(tokenResponse.body).csrfToken;

    const res = await request(app)
      .post("/protected")
      .set("Cookie", csrfCookie ?? "")
      .set("x-csrf-token", csrfToken)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
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
    const app = buildOriginApp();

    await request(app)
      .post("/action")
      .set("Origin", "https://app.fitvibe.test")
      .expect(200)
      .expect({ ok: true });
  });

  it("rejects requests with an invalid Referer header", async () => {
    const app = buildOriginApp();

    const res = await request(app)
      .post("/action")
      .set("Referer", "https://evil.example.com/page")
      .expect(403);

    expect(forbiddenSchema.parse(res.body).error.code).toBe("FORBIDDEN");
  });
});
