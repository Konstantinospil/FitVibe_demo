import { HttpError } from "../../utils/http.js";
import { insertAudit } from "../common/audit.util.js";
import { findFeedItemBySessionId, insertFeedItem } from "./feed.repository.js";
import { cloneOne } from "../sessions/sessions.service.js";
import type { SessionWithExercises } from "../sessions/sessions.types.js";
import { loadSessionOrThrow } from "./feed.access.js";

export async function cloneSessionFromFeed(
  userId: string,
  sourceSessionId: string,
  payload: Record<string, unknown> = {},
): Promise<SessionWithExercises> {
  return cloneOne(userId, sourceSessionId, {
    ...payload,
  });
}

export async function publishSession(
  userId: string,
  sessionId: string,
): Promise<{ feedItemId: string }> {
  const session = await loadSessionOrThrow(sessionId);

  if (session.owner_id !== userId) {
    throw new HttpError(403, "E.FEED.NOT_OWNER", "FEED_NOT_OWNER");
  }

  if (session.status !== "completed") {
    throw new HttpError(400, "E.FEED.SESSION_NOT_COMPLETED", "FEED_SESSION_NOT_COMPLETED");
  }

  if (session.visibility !== "public") {
    throw new HttpError(400, "E.FEED.SESSION_NOT_PUBLIC", "FEED_SESSION_NOT_PUBLIC");
  }

  // Check if feed item already exists
  const existing = await findFeedItemBySessionId(sessionId);
  if (existing) {
    return { feedItemId: existing.id };
  }

  // Create feed item
  const feedItem = await insertFeedItem({
    ownerId: userId,
    sessionId,
    visibility: "public",
  });

  await insertAudit({
    actorUserId: userId,
    entityType: "feed_items",
    action: "feed.publish",
    entityId: feedItem.id,
    metadata: {
      session_id: sessionId,
    },
  });

  return { feedItemId: feedItem.id };
}
