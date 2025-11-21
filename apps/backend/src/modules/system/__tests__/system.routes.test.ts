import express from "express";
import request from "supertest";
import type { RequestHandler } from "express";
import { z } from "zod";
import systemRouter from "../system.routes.js";
import { env } from "../../../config/env.js";
import { insertAudit } from "../../common/audit.util.js";
import type { AuditLogPayload } from "../../common/audit.util.js";

jest.mock("../../common/audit.util.js", () => ({
  insertAudit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../config/logger.js", () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../users/users.middleware.js", () => ({
  requireAuth: ((req, _res, next) => {
    Object.assign(req, { user: { sub: "admin-user", role: "admin" } });
    next();
  }) as RequestHandler,
}));

jest.mock("../../common/rbac.middleware.js", () => ({
  requireRole: () =>
    ((_req, _res, next) => {
      next();
    }) as RequestHandler,
}));

const insertAuditMock = insertAudit as jest.MockedFunction<typeof insertAudit>;
const mutableEnv = env as {
  readOnlyMode: boolean;
  maintenanceMessage?: string | null;
};

const readOnlyStatusSchema = z.object({
  readOnlyMode: z.boolean(),
  message: z.string().nullable(),
  timestamp: z.string(),
});

const readOnlyMutationSchema = readOnlyStatusSchema.extend({
  success: z.boolean(),
});

type ReadOnlyStatusResponse = z.infer<typeof readOnlyStatusSchema>;
type ReadOnlyMutationResponse = z.infer<typeof readOnlyMutationSchema>;

const parseStatusResponse = (payload: unknown): ReadOnlyStatusResponse =>
  readOnlyStatusSchema.parse(payload);
const parseMutationResponse = (payload: unknown): ReadOnlyMutationResponse =>
  readOnlyMutationSchema.parse(payload);

const latestAuditPayload = (): AuditLogPayload => {
  const call = insertAuditMock.mock.calls.at(-1);
  expect(call).toBeDefined();
  return call![0];
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/system", systemRouter);
  return app;
};

describe("system.routes", () => {
  let app: express.Application;

  beforeEach(() => {
    mutableEnv.readOnlyMode = false;
    mutableEnv.maintenanceMessage = null;
    insertAuditMock.mockClear();
    app = buildApp();
  });

  it("reports read-only status with maintenance message", async () => {
    mutableEnv.readOnlyMode = true;
    mutableEnv.maintenanceMessage = "Database upgrades";

    await request(app)
      .get("/system/read-only/status")
      .expect(200)
      .expect(({ body }: { body: unknown }) => {
        const parsed = parseStatusResponse(body);
        expect(parsed.readOnlyMode).toBe(true);
        expect(parsed.message).toBe("Database upgrades");
        expect(typeof parsed.timestamp).toBe("string");
      });
  });

  it("enables read-only mode and writes an audit entry", async () => {
    mutableEnv.readOnlyMode = false;
    await request(app)
      .post("/system/read-only/enable")
      .send({ reason: "emergency", estimatedDuration: "15m" })
      .expect(200)
      .expect(({ body }: { body: unknown }) => {
        const parsed = parseMutationResponse(body);
        expect(parsed.readOnlyMode).toBe(true);
      });
    expect(mutableEnv.readOnlyMode).toBe(true);

    const audit = latestAuditPayload();
    expect(audit.action).toBe("read_only_enabled");
    expect(audit.metadata).toMatchObject({
      reason: "emergency",
      estimatedDuration: "15m",
      previousState: false,
    });
  });

  it("disables read-only mode and logs audit metadata", async () => {
    mutableEnv.readOnlyMode = true;
    await request(app)
      .post("/system/read-only/disable")
      .send({ notes: "maintenance completed" })
      .expect(200)
      .expect(({ body }: { body: unknown }) => {
        const parsed = parseMutationResponse(body);
        expect(parsed.readOnlyMode).toBe(false);
      });
    expect(mutableEnv.readOnlyMode).toBe(false);

    const audit = latestAuditPayload();
    expect(audit.action).toBe("read_only_disabled");
    expect(audit.metadata).toMatchObject({
      notes: "maintenance completed",
      previousState: true,
    });
  });
});
