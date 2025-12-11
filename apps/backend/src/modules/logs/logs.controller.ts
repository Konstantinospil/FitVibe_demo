/**
 * Logs controller - HTTP request handlers for audit log endpoints
 */

import type { Request, Response } from "express";
import * as service from "./logs.service.js";
import type { ListAuditLogsQuery } from "./logs.types.js";

/**
 * List audit logs
 * GET /api/v1/logs
 */
export async function listLogsHandler(req: Request, res: Response): Promise<void> {
  const action = req.query.action as string | undefined;
  const entityType = req.query.entityType as string | undefined;
  const actorUserId = req.query.actorUserId as string | undefined;
  const outcome = req.query.outcome as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

  const query: ListAuditLogsQuery = {
    action,
    entityType,
    actorUserId,
    outcome,
    limit,
    offset,
  };

  const logs = await service.listLogs(query);
  res.json({ logs });
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
