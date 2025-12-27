/**
 * Logs routes - Audit log querying and streaming endpoints
 *
 * Provides endpoints for querying audit logs with filtering capabilities.
 * All endpoints require admin role for security and privacy compliance.
 */

import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { requireAccessToken } from "../auth/auth.middleware.js";
import { requireRole } from "../common/rbac.middleware.js";
import { rateLimit } from "../common/rateLimiter.js";
import { listLogsHandler, recentActivityHandler, updateLogHandler } from "./logs.controller.js";

export const logsRouter = Router();

// All logs routes require authentication and admin role
logsRouter.use(requireAccessToken);
logsRouter.use(requireRole("admin"));

/**
 * GET /api/v1/logs
 * List audit logs with optional filtering
 * Query params: action, entityType, actorUserId, outcome, severity, resolved, createdFrom, createdTo, limit, offset
 */
logsRouter.get("/", rateLimit("logs_list", 60, 60), asyncHandler(listLogsHandler));

/**
 * GET /api/v1/logs/recent-activity
 * Get recent admin activity for system dashboard
 * Query params: limit (default: 20)
 */
logsRouter.get(
  "/recent-activity",
  rateLimit("logs_recent_activity", 60, 60),
  asyncHandler(recentActivityHandler),
);

/**
 * PATCH /api/v1/logs/:id
 * Update audit log severity or resolution status
 */
logsRouter.patch("/:id", rateLimit("logs_update", 30, 60), asyncHandler(updateLogHandler));

export default logsRouter;
