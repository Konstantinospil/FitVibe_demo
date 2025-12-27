/**
 * Admin service - Business logic for admin operations
 */

import { HttpError } from "../../utils/http.js";
import { logAudit } from "../common/audit.util.js";
import * as repo from "./admin.repository.js";
import * as authService from "../auth/auth.service.js";
import { deleteUserAvatarMetadata } from "../users/users.avatar.repository.js";
import { deleteStorageObject } from "../../services/mediaStorage.service.js";
import { mailerService } from "../../services/mailer.service.js";
import {
  getEmailTranslations,
  generateResendVerificationEmailHtml,
  generateResendVerificationEmailText,
} from "../../services/i18n.service.js";
import {
  findUserById,
  createAuthToken,
  markAuthTokensConsumed,
  purgeAuthTokensOlderThan,
  countAuthTokensSince,
} from "../auth/auth.repository.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import type {
  FeedReport,
  UserSearchResult,
  ModerateReportInput,
  UserActionInput,
  ListReportsQuery,
  SearchUsersQuery,
  ActionUiMapping,
} from "./admin.types.js";

/**
 * List feed reports with optional filtering
 */
export async function listReports(query: ListReportsQuery): Promise<FeedReport[]> {
  return await repo.listFeedReports(query);
}

/**
 * Moderate a feed report
 */
export async function moderateReport(input: ModerateReportInput): Promise<void> {
  const { reportId, action, adminId } = input;

  // Get the report
  const report = await repo.getFeedReportById(reportId);
  if (!report) {
    throw new HttpError(404, "REPORT_NOT_FOUND", "Report not found");
  }

  if (report.status !== "pending") {
    throw new HttpError(400, "REPORT_ALREADY_RESOLVED", "Report has already been resolved");
  }

  // Perform the moderation action
  switch (action) {
    case "dismiss":
      await repo.updateReportStatus(reportId, "dismissed", adminId);
      await logAudit({
        action: "report_dismissed",
        entityType: "feed_report",
        entityId: reportId,
        userId: adminId,
        metadata: { reportId, reason: report.reason },
      });
      break;

    case "hide":
      // Hide the content
      if (report.feedItemId) {
        await repo.hideFeedItem(report.feedItemId);
      } else if (report.commentId) {
        await repo.hideComment(report.commentId);
      }
      await repo.updateReportStatus(reportId, "reviewed", adminId);
      await logAudit({
        action: "content_hidden",
        entityType: report.feedItemId ? "feed_item" : "feed_comment",
        entityId: report.feedItemId ?? report.commentId ?? reportId,
        userId: adminId,
        metadata: { reportId, action: "hide" },
      });
      break;

    case "ban":
      // Ban the content author
      if (report.feedItemId) {
        const feedItem = await repo.getFeedReportById(reportId);
        if (feedItem?.contentAuthor) {
          // Get user ID from username
          const users = await repo.searchUsers({ query: feedItem.contentAuthor, limit: 1 });
          if (users.length > 0) {
            await repo.updateUserStatus(users[0].id, "banned");
          }
        }
        await repo.hideFeedItem(report.feedItemId);
      } else if (report.commentId) {
        const feedComment = await repo.getFeedReportById(reportId);
        if (feedComment?.contentAuthor) {
          // Get user ID from username
          const users = await repo.searchUsers({ query: feedComment.contentAuthor, limit: 1 });
          if (users.length > 0) {
            await repo.updateUserStatus(users[0].id, "banned");
          }
        }
        await repo.hideComment(report.commentId);
      }
      await repo.updateReportStatus(reportId, "reviewed", adminId);
      await logAudit({
        action: "user_banned",
        entityType: "user",
        entityId: report.contentAuthor ?? "unknown",
        userId: adminId,
        metadata: { reportId, action: "ban", reason: report.reason },
      });
      break;

    default:
      throw new HttpError(400, "INVALID_ACTION", "Invalid moderation action");
  }
}

/**
 * Search users
 */
export async function searchUsersService(query: SearchUsersQuery): Promise<UserSearchResult[]> {
  if (!query.query || query.query.trim().length === 0) {
    throw new HttpError(400, "INVALID_QUERY", "Search query is required");
  }

  return await repo.searchUsers(query);
}

export async function listActionUiMappings(): Promise<ActionUiMapping[]> {
  return await repo.listActionUiMappings();
}

export async function upsertActionUiMapping(
  action: string,
  uiName: string,
): Promise<ActionUiMapping> {
  if (!action.trim()) {
    throw new HttpError(400, "INVALID_ACTION", "Action is required");
  }
  if (!uiName.trim()) {
    throw new HttpError(400, "INVALID_UI_NAME", "UI name is required");
  }
  return await repo.upsertActionUiMapping(action.trim(), uiName.trim());
}

/**
 * Perform user management action
 */
export async function performUserAction(input: UserActionInput): Promise<void> {
  const { userId, action, adminId, reason } = input;

  // Check if user exists
  const user = await repo.getUserForAdmin(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  // Prevent admins from acting on themselves
  if (userId === adminId) {
    throw new HttpError(
      400,
      "CANNOT_MODIFY_SELF",
      "Cannot perform this action on your own account",
    );
  }

  if (!user.email) {
    throw new HttpError(400, "NO_EMAIL", "User does not have an email address");
  }

  // Perform the action
  switch (action) {
    case "blacklist":
      // Add email to blacklist
      await repo.addToBlacklist(user.email, adminId);
      // Update user status and deactivated_at
      await repo.updateUserStatus(userId, "banned");
      await repo.updateUserDeactivatedAt(userId, new Date());
      await logAudit({
        action: "user_blacklisted",
        entityType: "user",
        entityId: userId,
        userId: adminId,
        metadata: { username: user.username, email: user.email, reason },
      });
      break;

    case "unblacklist":
      // Remove email from blacklist
      await repo.removeFromBlacklist(user.email);
      // Update user status and clear deactivated_at
      await repo.updateUserStatus(userId, "active");
      await repo.updateUserDeactivatedAt(userId, null);
      await logAudit({
        action: "user_unblacklisted",
        entityType: "user",
        entityId: userId,
        userId: adminId,
        metadata: { username: user.username, email: user.email, reason },
      });
      break;

    case "delete":
      await repo.softDeleteUser(userId);
      await logAudit({
        action: "user_deleted",
        entityType: "user",
        entityId: userId,
        userId: adminId,
        metadata: { username: user.username, reason },
      });
      break;

    default:
      throw new HttpError(400, "INVALID_ACTION", "Invalid user action");
  }
}

/**
 * Change user role
 */
export async function changeUserRole(
  userId: string,
  roleCode: string,
  adminId: string,
  reason?: string,
): Promise<void> {
  // Check if user exists
  const user = await repo.getUserForAdmin(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  // Prevent admins from changing their own role
  if (userId === adminId) {
    throw new HttpError(400, "CANNOT_MODIFY_SELF", "Cannot change your own role");
  }

  // Validate role exists (basic check - roles should be: admin, coach, athlete, support)
  const validRoles = ["admin", "coach", "athlete", "support"];
  if (!validRoles.includes(roleCode)) {
    throw new HttpError(
      400,
      "INVALID_ROLE",
      `Invalid role. Must be one of: ${validRoles.join(", ")}`,
    );
  }

  // Update role
  await repo.updateUserRole(userId, roleCode);
  await logAudit({
    action: "user_role_changed",
    entityType: "user",
    entityId: userId,
    userId: adminId,
    metadata: { username: user.username, oldRole: user.roleCode, newRole: roleCode, reason },
  });
}

/**
 * Send verification email to user (admin action)
 * This bypasses the status check and sends verification email regardless of user status
 */
export async function sendVerificationEmail(userId: string, adminId: string): Promise<void> {
  const user = await repo.getUserForAdmin(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  if (!user.email) {
    throw new HttpError(400, "NO_EMAIL", "User does not have an email address");
  }

  // Get full user record to access locale
  const fullUser = await findUserById(userId);
  if (!fullUser) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  // Generate verification token (bypassing status check)
  const EMAIL_VERIFICATION_TTL = env.EMAIL_VERIFICATION_TTL_SEC;
  const TOKEN_TYPES = {
    EMAIL_VERIFICATION: "email_verification",
  } as const;
  const TOKEN_RETENTION_DAYS = 7;
  const RESEND_WINDOW_MS = 60 * 60 * 1000;
  const EMAIL_VERIFICATION_RESEND_LIMIT = 3;

  // Generate token
  const now = Date.now();
  const retentionCutoff = new Date(now - TOKEN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await purgeAuthTokensOlderThan(TOKEN_TYPES.EMAIL_VERIFICATION, retentionCutoff);

  // Check rate limiting (but don't enforce strictly for admin actions)
  const windowStart = new Date(now - RESEND_WINDOW_MS);
  const recentAttempts = await countAuthTokensSince(
    userId,
    TOKEN_TYPES.EMAIL_VERIFICATION,
    windowStart,
  );
  if (recentAttempts >= EMAIL_VERIFICATION_RESEND_LIMIT) {
    logger.warn(
      { userId, recentAttempts },
      "[admin] Rate limit reached for verification email, but proceeding as admin action",
    );
  }

  await markAuthTokensConsumed(userId, TOKEN_TYPES.EMAIL_VERIFICATION);

  // Generate token
  const raw = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const issuedAtIso = new Date(now).toISOString();
  const expires_at = new Date(now + EMAIL_VERIFICATION_TTL * 1000).toISOString();

  await createAuthToken({
    id: uuidv4(),
    user_id: userId,
    token_type: TOKEN_TYPES.EMAIL_VERIFICATION,
    token_hash: hash,
    expires_at,
    created_at: issuedAtIso,
  });

  // Send verification email
  if (env.email.enabled) {
    try {
      const verificationUrl = `${env.frontendUrl}/verify?token=${raw}`;
      const expiresInMinutes = Math.floor(EMAIL_VERIFICATION_TTL / 60);
      const locale = fullUser.locale;
      const t = getEmailTranslations(locale);

      await mailerService.send({
        to: user.email,
        subject: t.resend.subject,
        html: generateResendVerificationEmailHtml(verificationUrl, expiresInMinutes, locale),
        text: generateResendVerificationEmailText(verificationUrl, expiresInMinutes, locale),
      });
    } catch (emailError) {
      logger.error(
        { err: emailError, userId, email: user.email },
        "[admin] Failed to send verification email",
      );
      throw new HttpError(500, "EMAIL_SEND_FAILED", "Failed to send verification email");
    }
  }

  await logAudit({
    action: "admin_sent_verification_email",
    entityType: "user",
    entityId: userId,
    userId: adminId,
    metadata: { username: user.username, email: user.email, userStatus: user.status },
  });
}

/**
 * Send password reset email to user (admin action)
 */
export async function sendPasswordResetEmail(userId: string, adminId: string): Promise<void> {
  const user = await repo.getUserForAdmin(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  if (!user.email) {
    throw new HttpError(400, "NO_EMAIL", "User does not have an email address");
  }

  if (user.status !== "active") {
    throw new HttpError(400, "USER_NOT_ACTIVE", "Password reset can only be sent to active users");
  }

  // Send password reset email
  await authService.requestPasswordReset(user.email);

  await logAudit({
    action: "admin_sent_password_reset",
    entityType: "user",
    entityId: userId,
    userId: adminId,
    metadata: { username: user.username, email: user.email },
  });
}

/**
 * Delete user avatar (admin action)
 */
export async function deleteUserAvatar(
  userId: string,
  adminId: string,
  reason?: string,
): Promise<void> {
  const user = await repo.getUserForAdmin(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  // Get and delete avatar metadata
  const metadata = await deleteUserAvatarMetadata(userId);
  if (metadata?.storage_key) {
    // Delete the actual file from storage
    await deleteStorageObject(metadata.storage_key).catch(() => undefined);
  }

  await logAudit({
    action: "admin_deleted_avatar",
    entityType: "user",
    entityId: userId,
    userId: adminId,
    metadata: { username: user.username, reason },
  });
}

export async function deleteUserDisplayName(
  userId: string,
  adminId: string,
  reason?: string,
): Promise<void> {
  const user = await repo.getUserForAdmin(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  await repo.resetUserDisplayNameToUsername(userId);

  await logAudit({
    action: "admin_deleted_display_name",
    entityType: "user",
    entityId: userId,
    userId: adminId,
    metadata: { username: user.username, previousDisplayName: user.displayName, reason },
  });
}
