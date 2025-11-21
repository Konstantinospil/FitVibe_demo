import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { NextFunction, Request, Response } from "express";

import { requireAccessToken } from "../auth.middleware";
import { env } from "../../../config/env";
import { HttpError } from "../../../utils/http";
import { verifyAccess } from "../../../services/tokens";
import type { JwtPayload } from "../auth.types";

jest.mock("../../../services/tokens");

const mockVerifyAccess = verifyAccess as jest.MockedFunction<typeof verifyAccess>;
const noopResponse = {} as Response;

type MutableRequest = Request & {
  cookies: Record<string, string>;
  headers: Record<string, string>;
};

const createRequest = (): MutableRequest =>
  ({
    cookies: {},
    headers: {},
  }) as MutableRequest;

const createNext = () => {
  const mock = jest.fn<void, Parameters<NextFunction>>();
  const next: NextFunction = (...args) => mock(...args);
  return { next, mock };
};

describe("requireAccessToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects requests without cookies or headers", () => {
    const req = createRequest();
    const { next, mock } = createNext();

    requireAccessToken(req, noopResponse, next);

    expect(mockVerifyAccess).not.toHaveBeenCalled();
    expect(mock).toHaveBeenCalledTimes(1);
    const error = mock.mock.calls[0][0] as HttpError;
    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHENTICATED");
    expect(error.message).toBe("Access token required");
  });

  it("accepts a valid access token from cookies", () => {
    const req = createRequest();
    const { next, mock } = createNext();
    const token = "cookie-token";
    req.cookies[env.ACCESS_COOKIE_NAME] = token;
    const payload = { sub: "user-123", role: "athlete" } as JwtPayload;

    mockVerifyAccess.mockReturnValue(payload);

    requireAccessToken(req, noopResponse, next);

    expect(mockVerifyAccess).toHaveBeenCalledWith(token);
    expect(req.user).toBe(payload);
    expect(mock).toHaveBeenCalledWith();
  });

  it("falls back to Bearer tokens in the Authorization header", () => {
    const req = createRequest();
    const { next, mock } = createNext();
    const token = "header-token";
    req.headers.authorization = `BeArEr ${token}`;
    const payload = { sub: "user-456", role: "coach" } as JwtPayload;

    mockVerifyAccess.mockReturnValue(payload);

    requireAccessToken(req, noopResponse, next);

    expect(mockVerifyAccess).toHaveBeenCalledWith(token);
    expect(req.user).toBe(payload);
    expect(mock).toHaveBeenCalledWith();
  });

  it("treats malformed Authorization headers as missing credentials", () => {
    const req = createRequest();
    const { next, mock } = createNext();
    req.headers.authorization = "Token something";

    requireAccessToken(req, noopResponse, next);

    expect(mockVerifyAccess).not.toHaveBeenCalled();
    expect(mock).toHaveBeenCalledTimes(1);
    const error = mock.mock.calls[0][0] as HttpError;
    expect(error).toBeInstanceOf(HttpError);
    expect(error.message).toBe("Access token required");
  });

  it("converts token verification failures into HttpErrors", () => {
    const req = createRequest();
    const { next, mock } = createNext();
    const token = "invalid-token";
    req.headers.authorization = `Bearer ${token}`;

    mockVerifyAccess.mockImplementation(() => {
      throw new Error("jwt expired");
    });

    requireAccessToken(req, noopResponse, next);

    expect(mockVerifyAccess).toHaveBeenCalledWith(token);
    const error = mock.mock.calls[0][0] as HttpError;
    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(401);
    expect(error.message).toBe("Invalid or expired access token");
  });
});
