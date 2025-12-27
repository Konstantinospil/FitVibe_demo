/**
 * Logs repository - Database operations for audit logs
 */

import { db } from "../../db/index.js";
import type { AuditLogEntry, ListAuditLogsQuery } from "./logs.types.js";

/**
 * List audit log entries with optional filtering
 */
export async function listAuditLogs(query: ListAuditLogsQuery): Promise<AuditLogEntry[]> {
  const {
    action,
    entityType,
    actorUserId,
    outcome,
    severity,
    resolved,
    createdFrom,
    createdTo,
    limit = 100,
    offset = 0,
  } = query;

  let queryBuilder = db("audit_log as al")
    .select(
      "al.id",
      "al.actor_user_id as actorUserId",
      "al.entity_type as entityType",
      "al.action",
      "al.entity_id as entityId",
      "al.outcome",
      "al.request_id as requestId",
      "al.metadata",
      "al.severity",
      "al.resolved_at as resolvedAt",
      "al.resolved_by_user_id as resolvedByUserId",
      "al.created_at as createdAt",
    )
    .leftJoin("users as u", "al.actor_user_id", "u.id")
    .select("u.username as actorUsername")
    .select("u.display_name as actorDisplayName")
    .orderBy("al.created_at", "desc")
    .limit(Math.min(limit, 500)) // Cap at 500
    .offset(offset);

  if (action) {
    queryBuilder = queryBuilder.where("al.action", action);
  }

  if (entityType) {
    queryBuilder = queryBuilder.where("al.entity_type", entityType);
  }

  if (actorUserId) {
    queryBuilder = queryBuilder.where("al.actor_user_id", actorUserId);
  }

  if (outcome) {
    queryBuilder = queryBuilder.where("al.outcome", outcome);
  }

  if (severity) {
    queryBuilder = queryBuilder.where("al.severity", severity);
  }

  if (typeof resolved === "boolean") {
    queryBuilder = resolved
      ? queryBuilder.whereNotNull("al.resolved_at")
      : queryBuilder.whereNull("al.resolved_at");
  }

  if (createdFrom) {
    queryBuilder = queryBuilder.where("al.created_at", ">=", createdFrom);
  }

  if (createdTo) {
    queryBuilder = queryBuilder.where("al.created_at", "<=", createdTo);
  }

  const rows = await queryBuilder;
  return rows as AuditLogEntry[];
}

/**
 * Get recent admin activity for system dashboard
 */
export async function getRecentAdminActivity(limit = 20): Promise<AuditLogEntry[]> {
  const rows = await db("audit_log as al")
    .select(
      "al.id",
      "al.actor_user_id as actorUserId",
      "al.entity_type as entityType",
      "al.action",
      "al.entity_id as entityId",
      "al.outcome",
      "al.request_id as requestId",
      "al.metadata",
      "al.severity",
      "al.resolved_at as resolvedAt",
      "al.resolved_by_user_id as resolvedByUserId",
      "al.created_at as createdAt",
    )
    .leftJoin("users as u", "al.actor_user_id", "u.id")
    .select("u.username as actorUsername")
    .select("u.display_name as actorDisplayName")
    .whereIn("al.action", [
      "user_suspended",
      "user_banned",
      "user_activated",
      "user_deleted",
      "report_dismissed",
      "content_hidden",
      "system_maintenance_enabled",
      "system_maintenance_disabled",
    ])
    .orderBy("al.created_at", "desc")
    .limit(limit);

  return rows as AuditLogEntry[];
}

export async function updateAuditLog(
  id: string,
  updates: {
    severity?: string;
    resolvedAt?: string | null;
    resolvedByUserId?: string | null;
  },
): Promise<AuditLogEntry | null> {
  const updatePayload: Record<string, unknown> = {};
  if (updates.severity) {
    updatePayload.severity = updates.severity;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "resolvedAt")) {
    updatePayload.resolved_at = updates.resolvedAt;
    updatePayload.resolved_by_user_id = updates.resolvedByUserId ?? null;
  }

  if (Object.keys(updatePayload).length === 0) {
    return null;
  }

  const rows = await db("audit_log")
    .where("id", id)
    .update(updatePayload)
    .returning([
      "id",
      "actor_user_id as actorUserId",
      "entity_type as entityType",
      "action",
      "entity_id as entityId",
      "outcome",
      "request_id as requestId",
      "metadata",
      "severity",
      "resolved_at as resolvedAt",
      "resolved_by_user_id as resolvedByUserId",
      "created_at as createdAt",
    ]);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0] as AuditLogEntry;
  if (!row.actorUsername) {
    const withActor = (await db("audit_log as al")
      .select(
        "al.id",
        "al.actor_user_id as actorUserId",
        "al.entity_type as entityType",
        "al.action",
        "al.entity_id as entityId",
        "al.outcome",
        "al.request_id as requestId",
        "al.metadata",
        "al.severity",
        "al.resolved_at as resolvedAt",
        "al.resolved_by_user_id as resolvedByUserId",
        "al.created_at as createdAt",
      )
      .leftJoin("users as u", "al.actor_user_id", "u.id")
      .select("u.username as actorUsername")
      .select("u.display_name as actorDisplayName")
      .where("al.id", id)
      .first()) as AuditLogEntry | undefined;
    return withActor ?? null;
  }

  return row;
}
