import type { NextFunction, Request, Response } from "express";

import { errorHandler } from "../errorHandler";
import { HttpError } from "../../../utils/http";
import { logger } from "../../../config/logger";

jest.mock("../../../config/logger", () => ({
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
});
