/**
 * Logs module types
 */

export type AuditLogSeverity = "info" | "warning" | "error" | "critical";

export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  actorUsername: string | null;
  actorDisplayName: string | null;
  entityType: string;
  action: string;
  entityId: string | null;
  outcome: string;
  requestId: string | null;
  metadata: Record<string, unknown> | null;
  severity: AuditLogSeverity;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  createdAt: string;
}

export interface ListAuditLogsQuery {
  action?: string;
  entityType?: string;
  actorUserId?: string;
  outcome?: string;
  severity?: AuditLogSeverity;
  resolved?: boolean;
  createdFrom?: string;
  createdTo?: string;
  limit?: number;
  offset?: number;
}
