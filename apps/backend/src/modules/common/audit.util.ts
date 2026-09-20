import crypto from "crypto";
import { db } from "../../db/connection.js";
import { logger } from "../../config/logger.js";

export interface AuditLogPayload {
  actorUserId?: string | null;
  entityType: string;
  action: string;
  entityId?: string | null;
  outcome?: string;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ACTOR_FK_RETRIES = 10;
const RETRY_BASE_DELAY_MS = 100;

function normalizeActorUserId(actorUserId: string | null): string | null {
  return actorUserId && UUID_PATTERN.test(actorUserId) ? actorUserId : null;
}

function isActorForeignKeyVisibilityError(error: unknown): boolean {
  const candidate = error as { code?: string; detail?: string; message?: string };
  return (
    candidate.code === "23503" &&
    candidate.detail?.includes('is not present in table "users"') === true &&
    (candidate.message?.includes("audit_log") === true ||
      candidate.detail?.includes("audit_log_actor_user_id_foreign") === true)
  );
}

export async function insertAudit({
  actorUserId = null,
  entityType,
  action,
  entityId = null,
  outcome = "success",
  requestId = null,
  metadata = {},
}: AuditLogPayload): Promise<void> {
  const normalizedActorUserId = normalizeActorUserId(actorUserId);
  const row = {
    id: crypto.randomUUID(),
    actor_user_id: normalizedActorUserId,
    entity_type: entityType,
    action,
    entity_id: entityId,
    outcome,
    request_id: requestId,
    metadata,
    created_at: new Date().toISOString(),
  };

  for (let attempt = 0; attempt < MAX_ACTOR_FK_RETRIES; attempt += 1) {
    try {
      await db("audit_log").insert(row);
      return;
    } catch (error) {
      const canRetry =
        normalizedActorUserId !== null &&
        isActorForeignKeyVisibilityError(error) &&
        attempt < MAX_ACTOR_FK_RETRIES - 1;

      if (!canRetry) {
        logger.error({ err: error, action }, "[AUDIT] insert failed");
        return;
      }

      const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export async function logAudit(payload: {
  action: string;
  entityType: string;
  entityId?: string | null;
  userId?: string | null;
  outcome?: string;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await insertAudit({
    actorUserId: payload.userId ?? null,
    entityType: payload.entityType,
    action: payload.action,
    entityId: payload.entityId ?? null,
    outcome: payload.outcome ?? "success",
    requestId: payload.requestId ?? null,
    metadata: payload.metadata ?? {},
  });
}
