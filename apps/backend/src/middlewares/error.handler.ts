import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import multer from "multer";
import { logger } from "../config/logger.js";
import { HttpError } from "../utils/http.js";

type GenericError = Error & {
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
};

function normalizeError(err: unknown): HttpError {
  if (err instanceof HttpError) {
    return err;
  }

  // Handle Multer errors (file upload errors)
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return new HttpError(413, "E.UPLOAD.FILE_TOO_LARGE", "File size exceeds the allowed limit");
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return new HttpError(400, "E.UPLOAD.TOO_MANY_FILES", "Too many files uploaded");
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return new HttpError(400, "E.UPLOAD.UNEXPECTED_FILE", "Unexpected file field");
    }
    // Generic Multer error
    return new HttpError(400, "E.UPLOAD.ERROR", err.message || "File upload error");
  }

  if (err instanceof ZodError) {
    return new HttpError(400, "VALIDATION_ERROR", "VALIDATION_ERROR", err.flatten());
  }

  if (
    err instanceof Error &&
    "flatten" in err &&
    typeof (err as { flatten: () => unknown }).flatten === "function"
  ) {
    const flattenResult = (err as { flatten: () => unknown }).flatten();
    return new HttpError(400, "VALIDATION_ERROR", "VALIDATION_ERROR", flattenResult);
  }

  if (err instanceof Error) {
    const status = (err as GenericError).status ?? 500;
    const code =
      (err as GenericError).code ??
      (status === 400
        ? "BAD_REQUEST"
        : status === 401
          ? "UNAUTHENTICATED"
          : status === 403
            ? "FORBIDDEN"
            : status === 404
              ? "NOT_FOUND"
              : status === 429
                ? "RATE_LIMITED"
                : "INTERNAL_SERVER_ERROR");

    const normalized = new HttpError(status, code, err.message || "INTERNAL_SERVER_ERROR");
    if ((err as GenericError).details) {
      normalized.details = (err as GenericError).details;
    }
    return normalized;
  }

  return new HttpError(500, "INTERNAL_SERVER_ERROR", "INTERNAL_SERVER_ERROR");
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const normalized = normalizeError(err);
  const requestId = typeof res.locals.requestId === "string" ? res.locals.requestId : undefined;

  // Extract user ID from request
  const userId =
    req.user && typeof req.user === "object" && "sub" in req.user
      ? (req.user as { sub?: unknown }).sub
      : undefined;

  // Safely extract body keys for logging (avoid logging sensitive data)
  const bodyKeys =
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    req.body &&
    typeof req.body === "object" &&
    !Array.isArray(req.body)
      ? Object.keys(req.body as Record<string, unknown>).length > 0
        ? { keys: Object.keys(req.body as Record<string, unknown>) }
        : undefined
      : undefined;

  logger.error(
    {
      err,
      status: normalized.status,
      code: normalized.code,
      requestId,
      path: req.originalUrl,
      method: req.method,
      userId: typeof userId === "string" ? userId : undefined,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      ...(bodyKeys ? { body: bodyKeys } : {}),
    },
    "Request failed",
  );

  res.status(normalized.status).json({
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details ? { details: normalized.details } : {}),
      requestId,
    },
  });
}
