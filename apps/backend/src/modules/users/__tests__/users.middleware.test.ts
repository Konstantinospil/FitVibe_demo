import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { NextFunction, Request, Response } from "express";

import { requireAuth } from "../users.middleware";
import { verifyAccess } from "../../../services/tokens";
import type { JwtPayload } from "../../auth/auth.types";

jest.mock("../../../services/tokens");

const mockVerifyAccess = verifyAccess as jest.MockedFunction<typeof verifyAccess>;

const createResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
  return {
    status,
    json,
  } as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
};

const createRequest = (authorization?: string): Request =>
  ({
    headers: authorization ? { authorization } : {},
  }) as Request;

const createNext = () => {
  const mock = jest.fn<ReturnType<NextFunction>, Parameters<NextFunction>>();
  const next: NextFunction = (...args) => mock(...args);
  return { next, mock };
};

describe("users.middleware.requireAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects when no Authorization header is present", () => {
    const req = createRequest();
    const res = createResponse();
    const { next, mock } = createNext();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing token" });
    expect(mock).not.toHaveBeenCalled();
  });

  it("rejects when header does not start with Bearer", () => {
    const req = createRequest("Basic abc123");
    const res = createResponse();
    const { next, mock } = createNext();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing token" });
    expect(mock).not.toHaveBeenCalled();
  });

  it("attaches decoded payload and calls next for valid tokens", () => {
    const req = createRequest("Bearer token-123");
    const res = createResponse();
    const { next, mock } = createNext();
    const payload = { sub: "user-1" } as JwtPayload;
    mockVerifyAccess.mockReturnValue(payload);

    requireAuth(req, res, next);

    expect(mockVerifyAccess).toHaveBeenCalledWith("token-123");
    expect(req.user).toBe(payload);
    expect(mock).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("responds with 401 when verification throws", () => {
    const req = createRequest("Bearer bad-token");
    const res = createResponse();
    const { next, mock } = createNext();
    mockVerifyAccess.mockImplementation(() => {
      throw new Error("invalid");
    });

    requireAuth(req, res, next);

    expect(mockVerifyAccess).toHaveBeenCalledWith("bad-token");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
    expect(mock).not.toHaveBeenCalled();
  });
});
