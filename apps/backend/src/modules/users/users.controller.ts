import type { Request, Response } from "express";
import archiver from "archiver";
import { z } from "zod";
import {
  getMe,
  listAll,
  updateProfile,
  updatePassword,
  requestAccountDeletion,
  collectUserData,
  listContacts,
  updatePrimaryEmail,
  updatePhoneNumber,
  verifyContact,
  requestContactVerification,
  removeContact,
  changeStatus,
  createUser,
} from "./users.service.js";
import { getContactById, getUserMetrics } from "./users.repository.js";
import { passwordPolicy } from "../auth/auth.schemas.js";
import { getIdempotencyKey, getRouteTemplate } from "../common/idempotency.helpers.js";
import { resolveIdempotency, persistIdempotencyResult } from "../common/idempotency.service.js";

const usernameSchema = z
  .string()
  .min(3)
  .max(50)
  .regex(
    /^[a-zA-Z0-9_.-]+$/,
    "Username may only contain letters, numbers, underscores, dots, or dashes",
  );

const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  displayName: z.string().min(1).max(120).optional(),
  locale: z.string().max(10).optional(),
  preferredLang: z.string().max(5).optional(),
  alias: z
    .string()
    .min(3)
    .max(50)
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "Alias may only contain letters, numbers, underscores, dots, or dashes",
    )
    .optional(),
  weight: z
    .number()
    .positive()
    .min(20)
    .max(500)
    .refine(
      (val) => {
        // Check that weight has at most 2 decimal places
        const decimalPart = val.toString().split(".")[1];
        return !decimalPart || decimalPart.length <= 2;
      },
      { message: "Weight must have at most 2 decimal places" },
    )
    .optional(),
  weightUnit: z.enum(["kg", "lb"]).optional(),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
  trainingFrequency: z
    .enum(["rarely", "1_2_per_week", "3_4_per_week", "5_plus_per_week"])
    .optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(12).max(128),
  newPassword: passwordPolicy,
});

const emailSchema = z.object({
  email: z.string().email().max(254),
});

const phoneSchema = z.object({
  phone: z.string().min(5).max(32),
  isRecovery: z.boolean().optional(),
});

const contactIdSchema = z.object({
  contactId: z.string().uuid(),
});

const verifyContactBodySchema = z.object({
  token: z.string().min(10).max(256),
});

const createUserSchema = z.object({
  username: usernameSchema,
  displayName: z.string().min(1).max(120),
  email: z.string().email().max(254),
  password: passwordPolicy,
  role: z.string().min(1).max(50),
  locale: z.string().max(10).optional(),
  preferredLang: z.string().max(5).optional(),
  status: z.enum(["pending_verification", "active", "archived"]).optional(),
});

const statusSchema = z.object({
  status: z.enum(["pending_verification", "active", "archived", "pending_deletion"]),
});

const deleteAccountSchema = z.object({
  password: z.string().min(12).max(128),
});

export async function me(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await getMe(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
  return;
}

export async function list(req: Request, res: Response): Promise<void> {
  const limit = Number.parseInt(req.query.limit as string, 10) || 50;
  const offset = Number.parseInt(req.query.offset as string, 10) || 0;
  const users = await listAll(limit, offset);
  res.json(users);
  return;
}

export async function adminCreateUser(req: Request, res: Response): Promise<void> {
  const actorId = req.user?.sub ?? null;
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const userId = actorId ?? "system";
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      parsed.data,
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const user = await createUser(actorId, parsed.data);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 201, user);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(201).json(user);
    return;
  }

  const user = await createUser(actorId, parsed.data);
  res.status(201).json(user);
  return;
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      parsed.data,
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const user = await updateProfile(userId, parsed.data);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 200, user);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.json(user);
    return;
  }

  const user = await updateProfile(userId, parsed.data);
  res.json(user);
  return;
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Idempotency support (password not included in payload for security)
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      {}, // Don't include passwords in idempotency payload
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).send();
      return;
    }

    await updatePassword(userId, parsed.data);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 204, null);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(204).send();
    return;
  }

  await updatePassword(userId, parsed.data);
  res.status(204).send();
  return;
}

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Validate password is provided
  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Idempotency support (password not included in payload for security)
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      {}, // Don't include password in idempotency payload
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const schedule = await requestAccountDeletion(userId, parsed.data.password);

    const response = {
      status: "pending_deletion",
      scheduledAt: schedule.scheduledAt,
      purgeDueAt: schedule.purgeDueAt,
      backupPurgeDueAt: schedule.backupPurgeDueAt,
    };

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 202, response);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(202).json(response);
    return;
  }

  const schedule = await requestAccountDeletion(userId, parsed.data.password);
  res.status(202).json({
    status: "pending_deletion",
    scheduledAt: schedule.scheduledAt,
    purgeDueAt: schedule.purgeDueAt,
    backupPurgeDueAt: schedule.backupPurgeDueAt,
  });
  return;
}

export async function exportData(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const data = await collectUserData(userId);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="fitvibe_user_export.zip"');

  const archive = archiver("zip");
  archive.pipe(res);
  archive.append(JSON.stringify(data, null, 2), { name: "user_data.json" });
  await archive.finalize();
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const user = await getMe(id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
  return;
}

export async function listUserContacts(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const contacts = await listContacts(userId);
  res.json(contacts);
  return;
}

export async function requestContactVerificationHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsedParams = contactIdSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: parsedParams.error.flatten() });
    return;
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { contactId: parsedParams.data.contactId },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const result = await requestContactVerification(userId, parsedParams.data.contactId);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 201, result);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(201).json(result);
    return;
  }

  const result = await requestContactVerification(userId, parsedParams.data.contactId);
  res.status(201).json(result);
  return;
}

export async function updateEmail(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      parsed.data,
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const profile = await updatePrimaryEmail(userId, parsed.data.email);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 200, profile);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.json(profile);
    return;
  }

  const profile = await updatePrimaryEmail(userId, parsed.data.email);
  res.json(profile);
  return;
}

export async function updatePhone(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = phoneSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      parsed.data,
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const profile = await updatePhoneNumber(
      userId,
      parsed.data.phone,
      parsed.data.isRecovery ?? true,
    );

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 200, profile);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.json(profile);
    return;
  }

  const profile = await updatePhoneNumber(
    userId,
    parsed.data.phone,
    parsed.data.isRecovery ?? true,
  );
  res.json(profile);
  return;
}

export async function verifyContactHandler(req: Request, res: Response): Promise<void> {
  // SECURITY FIX (CWE-807): Validate authorization BEFORE checking idempotency cache
  // This prevents cached responses from bypassing current ownership/token validation
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsedParams = contactIdSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: parsedParams.error.flatten() });
    return;
  }
  const parsedBody = verifyContactBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.flatten() });
    return;
  }

  // Pre-validate: Check that the contact exists and belongs to the current user
  // This runs BEFORE any cached response is returned
  const existingContact = await getContactById(parsedParams.data.contactId);
  if (!existingContact || existingContact.user_id !== userId) {
    res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Contact not found or access denied",
      },
    });
    return;
  }

  // Idempotency support - safe because ownership is validated above
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { contactId: parsedParams.data.contactId, token: parsedBody.data.token },
    );

    if (resolution.type === "replay") {
      // Safe to replay: we've already validated ownership above
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const contact = await verifyContact(userId, parsedParams.data.contactId, parsedBody.data.token);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 200, contact);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.json(contact);
    return;
  }

  const contact = await verifyContact(userId, parsedParams.data.contactId, parsedBody.data.token);
  res.json(contact);
  return;
}

export async function removeContactHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = contactIdSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { contactId: parsed.data.contactId },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).send();
      return;
    }

    await removeContact(userId, parsed.data.contactId);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 204, null);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(204).send();
    return;
  }

  await removeContact(userId, parsed.data.contactId);
  res.status(204).send();
  return;
}

export async function adminChangeStatus(req: Request, res: Response): Promise<void> {
  const actorId = req.user?.sub ?? null;
  const { id } = req.params;
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const userId = actorId ?? "system";
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { targetUserId: id, ...parsed.data },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const profile = await changeStatus(actorId, id, parsed.data.status);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 200, profile);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.json(profile);
    return;
  }

  const profile = await changeStatus(actorId, id, parsed.data.status);
  res.json(profile);
  return;
}

export async function getMetrics(req: Request, res: Response): Promise<void> {
  const targetUserId = req.params.userId || req.user?.sub;
  const requestingUserId = req.user?.sub;
  const requestingUserRole = req.user?.role;

  if (!targetUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // IDOR Protection (AC-1.7): Only allow access to own metrics or admin access
  const isOwnMetrics = targetUserId === requestingUserId;
  const isAdmin = requestingUserRole === "admin";

  if (!isOwnMetrics && !isAdmin) {
    res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "You can only access your own metrics",
      },
    });
    return;
  }

  const metrics = await getUserMetrics(targetUserId);
  res.json(metrics);
  return;
}
