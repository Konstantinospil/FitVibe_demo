import type { NextFunction, Request, RequestHandler } from "express";
import type { ZodSchema } from "zod";
import { logger } from "../config/logger.js";
import { HttpError } from "./http.js";

type RequestSegment = "body" | "query" | "params";

export function validate<T>(schema: ZodSchema<T>, target: RequestSegment = "body"): RequestHandler {
  return (req: Request, _res, next: NextFunction) => {
    const currentValue: unknown =
      target === "body" ? req.body : target === "query" ? req.query : req.params;

    const result = schema.safeParse(currentValue);
    if (result.success) {
      if (target === "body") {
        req.body = result.data as unknown;
      }
      (req as Request & { validated?: T }).validated = result.data;
      return next();
    }

    logger.warn({ issues: result.error.issues, target }, "[validation] Validation failed");
    return next(
      new HttpError(400, "VALIDATION_ERROR", "Validation failed", result.error.flatten()),
    );
  };
}
