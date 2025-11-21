/**
 * Logs service - Business logic for audit log operations
 */

import * as repo from "./logs.repository.js";
import type { AuditLogEntry, ListAuditLogsQuery } from "./logs.types.js";

/**
 * List audit logs with optional filtering
 */
export async function listLogs(query: ListAuditLogsQuery): Promise<AuditLogEntry[]> {
  return await repo.listAuditLogs(query);
}

/**
 * Get recent admin activity
 */
export async function getRecentActivity(limit?: number): Promise<AuditLogEntry[]> {
  return await repo.getRecentAdminActivity(limit);
}
