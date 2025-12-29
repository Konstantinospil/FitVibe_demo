import { z } from "zod";
import type { NextFunction, Request } from "express";
import { validate } from "../../../apps/backend/src/utils/validation.js";
import { HttpError } from "../../../apps/backend/src/utils/http.js";
import { logger } from "../../../apps/backend/src/config/logger.js";

jest.mock("../../../apps/backend/src/config/logger.js", () => ({
  logger: {
    warn: jest.fn(),
  },
}));

describe("validate", () => {
  const next = jest.fn<ReturnType<NextFunction>, Parameters<NextFunction>>();

  beforeEach(() => {
    next.mockClear();
    jest.mocked(logger.warn).mockClear();
  });

  it("adds validated payload and updates body when validation succeeds", () => {
    const schema = z.object({ name: z.string() });
    const handler = validate(schema, "body");
    const req = { body: { name: "FitVibe" } } as Request & { validated?: { name: string } };

    handler(req, {} as never, next);

    expect(req.body).toEqual({ name: "FitVibe" });
    expect(req.validated).toEqual({ name: "FitVibe" });
    expect(next).toHaveBeenCalledWith();
  });

  it("reads query params when target is query", () => {
    const schema = z.object({ page: z.string() });
    const handler = validate(schema, "query");
    const req = { query: { page: "2" } } as Request & { validated?: { page: string } };

    handler(req, {} as never, next);

    expect(req.validated).toEqual({ page: "2" });
    expect(next).toHaveBeenCalledWith();
  });

  it("passes HttpError to next when validation fails", () => {
    const schema = z.object({ age: z.number().min(1) });
    const handler = validate(schema, "body");
    const req = { body: { age: 0 } } as Request;

    handler(req, {} as never, next);

    const error = next.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(HttpError);
    expect(jest.mocked(logger.warn)).toHaveBeenCalled();
  });
});
