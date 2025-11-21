import type { Request, Response } from "express";

import { verifyAccess } from "../../services/tokens.js";
import { HttpError } from "../../utils/http.js";
import type { FeedScope } from "./feed.repository.js";
import {
  blockUserByAlias,
  bookmarkSession,
  cloneSessionFromFeed,
  createComment,
  createShareLink,
  deleteComment,
  followUserByAlias,
  getFeed,
  getLeaderboard,
  getSharedSession,
  likeFeedItem,
  listBookmarks,
  listComments,
  listUserFollowers,
  listUserFollowing,
  removeBookmark,
  reportComment,
  reportFeedItem,
  revokeShareLink,
  unlikeFeedItem,
  unfollowUserByAlias,
  unblockUserByAlias,
} from "./feed.service.js";
import { getIdempotencyKey, getRouteTemplate } from "../common/idempotency.helpers.js";
import { resolveIdempotency, persistIdempotencyResult } from "../common/idempotency.service.js";

function resolveViewerId(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return null;
  }
  const token = auth.split(" ")[1];
  try {
    const payload = verifyAccess(token);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getQueryValue(input: unknown): string | undefined {
  if (typeof input === "string") {
    return input;
  }
  if (Array.isArray(input)) {
    for (const value of input) {
      if (typeof value === "string") {
        return value;
      }
    }
    return undefined;
  }
  if (typeof input === "number" || typeof input === "boolean") {
    return String(input);
  }
  return undefined;
}

function parseLimit(input: unknown, fallback: number, max: number): number {
  const value = getQueryValue(input);
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function parseOffset(input: unknown, fallback: number): number {
  const value = getQueryValue(input);
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

export async function getFeedHandler(req: Request, res: Response): Promise<void> {
  const viewerId = resolveViewerId(req);
  const requestedScope = getQueryValue(req.query.scope);
  const limit = parseLimit(req.query.limit, 20, 100);
  const offset = parseOffset(req.query.offset, 0);
  const scope: FeedScope =
    requestedScope === "me" || requestedScope === "following" ? requestedScope : "public";

  const result = await getFeed({
    viewerId,
    scope,
    limit,
    offset,
  });

  res.json(result);
}

export async function likeFeedItemHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { feedItemId: req.params.feedItemId },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const result = await likeFeedItem(userId, req.params.feedItemId);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 200, result);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.json(result);
  }

  const result = await likeFeedItem(userId, req.params.feedItemId);
  res.json(result);
}

export async function unlikeFeedItemHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { feedItemId: req.params.feedItemId },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const result = await unlikeFeedItem(userId, req.params.feedItemId);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 200, result);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.json(result);
  }

  const result = await unlikeFeedItem(userId, req.params.feedItemId);
  res.json(result);
}

export async function bookmarkSessionHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { sessionId: req.params.sessionId },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const result = await bookmarkSession(userId, req.params.sessionId);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 200, result);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(200).json(result);
    return;
  }

  const result = await bookmarkSession(userId, req.params.sessionId);
  res.status(200).json(result);
}

export async function removeBookmarkHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { sessionId: req.params.sessionId },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const result = await removeBookmark(userId, req.params.sessionId);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 200, result);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(200).json(result);
    return;
  }

  const result = await removeBookmark(userId, req.params.sessionId);
  res.status(200).json(result);
}

export async function listBookmarksHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }
  const limit = parseLimit(req.query.limit, 50, 100);
  const offset = parseOffset(req.query.offset, 0);
  const bookmarks = await listBookmarks(userId, { limit, offset });
  res.json({ bookmarks });
}

export async function listCommentsHandler(req: Request, res: Response): Promise<void> {
  const viewerId = resolveViewerId(req);
  const limit = parseLimit(req.query.limit, 50, 200);
  const offset = parseOffset(req.query.offset, 0);
  const comments = await listComments(req.params.feedItemId, {
    limit,
    offset,
    viewerId: viewerId ?? undefined,
  });
  res.json({ comments });
}

export async function createCommentHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }
  const rawBody: unknown = req.body;
  const payload = isRecord(rawBody) ? rawBody : undefined;
  const commentValue = payload?.body;
  const body =
    typeof commentValue === "string"
      ? commentValue
      : commentValue === undefined || commentValue === null
        ? ""
        : typeof commentValue === "number" || typeof commentValue === "boolean"
          ? String(commentValue)
          : commentValue instanceof Date
            ? commentValue.toISOString()
            : (JSON.stringify(commentValue) ?? "");

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { feedItemId: req.params.feedItemId, body },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const comment = await createComment(userId, req.params.feedItemId, body);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 201, comment);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(201).json(comment);
    return;
  }

  const comment = await createComment(userId, req.params.feedItemId, body);
  res.status(201).json(comment);
}

export async function deleteCommentHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { commentId: req.params.commentId },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const result = await deleteComment(userId, req.params.commentId);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 200, result);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.json(result);
    return;
  }

  const result = await deleteComment(userId, req.params.commentId);
  res.json(result);
}

export async function blockUserHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { alias: req.params.alias },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const result = await blockUserByAlias(userId, req.params.alias);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 200, result);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.json(result);
    return;
  }

  const result = await blockUserByAlias(userId, req.params.alias);
  res.json(result);
}

export async function unblockUserHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { alias: req.params.alias },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const result = await unblockUserByAlias(userId, req.params.alias);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 200, result);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.json(result);
    return;
  }

  const result = await unblockUserByAlias(userId, req.params.alias);
  res.json(result);
}

export async function reportFeedItemHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }
  const rawBody: unknown = req.body;
  const payload = isRecord(rawBody) ? rawBody : undefined;
  const reasonValue = payload?.reason;
  const detailsValue = payload?.details;
  const reason = typeof reasonValue === "string" ? reasonValue : "";
  const details = typeof detailsValue === "string" ? detailsValue : undefined;

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { feedItemId: req.params.feedItemId, reason, details },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const result = await reportFeedItem(userId, req.params.feedItemId, reason, details);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 201, result);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(201).json(result);
    return;
  }

  const result = await reportFeedItem(userId, req.params.feedItemId, reason, details);
  res.status(201).json(result);
}

export async function reportCommentHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }
  const rawBody: unknown = req.body;
  const payload = isRecord(rawBody) ? rawBody : undefined;
  const reasonValue = payload?.reason;
  const detailsValue = payload?.details;
  const reason = typeof reasonValue === "string" ? reasonValue : "";
  const details = typeof detailsValue === "string" ? detailsValue : undefined;

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { commentId: req.params.commentId, reason, details },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const result = await reportComment(userId, req.params.commentId, reason, details);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 201, result);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(201).json(result);
    return;
  }

  const result = await reportComment(userId, req.params.commentId, reason, details);
  res.status(201).json(result);
}

export async function getLeaderboardHandler(req: Request, res: Response): Promise<void> {
  const viewerId = resolveViewerId(req);
  const scope = (req.query.scope as "global" | "friends" | undefined) ?? "global";
  const period = (req.query.period as "week" | "month" | undefined) ?? "week";
  const limit = parseLimit(req.query.limit, 25, 100);
  const leaderboard = await getLeaderboard(viewerId, { scope, period, limit });
  res.json({ leaderboard, scope, period });
}
export async function createShareLinkHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }
  const rawBody: unknown = req.body;
  const payload = isRecord(rawBody) ? rawBody : undefined;
  const maxViewsRaw = payload?.maxViews;
  const expiresAtRaw = payload?.expiresAt;

  let parsedExpiresAt: Date | null = null;
  if (expiresAtRaw !== undefined && expiresAtRaw !== null) {
    const candidate =
      expiresAtRaw instanceof Date
        ? expiresAtRaw
        : typeof expiresAtRaw === "string" || typeof expiresAtRaw === "number"
          ? new Date(expiresAtRaw)
          : null;
    if (!candidate || Number.isNaN(candidate.getTime())) {
      throw new HttpError(400, "E.FEED.INVALID_EXPIRES_AT", "FEED_INVALID_EXPIRES_AT");
    }
    parsedExpiresAt = candidate;
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      {
        sessionId: req.params.sessionId,
        maxViews: typeof maxViewsRaw === "number" ? maxViewsRaw : null,
        expiresAt: parsedExpiresAt,
      },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const link = await createShareLink(userId, req.params.sessionId, {
      maxViews: typeof maxViewsRaw === "number" ? maxViewsRaw : null,
      expiresAt: parsedExpiresAt,
    });

    const response = {
      id: link.id,
      token: link.token,
      maxViews: link.max_views,
      expiresAt: link.expires_at,
      viewCount: link.view_count,
      createdAt: link.created_at,
    };

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 201, response);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(201).json(response);
    return;
  }

  const link = await createShareLink(userId, req.params.sessionId, {
    maxViews: typeof maxViewsRaw === "number" ? maxViewsRaw : null,
    expiresAt: parsedExpiresAt,
  });

  res.status(201).json({
    id: link.id,
    token: link.token,
    maxViews: link.max_views,
    expiresAt: link.expires_at,
    viewCount: link.view_count,
    createdAt: link.created_at,
  });
}

export async function getSharedSessionHandler(req: Request, res: Response): Promise<void> {
  const { link, session, feedItem } = await getSharedSession(req.params.token);

  res.json({
    link: {
      id: link.id,
      maxViews: link.max_views,
      viewCount: link.view_count + 1, // optimistic increment
      expiresAt: link.expires_at,
    },
    feedItem,
    session,
  });
}

export async function revokeShareLinkHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { sessionId: req.params.sessionId },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const revoked = await revokeShareLink(userId, req.params.sessionId);

    const response = { revoked };

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 200, response);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.json(response);
    return;
  }

  const revoked = await revokeShareLink(userId, req.params.sessionId);
  res.json({ revoked });
}

export async function cloneSessionFromFeedHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }
  const rawBody: unknown = req.body;
  const payload: Record<string, unknown> = isRecord(rawBody) ? rawBody : {};

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { sessionId: req.params.sessionId, ...payload },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const cloned = await cloneSessionFromFeed(userId, req.params.sessionId, payload);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 201, cloned);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(201).json(cloned);
    return;
  }

  const cloned = await cloneSessionFromFeed(userId, req.params.sessionId, payload);
  res.status(201).json(cloned);
}

export async function followUserHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { alias: req.params.alias },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const result = await followUserByAlias(userId, req.params.alias);

    const response = { followingId: result.followingId };

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 200, response);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(200).json(response);
    return;
  }

  const result = await followUserByAlias(userId, req.params.alias);
  res.status(200).json({ followingId: result.followingId });
}

export async function unfollowUserHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }

  // Idempotency support
  const idempotencyKey = getIdempotencyKey(req);
  if (idempotencyKey) {
    const route = getRouteTemplate(req);
    const resolution = await resolveIdempotency(
      { userId, method: req.method, route, key: idempotencyKey },
      { alias: req.params.alias },
    );

    if (resolution.type === "replay") {
      res.set("Idempotency-Key", idempotencyKey);
      res.set("Idempotent-Replayed", "true");
      res.status(resolution.status).json(resolution.body);
      return;
    }

    const result = await unfollowUserByAlias(userId, req.params.alias);

    const response = { unfollowedId: result.unfollowedId };

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 200, response);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(200).json(response);
    return;
  }

  const result = await unfollowUserByAlias(userId, req.params.alias);
  res.status(200).json({ unfollowedId: result.unfollowedId });
}

export async function listFollowersHandler(req: Request, res: Response): Promise<void> {
  const rows = await listUserFollowers(req.params.alias);
  res.json({ followers: rows });
}

export async function listFollowingHandler(req: Request, res: Response): Promise<void> {
  const rows = await listUserFollowing(req.params.alias);
  res.json({ following: rows });
}
