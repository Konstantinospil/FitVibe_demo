import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { db } from "../../db/connection.js";
import { HttpError } from "../../utils/http.js";
import {
  disable2FA,
  getTwoFactorStatus,
  regenerateBackupCodes,
  setupTwoFactor,
  verifyAndEnable2FA,
} from "./two-factor.service.js";

const VerificationSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/, "Code must be 6 digits").optional(),
    token: z.string().regex(/^\d{6}$/, "Token must be 6 digits").optional(),
  })
  .refine((value) => Boolean(value.code ?? value.token), {
    message: "Verification code is required",
  });

const DisableTwoFactorSchema = z.object({
  password: z.string().min(1),
});

function requireUserId(req: Request): string {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "Authentication required");
  }
  return userId;
}

async function enableFromRequest(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const parsed = VerificationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "E.VALIDATION.FAILED", "Invalid input", parsed.error.flatten());
  }

  const code = parsed.data.code ?? parsed.data.token;
  if (!code) {
    throw new HttpError(400, "E.VALIDATION.FAILED", "Verification code is required");
  }

  await db.transaction(async (trx) => {
    await verifyAndEnable2FA(userId, code, trx);
  });

  res.json({
    success: true,
    message: "Two-factor authentication enabled successfully",
  });
}

export async function setup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = requireUserId(req);
    const email = await db("user_contacts")
      .where({ user_id: userId, type: "email", is_primary: true })
      .first<{ value: string }>("value");

    if (!email?.value) {
      throw new HttpError(404, "E.USER.EMAIL_NOT_FOUND", "Primary email not found");
    }

    const result = await db.transaction((trx) => setupTwoFactor(userId, email.value, trx));

    res.json({
      secret: result.secret,
      qrCode: result.qrCode,
      backupCodes: result.backupCodes,
      message:
        "Save your backup codes in a safe place. You will need them if you lose access to your authenticator app.",
    });
  } catch (error) {
    next(error);
  }
}

export async function enable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await enableFromRequest(req, res);
  } catch (error) {
    next(error);
  }
}

export async function verify(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await enableFromRequest(req, res);
  } catch (error) {
    next(error);
  }
}

export async function disable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = requireUserId(req);
    const parsed = DisableTwoFactorSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "E.VALIDATION.FAILED", "Invalid input", parsed.error.flatten());
    }

    const user = await db("users")
      .where({ id: userId })
      .first<{ password_hash: string }>("password_hash");
    if (!user) {
      throw new HttpError(404, "E.USER.NOT_FOUND", "User not found");
    }

    await db.transaction(async (trx) => {
      await disable2FA(userId, parsed.data.password, user.password_hash, trx);
    });

    res.json({
      success: true,
      message: "Two-factor authentication disabled successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function regenerateBackups(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const backupCodes = await db.transaction((trx) => regenerateBackupCodes(userId, trx));

    res.json({
      message: "Backup codes regenerated successfully",
      backupCodes,
    });
  } catch (error) {
    next(error);
  }
}

export async function status(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = requireUserId(req);
    const result = await getTwoFactorStatus(userId);

    res.json(result);
  } catch (error) {
    next(error);
  }
}
