import type { Request, Response } from "express";
import { UpdateVibeformPreferencesSchema } from "./vibeforms.schemas.js";
import { getVibeformProfile, updateVibeformPreferences } from "./vibeforms.service.js";

function requireUserId(req: Request, res: Response): string | null {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Missing authenticated user context",
        requestId: res.locals.requestId,
      },
    });
    return null;
  }
  return userId;
}

export async function getMyVibeform(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req, res);
  if (!userId) {
    return;
  }

  res.json(await getVibeformProfile(userId));
}

export async function updateMyVibeformPreferences(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req, res);
  if (!userId) {
    return;
  }

  const parsed = UpdateVibeformPreferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid Vibeform preferences",
        details: parsed.error.flatten(),
        requestId: res.locals.requestId,
      },
    });
    return;
  }

  res.json(await updateVibeformPreferences(userId, parsed.data));
}
