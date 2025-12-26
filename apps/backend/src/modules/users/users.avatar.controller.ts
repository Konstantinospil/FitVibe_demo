import type { Request, Response } from "express";
import sharp from "sharp";
import { insertAudit } from "../common/audit.util.js";
import { logger } from "../../config/logger.js";
import {
  saveUserAvatarMetadata,
  getUserAvatarMetadata,
  deleteUserAvatarMetadata,
} from "./users.avatar.repository.js";
import {
  deleteStorageObject,
  readStorageObject,
  saveUserAvatarFile,
} from "../../services/mediaStorage.service.js";
import { scanBuffer } from "../../services/antivirus.service.js";
import { getIdempotencyKey, getRouteTemplate } from "../common/idempotency.helpers.js";
import { resolveIdempotency, persistIdempotencyResult } from "../common/idempotency.service.js";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/jpg"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per PRD

export async function uploadAvatarHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub as string;
  if (!userId) {
    res.status(401).json({ error: "UNAUTHENTICATED" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "UPLOAD_NO_FILE" });
    return;
  }
  if (!req.file.buffer) {
    res.status(400).json({ error: "UPLOAD_INVALID_FILE" });
    return;
  }
  if (!ALLOWED_MIME.has(req.file.mimetype)) {
    res.status(400).json({ error: "UPLOAD_UNSUPPORTED_TYPE" });
    return;
  }
  if (req.file.size > MAX_BYTES) {
    res.status(400).json({ error: "UPLOAD_TOO_LARGE" });
    return;
  }

  // Idempotency support (using file metadata, not full buffer)
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    // B-USR-5: Antivirus scanning before processing
    // Per ADR-004, scan all user uploads for malware
    const scanResult = await scanBuffer(req.file.buffer, req.file.originalname);
    if (scanResult.isInfected) {
      logger.warn(
        {
          userId,
          filename: req.file.originalname,
          viruses: scanResult.viruses,
          size: req.file.size,
        },
        "[avatar] Malware detected in upload",
      );

      // Audit the rejected upload
      await insertAudit({
        actorUserId: userId,
        entity: "user_media",
        action: "avatar_upload_rejected",
        entityId: userId,
        metadata: {
          reason: "malware_detected",
          viruses: scanResult.viruses,
          filename: req.file.originalname,
          size: req.file.size,
        },
      });

      const errorResponse = {
        error: {
          code: "E.UPLOAD.MALWARE_DETECTED",
          message: "UPLOAD_MALWARE_DETECTED",
          details: {
            reason: "malware_detected",
          },
        },
      };

      // Persist error result for idempotency
      if (resolution.recordId) {
        await persistIdempotencyResult(resolution.recordId, 422, errorResponse);
      }

      res.set("Idempotency-Key", idempotencyKey);
      res.status(422).json(errorResponse);
      return;
    }

    const processed = await sharp(req.file.buffer)
      .rotate()
      .resize(256, 256, { fit: "cover" })
      .png({ quality: 80 })
      .toBuffer();

    const fileMeta = await saveUserAvatarFile(userId, processed, "image/png");
    const publicUrl = `/users/avatar/${userId}`;
    const { previousKey, record } = await saveUserAvatarMetadata(userId, {
      storageKey: fileMeta.storageKey,
      fileUrl: publicUrl,
      mimeType: "image/png",
      bytes: fileMeta.bytes,
    });

    if (previousKey) {
      await deleteStorageObject(previousKey).catch(() => undefined);
    }

    await insertAudit({
      actorUserId: userId,
      entity: "user_media",
      action: "avatar_upload",
      entityId: record.id,
      metadata: { size: fileMeta.bytes, mime: "image/png" },
    });

    const response = {
      success: true,
      fileUrl: publicUrl,
      bytes: fileMeta.bytes,
      mimeType: "image/png",
      updatedAt: record.created_at,
      preview: `data:image/png;base64,${processed.toString("base64")}`,
    };

    // Persist success result
    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 201, response);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(201).json(response);
    return;
  }

  // No idempotency key - proceed normally
  // B-USR-5: Antivirus scanning before processing
  // Per ADR-004, scan all user uploads for malware
  const scanResult = await scanBuffer(req.file.buffer, req.file.originalname);
  if (scanResult.isInfected) {
    logger.warn(
      {
        userId,
        filename: req.file.originalname,
        viruses: scanResult.viruses,
        size: req.file.size,
      },
      "[avatar] Malware detected in upload",
    );

    // Audit the rejected upload
    await insertAudit({
      actorUserId: userId,
      entity: "user_media",
      action: "avatar_upload_rejected",
      entityId: userId,
      metadata: {
        reason: "malware_detected",
        viruses: scanResult.viruses,
        filename: req.file.originalname,
        size: req.file.size,
      },
    });

    res.status(422).json({
      error: {
        code: "E.UPLOAD.MALWARE_DETECTED",
        message: "UPLOAD_MALWARE_DETECTED",
        details: {
          reason: "malware_detected",
        },
      },
    });
    return;
  }

  const processed = await sharp(req.file.buffer)
    .rotate()
    .resize(256, 256, { fit: "cover" })
    .png({ quality: 80 })
    .toBuffer();

  const fileMeta = await saveUserAvatarFile(userId, processed, "image/png");
  const publicUrl = `/users/avatar/${userId}`;
  const { previousKey, record } = await saveUserAvatarMetadata(userId, {
    storageKey: fileMeta.storageKey,
    fileUrl: publicUrl,
    mimeType: "image/png",
    bytes: fileMeta.bytes,
  });

  if (previousKey) {
    await deleteStorageObject(previousKey).catch(() => undefined);
  }

  await insertAudit({
    actorUserId: userId,
    entity: "user_media",
    action: "avatar_upload",
    entityId: record.id,
    metadata: { size: fileMeta.bytes, mime: "image/png" },
  });

  res.status(201).json({
    success: true,
    fileUrl: publicUrl,
    bytes: fileMeta.bytes,
    mimeType: "image/png",
    updatedAt: record.created_at,
    preview: `data:image/png;base64,${processed.toString("base64")}`,
  });
}

export async function getAvatarHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const metadata = await getUserAvatarMetadata(id);
  if (!metadata) {
    res.status(404).send("UPLOAD_NOT_FOUND");
    return;
  }
  try {
    const buffer = await readStorageObject(metadata.storage_key);
    res.set("Content-Type", metadata.mime_type ?? "image/png");
    res.set("Cache-Control", "private, max-age=300");
    res.send(buffer);
    return;
  } catch (error) {
    logger.error({ err: error }, "[avatar] read failed");
    res.status(404).send("UPLOAD_NOT_FOUND");
    return;
  }
}

export async function deleteAvatarHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub as string;

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      {},
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).send();
      return;
    }

    const metadata = await deleteUserAvatarMetadata(userId);
    if (metadata?.storage_key) {
      await deleteStorageObject(metadata.storage_key).catch(() => undefined);
    }
    await insertAudit({
      actorUserId: userId,
      entity: "user_media",
      action: "avatar_delete",
      entityId: metadata?.id ?? userId,
    });

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 204, null);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(204).send();
    return;
  }

  const metadata = await deleteUserAvatarMetadata(userId);
  if (metadata?.storage_key) {
    await deleteStorageObject(metadata.storage_key).catch(() => undefined);
  }
  await insertAudit({
    actorUserId: userId,
    entity: "user_media",
    action: "avatar_delete",
    entityId: metadata?.id ?? userId,
  });
  res.status(204).send();
}
