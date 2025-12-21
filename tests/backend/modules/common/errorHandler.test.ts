import type { NextFunction, Request, Response } from "express";

import { errorHandler } from "../../../../apps/backend/src/modules/common/errorHandler.js";
import { HttpError } from "../../../../apps/backend/src/utils/http.js";
import { logger } from "../../../../apps/backend/src/config/logger.js";

jest.mock("../../../../apps/backend/src/config/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

const loggerErrorMock = logger.error as jest.Mock;

function createResponse() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = {
    locals: { requestId: "req-123" },
    headersSent: false,
    status,
  } as unknown as Response;

  return { res, status, json };
}

describe("errorHandler middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("logs and formats HttpError responses", () => {
    const { res, status, json } = createResponse();
    const next = jest.fn() as NextFunction;
    const err = new HttpError(404, "NOT_FOUND", "Record missing", { field: "id" });

    errorHandler(err, {} as Request, res, next);

    expect(loggerErrorMock).toHaveBeenCalledWith(
      { err, requestId: "req-123" },
      "Unhandled application error",
    );
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: "NOT_FOUND",
        message: "Record missing",
        details: { field: "id" },
        requestId: "req-123",
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("uses provided status numbers on generic errors", () => {
    const { res, status, json } = createResponse();
    const next = jest.fn() as NextFunction;
    const err = Object.assign(new Error("Short and stout"), { status: 418 });

    errorHandler(err, {} as Request, res, next);

    expect(status).toHaveBeenCalledWith(418);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: "UNEXPECTED_ERROR",
        message: "Short and stout",
        requestId: "req-123",
      },
    });
  });

  it("falls back to 500 and generic message when error lacks status", () => {
    const { res, status, json } = createResponse();
    const next = jest.fn() as NextFunction;
    const err = new Error("Boom");

    errorHandler(err, {} as Request, res, next);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: "INTERNAL_ERROR",
        message: "Boom",
        requestId: "req-123",
      },
    });
  });

  it("delegates to next when headers are already sent", () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = {
      locals: { requestId: "req-123" },
      headersSent: true,
      status,
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    errorHandler("oops", {} as Request, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(status).not.toHaveBeenCalled();
  });

  it("handles non-Error objects without status", () => {
    const { res, status, json } = createResponse();
    const next = jest.fn() as NextFunction;

    errorHandler("string error", {} as Request, res, next);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        requestId: "req-123",
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("handles errors with status 500 code mapping", () => {
    const { res, status, json } = createResponse();
    const next = jest.fn() as NextFunction;
    const err = Object.assign(new Error("Server error"), { status: 500 });

    errorHandler(err, {} as Request, res, next);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: "INTERNAL_ERROR",
        message: "Server error",
        requestId: "req-123",
      },
    });
  });

  it("handles errors with non-500 status code mapping", () => {
    const { res, status, json } = createResponse();
    const next = jest.fn() as NextFunction;
    const err = Object.assign(new Error("Not found"), { status: 404 });

    errorHandler(err, {} as Request, res, next);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: "UNEXPECTED_ERROR",
        message: "Not found",
        requestId: "req-123",
      },
    });
  });

  it("handles HttpError without details", () => {
    const { res, status, json } = createResponse();
    const next = jest.fn() as NextFunction;
    const err = new HttpError(403, "FORBIDDEN", "Access denied");

    errorHandler(err, {} as Request, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: "FORBIDDEN",
        message: "Access denied",
        requestId: "req-123",
      },
    });
  });

  it("handles response with no requestId", () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = {
      locals: {},
      headersSent: false,
      status,
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    const err = new HttpError(404, "NOT_FOUND", "Not found");

    errorHandler(err, {} as Request, res, next);

    expect(json).toHaveBeenCalledWith({
      error: {
        code: "NOT_FOUND",
        message: "Not found",
        requestId: undefined,
      },
    });
  });
});
