import type { NextFunction, Request, Response } from "express";

import { ownerGuard } from "../../../../apps/backend/src/modules/common/ownership.middleware.js";
import { db } from "../../../../apps/backend/src/db/connection.js";
import { logger } from "../../../../apps/backend/src/config/logger.js";

jest.mock("../../../../apps/backend/src/db/connection.js", () => {
  const mockDb = jest.fn();
  return { db: mockDb };
});

jest.mock("../../../../apps/backend/src/config/logger.js", () => ({
  logger: { error: jest.fn() },
}));

const dbMock = db as unknown as jest.Mock;
const loggerErrorMock = logger.error as jest.Mock;

function createResponse() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  return { res, status, json };
}

function createRequest({
  userId = "user-1",
  params = { id: "resource-1" },
}: {
  userId?: string | null;
  params?: Record<string, string | undefined>;
} = {}) {
  const req = {
    params,
    user: userId ? { sub: userId } : undefined,
  } as unknown as Request;
  return req;
}

const buildQuery = (record: unknown) => {
  const builder = {
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(record),
  };
  dbMock.mockReturnValueOnce(builder);
  return builder;
};

describe("ownerGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is missing", async () => {
    const handler = ownerGuard("sessions");
    const req = createRequest({ userId: null });
    const { res, status, json } = createResponse();
    const next = jest.fn() as NextFunction;

    await handler(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 when resource id is missing", async () => {
    const handler = ownerGuard("sessions", "sessionId");
    const req = createRequest({ params: {} });
    const { res, status, json } = createResponse();

    await handler(req, res, jest.fn() as NextFunction);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: "Invalid resource identifier" });
  });

  it("returns 404 when resource is not found", async () => {
    const handler = ownerGuard("sessions");
    const req = createRequest();
    const { res, status, json } = createResponse();
    const builder = buildQuery(undefined);

    await handler(req, res, jest.fn() as NextFunction);

    expect(dbMock).toHaveBeenCalledWith("sessions");
    expect(builder.where).toHaveBeenCalledWith("id", "resource-1");
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: "Not found" });
  });

  it("returns 403 when user does not own the resource", async () => {
    const handler = ownerGuard("sessions");
    const req = createRequest({ userId: "user-123" });
    buildQuery({ id: "resource-1", user_id: "other-user" });
    const { res, status, json } = createResponse();

    await handler(req, res, jest.fn() as NextFunction);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("calls next when ownership passes via user_id", async () => {
    const handler = ownerGuard("sessions");
    const req = createRequest({ userId: "owner-1" });
    buildQuery({ id: "resource-1", user_id: "owner-1" });
    const next = jest.fn() as NextFunction;

    await handler(req, createResponse().res, next);

    expect(next).toHaveBeenCalled();
  });

  it("calls next when ownership passes via owner_id", async () => {
    const handler = ownerGuard("plans");
    const req = createRequest({ userId: "owner-2" });
    buildQuery({ id: "resource-2", owner_id: "owner-2" });
    const next = jest.fn() as NextFunction;

    await handler(req, createResponse().res, next);

    expect(next).toHaveBeenCalled();
  });

  it("logs and responds with 500 when db query fails", async () => {
    const handler = ownerGuard("sessions");
    const req = createRequest();
    const { res, status, json } = createResponse();
    const error = new Error("db failed");
    const builder = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockRejectedValue(error),
    };
    dbMock.mockReturnValueOnce(builder);

    await handler(req, res, jest.fn() as NextFunction);

    expect(loggerErrorMock).toHaveBeenCalledWith(
      { err: error, table: "sessions", resourceId: "resource-1", userId: "user-1" },
      "Ownership check failed",
    );
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "Server error" });
  });
});
