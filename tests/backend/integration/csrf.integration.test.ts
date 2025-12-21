import express, {
  Router,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cookieParser from "cookie-parser";
import request from "supertest";

import {
  csrfProtection,
  csrfTokenRoute,
  validateOrigin,
} from "../../../apps/backend/src/middlewares/csrf.js";
import { HttpError } from "../../../apps/backend/src/utils/http.js";

function createTestApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(cookieParser());
  app.use(express.json());

  const allowedOrigins = ["http://localhost:5173"];
  app.use(validateOrigin(allowedOrigins));
  app.use(csrfProtection);

  const router = Router();
  router.get("/csrf-token", csrfTokenRoute);
  router.post("/mutate", (_req, res) => {
    res.status(200).json({ success: true });
  });

  app.use("/api/v1", router);

  // Minimal error handler to surface HttpError responses as JSON
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }

    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: err.message,
      },
    });
  });

  return app;
}

describe("CSRF middleware integration", () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  it("permits state changes when a valid CSRF token is supplied", async () => {
    const agent = request.agent(app);

    const tokenResponse = await agent.get("/api/v1/csrf-token");
    expect(tokenResponse.status).toBe(200);

    const cookies = tokenResponse.headers["set-cookie"] ?? [];
    // Cookie name is environment-dependent: __Host-fitvibe-csrf (production) or fitvibe-csrf (development/test)
    const csrfCookie = cookies.find(
      (value: string) =>
        value.startsWith("__Host-fitvibe-csrf") || value.startsWith("fitvibe-csrf"),
    );
    expect(csrfCookie).toBeDefined();

    const { csrfToken } = tokenResponse.body;
    expect(typeof csrfToken).toBe("string");
    expect(csrfToken.length).toBeGreaterThan(10);

    const deniedResponse = await agent
      .post("/api/v1/mutate")
      .set("Origin", "http://localhost:5173")
      .send({});

    expect(deniedResponse.status).toBe(403);
    expect(deniedResponse.body).toMatchObject({
      error: { code: "CSRF_TOKEN_INVALID" },
    });

    const acceptedResponse = await agent
      .post("/api/v1/mutate")
      .set("Origin", "http://localhost:5173")
      .set("X-CSRF-Token", csrfToken)
      .send({});

    expect(acceptedResponse.status).toBe(200);
    expect(acceptedResponse.body).toEqual({ success: true });
  });

  it("issues CSRF cookies with HttpOnly + SameSite attributes", async () => {
    const agent = request.agent(app);

    const response = await agent.get("/api/v1/csrf-token");
    expect(response.status).toBe(200);

    const cookies = response.headers["set-cookie"] ?? [];
    // Cookie name is environment-dependent: __Host-fitvibe-csrf (production) or fitvibe-csrf (development/test)
    const csrfCookie = cookies.find(
      (value: string) =>
        value.startsWith("__Host-fitvibe-csrf") || value.startsWith("fitvibe-csrf"),
    );
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie).toContain("HttpOnly");
    expect(csrfCookie).toContain("SameSite=Lax");
  });
});
