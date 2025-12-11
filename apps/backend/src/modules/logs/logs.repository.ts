/**
 * Logs repository - Database operations for audit logs
 */

import { db } from "../../db/index.js";
import type { AuditLogEntry, ListAuditLogsQuery } from "./logs.types.js";

/**
 * List audit log entries with optional filtering
 */
export async function listAuditLogs(query: ListAuditLogsQuery): Promise<AuditLogEntry[]> {
  const { action, entityType, actorUserId, outcome, limit = 100, offset = 0 } = query;

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
      "al.created_at as createdAt",
    )
    .leftJoin("users as u", "al.actor_user_id", "u.id")
    .select("u.username as actorUsername")
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
      "al.created_at as createdAt",
    )
    .leftJoin("users as u", "al.actor_user_id", "u.id")
    .select("u.username as actorUsername")
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
