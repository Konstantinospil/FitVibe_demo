import { db } from "../../db/connection.js";

const USERS_TABLE = "users";
const PROFILES_TABLE = "profiles";
const FOLLOWERS_TABLE = "followers";
const USER_BLOCKS_TABLE = "user_blocks";

export interface FollowerRow {
  follower_id: string;
  follower_username: string;
  follower_display_name: string;
  followed_at: string;
}

export interface FollowingRow {
  following_id: string;
  following_username: string;
  following_display_name: string;
  followed_at: string;
}

export async function findSessionById(sessionId: string): Promise<SessionRow | undefined> {
  return db<SessionRow>(SESSIONS_TABLE)
    .select(["id", "owner_id", "visibility", "status", "completed_at"])
    .where({ id: sessionId })
    .whereNull("deleted_at")
    .first();
}

export interface FeedItemRow {
  id: string;
  owner_id: string;
  session_id: string | null;
  visibility: string;
  published_at: string | null;
}

export async function findFeedItemBySessionId(sessionId: string): Promise<FeedItemRow | undefined> {
  return db<FeedItemRow>(FEED_ITEMS_TABLE)
    .select(["id", "owner_id", "session_id", "visibility", "published_at"])
    .where({ session_id: sessionId })
    .whereNull("deleted_at")
    .first();
}

export interface CreateFeedItemInput {
  ownerId: string;
  sessionId?: string | null;
  visibility: string;
  publishedAt?: Date | string | null;
}

export async function insertFeedItem({
  ownerId,
  sessionId = null,
  visibility,
  publishedAt,
}: CreateFeedItemInput): Promise<FeedItemRow> {
  const [row] = await db(FEED_ITEMS_TABLE)
    .insert({
      owner_id: ownerId,
      session_id: sessionId ?? null,
      visibility,
      published_at: publishedAt ?? db.fn.now(),
    })
    .returning<FeedItemRow[]>(["id", "owner_id", "session_id", "visibility", "published_at"]);
  return row;
}

export async function insertSessionFeedItemAtomic({
  ownerId,
  sessionId,
  visibility,
}: {
  ownerId: string;
  sessionId: string;
  visibility: string;
}): Promise<{ row: FeedItemRow; created: boolean }> {
  const inserted = await db(FEED_ITEMS_TABLE)
    .insert({
      owner_id: ownerId,
      session_id: sessionId,
      visibility,
      published_at: db.fn.now(),
    })
    .onConflict("session_id")
    .ignore()
    .returning<FeedItemRow[]>(["id", "owner_id", "session_id", "visibility", "published_at"]);

  if (inserted.length > 0) {
    return { row: inserted[0], created: true };
  }

  const existing = await findFeedItemBySessionId(sessionId);
  if (!existing) {
    throw new Error("Feed item uniqueness conflict without an existing row");
  }
  return { row: existing, created: false };
}

export async function findFeedItemById(feedItemId: string): Promise<FeedItemRow | undefined> {
  return db<FeedItemRow>(FEED_ITEMS_TABLE)
    .select(["id", "owner_id", "session_id", "visibility", "published_at"])
    .where({ id: feedItemId })
    .whereNull("deleted_at")
    .first();
}

export async function updateFeedItem(
  feedItemId: string,
  patch: Partial<{ visibility: string; published_at: Date | string | null }>,
): Promise<void> {
  if (Object.keys(patch).length === 0) {
    return;
  }
  await db(FEED_ITEMS_TABLE)
    .where({ id: feedItemId })
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    });
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const row = await db<{ following_id: string }>(FOLLOWERS_TABLE)
    .select("following_id")
    .where({ follower_id: followerId, following_id: followingId })
    .first();
  return Boolean(row);
}

export async function deleteFollower(followerId: string, followingId: string): Promise<number> {
  return db(FOLLOWERS_TABLE).where({ follower_id: followerId, following_id: followingId }).del();
}

export async function upsertFollower(followerId: string, followingId: string): Promise<boolean> {
  const insertQuery = db(FOLLOWERS_TABLE)
    .insert({
      follower_id: followerId,
      following_id: followingId,
    })
    .onConflict(["follower_id", "following_id"])
    .ignore();

  const result = await insertQuery;
  if (Array.isArray(result)) {
    return result.length > 0;
  }
  if (typeof result === "number") {
    return result > 0;
  }
  return true;
}

export async function listFollowers(userId: string): Promise<FollowerRow[]> {
  const rows = await db(FOLLOWERS_TABLE)
    .join(USERS_TABLE, `${USERS_TABLE}.id`, `${FOLLOWERS_TABLE}.follower_id`)
    .join(PROFILES_TABLE, `${PROFILES_TABLE}.user_id`, `${FOLLOWERS_TABLE}.follower_id`)
    .select<FollowerRow[]>([
      `${USERS_TABLE}.id as follower_id`,
      `${PROFILES_TABLE}.alias as follower_username`,
      `${USERS_TABLE}.display_name as follower_display_name`,
      `${FOLLOWERS_TABLE}.created_at as followed_at`,
    ])
    .where({ [`${FOLLOWERS_TABLE}.following_id`]: userId })
    .orderBy(`${FOLLOWERS_TABLE}.created_at`, "desc");

  return rows;
}

export async function listFollowing(userId: string): Promise<FollowingRow[]> {
  const rows = await db(FOLLOWERS_TABLE)
    .join(USERS_TABLE, `${USERS_TABLE}.id`, `${FOLLOWERS_TABLE}.following_id`)
    .join(PROFILES_TABLE, `${PROFILES_TABLE}.user_id`, `${FOLLOWERS_TABLE}.following_id`)
    .select<FollowingRow[]>([
      `${USERS_TABLE}.id as following_id`,
      `${PROFILES_TABLE}.alias as following_username`,
      `${USERS_TABLE}.display_name as following_display_name`,
      `${FOLLOWERS_TABLE}.created_at as followed_at`,
    ])
    .where({ [`${FOLLOWERS_TABLE}.follower_id`]: userId })
    .orderBy(`${FOLLOWERS_TABLE}.created_at`, "desc");

  return rows;
}

export async function hasBlockRelation(userA: string, userB: string): Promise<boolean> {
  const row = await db<{ blocker_id: string; blocked_id: string }>(USER_BLOCKS_TABLE)
    .select("blocker_id")
    .whereIn("blocker_id", [userA, userB])
    .whereIn("blocked_id", [userA, userB])
    .first();
  return Boolean(row);
}

export async function insertBlock(blockerId: string, blockedId: string): Promise<boolean> {
  const insertQuery = db(USER_BLOCKS_TABLE)
    .insert({
      blocker_id: blockerId,
      blocked_id: blockedId,
    })
    .onConflict(["blocker_id", "blocked_id"])
    .ignore();
  const result = await insertQuery;
  if (Array.isArray(result)) {
    return result.length > 0;
  }
  if (typeof result === "number") {
    return result > 0;
  }
  return true;
}

export async function deleteBlock(blockerId: string, blockedId: string): Promise<number> {
  return db(USER_BLOCKS_TABLE).where({ blocker_id: blockerId, blocked_id: blockedId }).del();
}
