/**
 * Admin controller - HTTP request handlers for admin endpoints
 */

import type { Request, Response } from "express";
import { HttpError } from "../../utils/http.js";
import * as service from "./admin.service.js";
import type { ListReportsQuery, SearchUsersQuery } from "./admin.types.js";

/**
 * List feed reports
 * GET /api/v1/admin/reports
 */
export async function listReportsHandler(req: Request, res: Response): Promise<void> {
  const status = req.query.status as "pending" | "reviewed" | "dismissed" | "all" | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

  const query: ListReportsQuery = {
    status: status ?? "pending",
    limit: Math.min(limit, 100), // Cap at 100
    offset,
  };

  const reports = await service.listReports(query);
  res.json({ reports });
}

/**
 * Moderate a report
 * POST /api/v1/admin/reports/:reportId/moderate
 */
export async function moderateReportHandler(req: Request, res: Response): Promise<void> {
  const { reportId } = req.params;
  const action = (req.body as { action?: string }).action;

  if (!req.user?.sub) {
    throw new HttpError(401, "UNAUTHENTICATED", "User not authenticated");
  }

  if (!action || !["dismiss", "hide", "ban"].includes(action)) {
    throw new HttpError(
      400,
      "INVALID_ACTION",
      "Invalid action. Must be 'dismiss', 'hide', or 'ban'",
    );
  }

  await service.moderateReport({
    reportId,
    action: action as "dismiss" | "hide" | "ban",
    adminId: req.user.sub,
  });

  // Handle past tense for actions
  const actionPastTense: Record<string, string> = {
    dismiss: "dismissed",
    hide: "hidden",
    ban: "banned",
  };
  const pastTense = actionPastTense[action] || `${action}ed`;

  res.json({ success: true, message: `Report ${pastTense} successfully` });
}

/**
 * Search users
 * GET /api/v1/admin/users/search
 */
export async function searchUsersHandler(req: Request, res: Response): Promise<void> {
  const query = req.query.q as string;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
  const blacklisted = req.query.blacklisted ? req.query.blacklisted === "true" : undefined;

  if (!query) {
    throw new HttpError(400, "MISSING_QUERY", "Query parameter 'q' is required");
  }

  const searchQuery: SearchUsersQuery = {
    query,
    limit: Math.min(limit, 50), // Cap at 50
    offset,
    blacklisted,
  };

  const users = await service.searchUsersService(searchQuery);
  res.json({ users });
}

/**
 * Perform user action (blacklist, unblacklist, delete)
 * POST /api/v1/admin/users/:userId/action
 */
export async function userActionHandler(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  const body = req.body as { action?: string; reason?: string };
  const action = body.action;
  const reason = body.reason;

  if (!req.user?.sub) {
    throw new HttpError(401, "UNAUTHENTICATED", "User not authenticated");
  }

  if (!action || !["blacklist", "unblacklist", "delete"].includes(action)) {
    throw new HttpError(
      400,
      "INVALID_ACTION",
      "Invalid action. Must be 'blacklist', 'unblacklist', or 'delete'",
    );
  }

  await service.performUserAction({
    userId,
    action: action as "blacklist" | "unblacklist" | "delete",
    adminId: req.user.sub,
    reason,
  });

  // Handle past tense for actions
  const actionPastTense: Record<string, string> = {
    blacklist: "blacklisted",
    unblacklist: "unblacklisted",
    delete: "deleted",
  };
  const pastTense = actionPastTense[action] || `${action}ed`;

  res.json({ success: true, message: `User ${pastTense} successfully` });
}

/**
 * Change user role
 * POST /api/v1/admin/users/:userId/role
 */
export async function changeUserRoleHandler(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  const body = req.body as { role?: string; reason?: string };
  const role = body.role;
  const reason = body.reason;

  if (!req.user?.sub) {
    throw new HttpError(401, "UNAUTHENTICATED", "User not authenticated");
  }

  if (!role) {
    throw new HttpError(400, "MISSING_ROLE", "Role is required");
  }

  await service.changeUserRole(userId, role, req.user.sub, reason);

  res.json({ success: true, message: `User role changed to ${role} successfully` });
}

/**
 * Send verification email to user
 * POST /api/v1/admin/users/:userId/send-verification-email
 */
export async function sendVerificationEmailHandler(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;

  if (!req.user?.sub) {
    throw new HttpError(401, "UNAUTHENTICATED", "User not authenticated");
  }

  await service.sendVerificationEmail(userId, req.user.sub);

  res.json({ success: true, message: "Verification email sent successfully" });
}

/**
 * Send password reset email to user
 * POST /api/v1/admin/users/:userId/send-password-reset
 */
export async function sendPasswordResetHandler(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;

  if (!req.user?.sub) {
    throw new HttpError(401, "UNAUTHENTICATED", "User not authenticated");
  }

  await service.sendPasswordResetEmail(userId, req.user.sub);

  res.json({ success: true, message: "Password reset email sent successfully" });
}

/**
 * Delete user avatar
 * DELETE /api/v1/admin/users/:userId/avatar
 */
export async function deleteUserAvatarHandler(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  const body = req.body as { reason?: string };
  const reason = body.reason;

  if (!req.user?.sub) {
    throw new HttpError(401, "UNAUTHENTICATED", "User not authenticated");
  }

  await service.deleteUserAvatar(userId, req.user.sub, reason);

  res.json({ success: true, message: "User avatar deleted successfully" });
}
