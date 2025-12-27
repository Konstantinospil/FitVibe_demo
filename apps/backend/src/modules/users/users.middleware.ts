import type { NextFunction, Request, Response, RequestHandler } from "express";

import { env } from "../../config/env.js";
import { verifyAccess } from "../../services/tokens.js";

function bearerToken(header?: string | null): string | null {
  if (!header) {
    return null;
  }
  const [scheme, value] = header.split(" ");
  if (!value || scheme.toLowerCase() !== "bearer") {
    return null;
  }
  return value;
}

export const requireAuth: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const token =
    (req.cookies?.[env.ACCESS_COOKIE_NAME] as string | undefined) ??
    bearerToken(req.headers.authorization ?? null);
  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }
  try {
    const decoded = verifyAccess(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};
