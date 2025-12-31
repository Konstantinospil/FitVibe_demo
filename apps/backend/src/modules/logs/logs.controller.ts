/**
 * Logs controller - HTTP request handlers for audit log endpoints
 */

import type { Request, Response } from "express";
import * as service from "./logs.service.js";
import type { AuditLogSeverity, ListAuditLogsQuery } from "./logs.types.js";
import { HttpError } from "../../utils/http.js";

const allowedSeverities: AuditLogSeverity[] = ["info", "warning", "error", "critical"];

/**
 * List audit logs
 * GET /api/v1/logs
 */
export async function listLogsHandler(req: Request, res: Response): Promise<void> {
  const actionParam = req.query.action as string | string[] | undefined;
  const action =
    typeof actionParam === "string"
      ? actionParam.includes(",")
        ? actionParam
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : actionParam.trim() || undefined
      : Array.isArray(actionParam)
        ? actionParam.map((value) => value.trim()).filter(Boolean)
        : undefined;
  const entityType = req.query.entityType as string | undefined;
  const actorUserId = req.query.actorUserId as string | undefined;
  const outcome = req.query.outcome as string | undefined;
  const requestId = req.query.requestId as string | undefined;
  const severity = req.query.severity as AuditLogSeverity | undefined;
  const resolved =
    req.query.resolved === "true" ? true : req.query.resolved === "false" ? false : undefined;
  const createdFrom = req.query.createdFrom as string | undefined;
  const createdTo = req.query.createdTo as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

  const query: ListAuditLogsQuery = {
    action,
    entityType,
    actorUserId,
    outcome,
    requestId,
    severity,
    resolved,
    createdFrom,
    createdTo,
    limit,
    offset,
  };

  if (severity && !allowedSeverities.includes(severity)) {
    throw new HttpError(400, "BAD_REQUEST", "Invalid severity filter");
  }

  const logs = await service.listLogs(query);
  res.json({ logs });
}

/**
 * Update audit log severity or resolution status
 * PATCH /api/v1/logs/:id
 */
export async function updateLogHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const body = req.body as { severity?: AuditLogSeverity; resolved?: boolean } | undefined;
  const severity = body?.severity;
  const resolved = body?.resolved;

  if (!severity && typeof resolved !== "boolean") {
    throw new HttpError(400, "BAD_REQUEST", "No updates provided");
  }

  if (severity && !allowedSeverities.includes(severity)) {
    throw new HttpError(400, "BAD_REQUEST", "Invalid severity");
  }

  const actorUserId = req.user?.sub ?? null;
  const resolvedAt =
    typeof resolved === "boolean" ? (resolved ? new Date().toISOString() : null) : undefined;
  const resolvedByUserId =
    typeof resolved === "boolean" ? (resolved ? actorUserId : null) : undefined;
  const updated = await service.updateLog(id, {
    severity,
    resolvedAt,
    resolvedByUserId,
  });

  if (!updated) {
    throw new HttpError(404, "NOT_FOUND", "Audit log not found");
  }

  res.json({ log: updated });
}

/**
 * Bulk update audit log resolution status
 * PATCH /api/v1/logs/bulk
 */
export async function bulkUpdateLogsHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as { ids?: string[]; resolved?: boolean } | undefined;
  const ids = body?.ids;
  const resolved = body?.resolved;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new HttpError(400, "BAD_REQUEST", "No audit log ids provided");
  }

  if (ids.some((id) => typeof id !== "string" || id.trim().length === 0)) {
    throw new HttpError(400, "BAD_REQUEST", "Invalid audit log ids");
  }

  if (typeof resolved !== "boolean") {
    throw new HttpError(400, "BAD_REQUEST", "Invalid resolved status");
  }

  const actorUserId = req.user?.sub ?? null;
  const resolvedAt = resolved ? new Date().toISOString() : null;
  const resolvedByUserId = resolved ? actorUserId : null;
  const updatedCount = await service.updateLogsResolved(ids, {
    resolvedAt,
    resolvedByUserId,
  });

  res.json({ updated: updatedCount });
}

/**
 * Get recent admin activity
 * GET /api/v1/logs/recent-activity
 */
export async function recentActivityHandler(req: Request, res: Response): Promise<void> {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const activity = await service.getRecentActivity(limit);
  res.json({ activity });
}
