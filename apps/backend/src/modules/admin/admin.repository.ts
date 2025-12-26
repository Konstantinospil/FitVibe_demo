/**
 * Admin repository - Database operations for admin functionality
 */

import { db } from "../../db/index.js";
import type {
  FeedReport,
  UserSearchResult,
  ListReportsQuery,
  SearchUsersQuery,
} from "./admin.types.js";

/**
 * List feed reports with optional filtering
 */
export async function listFeedReports(query: ListReportsQuery): Promise<FeedReport[]> {
  const { status = "pending", limit = 50, offset = 0 } = query;

  let queryBuilder = db("feed_reports as fr")
    .select(
      "fr.id",
      "fr.reporter_id as reporterId",
      "reporter.username as reporterUsername",
      "fr.feed_item_id as feedItemId",
      "fr.comment_id as commentId",
      "fr.reason",
      "fr.details",
      "fr.status",
      "fr.created_at as createdAt",
      "fr.resolved_at as resolvedAt",
      "fr.resolved_by as resolvedBy",
    )
    .leftJoin("users as reporter", "fr.reporter_id", "reporter.id")
    .leftJoin("feed_items as fi", "fr.feed_item_id", "fi.id")
    .leftJoin("feed_comments as fc", "fr.comment_id", "fc.id")
    .leftJoin("users as content_author_feed", "fi.user_id", "content_author_feed.id")
    .leftJoin("users as content_author_comment", "fc.user_id", "content_author_comment.id")
    .select(
      db.raw(`
        COALESCE(
          SUBSTRING(fi.content, 1, 200),
          SUBSTRING(fc.content, 1, 200)
        ) as "contentPreview"
      `),
    )
    .select(
      db.raw(`
        COALESCE(
          content_author_feed.username,
          content_author_comment.username
        ) as "contentAuthor"
      `),
    )
    .orderBy("fr.created_at", "desc")
    .limit(limit)
    .offset(offset);

  if (status !== "all") {
    queryBuilder = queryBuilder.where("fr.status", status);
  }

  const rows = await queryBuilder;
  return rows as FeedReport[];
}

/**
 * Get a single feed report by ID
 */
export async function getFeedReportById(reportId: string): Promise<FeedReport | null> {
  const row = (await db<FeedReport>("feed_reports as fr")
    .select(
      "fr.id",
      "fr.reporter_id as reporterId",
      "reporter.username as reporterUsername",
      "fr.feed_item_id as feedItemId",
      "fr.comment_id as commentId",
      "fr.reason",
      "fr.details",
      "fr.status",
      "fr.created_at as createdAt",
      "fr.resolved_at as resolvedAt",
      "fr.resolved_by as resolvedBy",
    )
    .leftJoin("users as reporter", "fr.reporter_id", "reporter.id")
    .leftJoin("feed_items as fi", "fr.feed_item_id", "fi.id")
    .leftJoin("feed_comments as fc", "fr.comment_id", "fc.id")
    .leftJoin("users as content_author_feed", "fi.user_id", "content_author_feed.id")
    .leftJoin("users as content_author_comment", "fc.user_id", "content_author_comment.id")
    .select(
      db.raw(`
        COALESCE(
          SUBSTRING(fi.content, 1, 200),
          SUBSTRING(fc.content, 1, 200)
        ) as "contentPreview"
      `),
    )
    .select(
      db.raw(`
        COALESCE(
          content_author_feed.username,
          content_author_comment.username
        ) as "contentAuthor"
      `),
    )
    .where("fr.id", reportId)
    .first()) as FeedReport | undefined;

  return row ?? null;
}

/**
 * Update report status (dismiss or reviewed)
 */
export async function updateReportStatus(
  reportId: string,
  status: "dismissed" | "reviewed",
  adminId: string,
): Promise<void> {
  await db("feed_reports").where("id", reportId).update({
    status,
    resolved_at: db.fn.now(),
    resolved_by: adminId,
  });
}

/**
 * Hide feed item by setting its visibility to private
 */
export async function hideFeedItem(feedItemId: string): Promise<void> {
  await db("feed_items").where("id", feedItemId).update({
    visibility: "private",
  });
}

/**
 * Hide comment by marking it as deleted
 */
export async function hideComment(commentId: string): Promise<void> {
  await db("feed_comments").where("id", commentId).update({
    deleted_at: db.fn.now(),
  });
}

/**
 * Validates if a string is a valid UUID format
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Search users by email, username, or ID
 */
export async function searchUsers(query: SearchUsersQuery): Promise<UserSearchResult[]> {
  const { query: searchQuery, limit = 20, offset = 0, blacklisted } = query;

  let queryBuilder = db("users as u")
    .select(
      "u.id",
      "u.username",
      db.raw(`(
        SELECT value
        FROM user_contacts uc
        WHERE uc.user_id = u.id
        AND uc.type = 'email'
        AND uc.is_primary IS TRUE
        LIMIT 1
      ) as email`),
      "u.role_code as roleCode",
      "u.status",
      "u.created_at as createdAt",
      "u.deactivated_at as deactivatedAt",
    )
    .select(
      db.raw(`(
        SELECT MAX(auth_sess.created_at)
        FROM auth_sessions auth_sess
        WHERE auth_sess.user_id = u.id
      ) as "lastLoginAt"`),
    )
    .select(
      db.raw(`(
        SELECT COUNT(*)
        FROM sessions s
        WHERE s.owner_id = u.id
      ) as "sessionCount"`),
    )
    .select(
      db.raw(`(
        SELECT COUNT(*)
        FROM feed_reports fr
        WHERE fr.feed_item_id IN (
          SELECT id FROM feed_items WHERE owner_id = u.id
        )
        OR fr.comment_id IN (
          SELECT id FROM feed_comments WHERE user_id = u.id
        )
      ) as "reportCount"`),
    )
    .select(
      db.raw(`(
        SELECT file_url
        FROM media m
        WHERE m.owner_id = u.id
        AND m.target_type = 'user_avatar'
        AND m.target_id = u.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) as "avatarUrl"`),
    )
    .where(function () {
      this.whereRaw(
        `EXISTS (
          SELECT 1
          FROM user_contacts uc
          WHERE uc.user_id = u.id
          AND uc.type = 'email'
          AND uc.value ILIKE ?
        )`,
        [`%${searchQuery}%`],
      ).orWhere("u.username", "ilike", `%${searchQuery}%`);

      // Only check ID if the search query is a valid UUID
      if (isValidUUID(searchQuery)) {
        this.orWhere("u.id", "=", searchQuery);
      }
    })
    .whereNull("u.deleted_at");

  // Filter by blacklisted status
  if (blacklisted === true) {
    queryBuilder = queryBuilder.whereNotNull("u.deactivated_at");
  } else if (blacklisted === false) {
    queryBuilder = queryBuilder.whereNull("u.deactivated_at");
  }

  queryBuilder = queryBuilder.orderBy("u.created_at", "desc").limit(limit).offset(offset);

  const rows = await queryBuilder;
  return rows as UserSearchResult[];
}

/**
 * Update user status (active, suspended, banned)
 */
export async function updateUserStatus(
  userId: string,
  status: "active" | "suspended" | "banned",
): Promise<void> {
  await db("users").where("id", userId).update({ status });
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, roleCode: string): Promise<void> {
  await db("users").where("id", userId).update({ role_code: roleCode });
}

/**
 * Soft delete a user account
 */
export async function softDeleteUser(userId: string): Promise<void> {
  await db("users").where("id", userId).update({
    deleted_at: db.fn.now(),
    status: "banned",
  });
}

/**
 * Get user by ID for admin purposes
 */
export async function getUserForAdmin(userId: string): Promise<UserSearchResult | null> {
  const row = (await db<UserSearchResult>("users as u")
    .select(
      "u.id",
      "u.username",
      db.raw(`(
        SELECT value
        FROM user_contacts uc
        WHERE uc.user_id = u.id
        AND uc.type = 'email'
        AND uc.is_primary IS TRUE
        LIMIT 1
      ) as email`),
      "u.role_code as roleCode",
      "u.status",
      "u.created_at as createdAt",
      "u.deactivated_at as deactivatedAt",
    )
    .select(
      db.raw(`(
        SELECT MAX(auth_sess.created_at)
        FROM auth_sessions auth_sess
        WHERE auth_sess.user_id = u.id
      ) as "lastLoginAt"`),
    )
    .select(
      db.raw(`(
        SELECT COUNT(*)
        FROM sessions s
        WHERE s.owner_id = u.id
      ) as "sessionCount"`),
    )
    .select(
      db.raw(`(
        SELECT COUNT(*)
        FROM feed_reports fr
        WHERE fr.feed_item_id IN (
          SELECT id FROM feed_items WHERE owner_id = u.id
        )
        OR fr.comment_id IN (
          SELECT id FROM feed_comments WHERE user_id = u.id
        )
      ) as "reportCount"`),
    )
    .where("u.id", userId)
    .whereNull("u.deleted_at")
    .first()) as UserSearchResult | undefined;

  return row ?? null;
}

/**
 * Check if an email is currently blacklisted
 */
export async function isEmailBlacklisted(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase();
  const now = new Date();

  const row = await db<{ id: string }>("blacklist")
    .where("email", normalizedEmail)
    .where(function () {
      this.whereNull("active_to").orWhere("active_to", ">", now);
    })
    .where("active_from", "<=", now)
    .first();

  return !!row;
}

/**
 * Add email to blacklist
 */
export async function addToBlacklist(
  email: string,
  adminId: string,
  activeTo?: Date | null,
): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  const now = new Date();

  await db("blacklist").insert({
    email: normalizedEmail,
    active_from: now,
    active_to: activeTo || null,
    created_by: adminId,
    created_at: now,
    updated_at: now,
  });
}

/**
 * Remove email from blacklist (set active_to to now)
 */
export async function removeFromBlacklist(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  const now = new Date();

  await db("blacklist")
    .where("email", normalizedEmail)
    .where(function () {
      this.whereNull("active_to").orWhere("active_to", ">", now);
    })
    .update({
      active_to: now,
      updated_at: now,
    });
}

/**
 * Update user deactivated_at timestamp
 */
export async function updateUserDeactivatedAt(
  userId: string,
  deactivatedAt: Date | null,
): Promise<void> {
  await db("users").where("id", userId).update({
    deactivated_at: deactivatedAt,
    updated_at: db.fn.now(),
  });
}
