import type { Request, Response } from "express";

import { HttpError } from "../../utils/http.js";
import type { FeedScope, FeedSort } from "./feed.repository.js";
import {
  blockUserByAlias,
  bookmarkSession,
  cloneSessionFromFeed,
  createComment,
  deleteComment,
  followUserByAlias,
  getFeed,
  getLeaderboard,
  likeFeedItem,
  listBookmarks,
  listComments,
  listUserFollowers,
  listUserFollowing,
  publishSession,
  removeBookmark,
  reportComment,
  reportFeedItem,
  unlikeFeedItem,
  unfollowUserByAlias,
  unblockUserByAlias,
} from "./feed.service.js";
import {
  handleIdempotentRequest,
  getIdempotencyKey,
  getRouteTemplate,
} from "../common/idempotency.helpers.js";
import { resolveIdempotency, persistIdempotencyResult } from "../common/idempotency.service.js";

// Removed resolveViewerId - all feed endpoints now require authentication per FR-003 (privacy-by-default)
// Authentication is enforced via requireAuth middleware in routes

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
  // Authentication is required per FR-003 (privacy-by-default)
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }

  const requestedScope = getQueryValue(req.query.scope);
  const limit = parseLimit(req.query.limit, 20, 100);
  const offset = parseOffset(req.query.offset, 0);
  const searchQuery = getQueryValue(req.query.q) || null;
  const requestedSort = getQueryValue(req.query.sort);

  let scope: FeedScope = "public";
  if (requestedScope === "me" || requestedScope === "following") {
    scope = requestedScope;
  }

  let sort: FeedSort = "date";
  if (requestedSort === "popularity" || requestedSort === "relevance") {
    sort = requestedSort;
  }

  const result = await getFeed({
    viewerId: userId,
    scope,
    limit,
    offset,
    searchQuery,
    sort,
  });

  res.json(result);
}

export async function likeFeedItemHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }

  const handled = await handleIdempotentRequest(
    req,
    res,
    userId,
    { feedItemId: req.params.feedItemId },
    async () => {
      const result = await likeFeedItem(userId, req.params.feedItemId);
      return { status: 200, body: result };
    },
  );

  if (!handled) {
    const result = await likeFeedItem(userId, req.params.feedItemId);
    res.json(result);
  }
}

export async function unlikeFeedItemHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }

  const handled = await handleIdempotentRequest(
    req,
    res,
    userId,
    { feedItemId: req.params.feedItemId },
    async () => {
      const result = await unlikeFeedItem(userId, req.params.feedItemId);
      return { status: 200, body: result };
    },
  );

  if (!handled) {
    const result = await unlikeFeedItem(userId, req.params.feedItemId);
    res.json(result);
  }
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
  // Authentication required per FR-003 (privacy-by-default)
  const viewerId = req.user?.sub;
  if (!viewerId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }
  const limit = parseLimit(req.query.limit, 50, 200);
  const offset = parseOffset(req.query.offset, 0);
  const comments = await listComments(req.params.feedItemId, {
    limit,
    offset,
    viewerId,
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

  const handled = await handleIdempotentRequest(
    req,
    res,
    userId,
    { feedItemId: req.params.feedItemId, body },
    async () => {
      const comment = await createComment(userId, req.params.feedItemId, body);
      return { status: 201, body: comment };
    },
  );

  if (!handled) {
    const comment = await createComment(userId, req.params.feedItemId, body);
    res.status(201).json(comment);
  }
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
  // Authentication required per FR-003 (privacy-by-default)
  const viewerId = req.user?.sub;
  if (!viewerId) {
    throw new HttpError(401, "E.UNAUTHENTICATED", "UNAUTHENTICATED");
  }
  const requestedScope = req.query.scope as string | undefined;
  const scope = requestedScope === "friends" ? "friends" : "global";
  const period = (req.query.period as "week" | "month" | undefined) ?? "week";
  const limit = parseLimit(req.query.limit, 25, 100);
  const leaderboard = await getLeaderboard(viewerId, { scope, period, limit });
  res.json({ leaderboard, scope, period });
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

export async function publishSessionHandler(req: Request, res: Response): Promise<void> {
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

    const result = await publishSession(userId, req.params.sessionId);

    if (resolution.recordId) {
      await persistIdempotencyResult(resolution.recordId, 201, result);
    }

    res.set("Idempotency-Key", idempotencyKey);
    res.status(201).json(result);
    return;
  }

  const result = await publishSession(userId, req.params.sessionId);
  res.status(201).json(result);
}
