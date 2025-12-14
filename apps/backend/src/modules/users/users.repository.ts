import crypto from "crypto";
import type { Knex } from "knex";
import { db } from "../../db/connection.js";
import type { ContactUpsertDTO, UpdateProfileDTO } from "./users.types.js";

const USERS_TABLE = "users";
const CONTACTS_TABLE = "user_contacts";
const STATE_TABLE = "user_state_history";
const MEDIA_TABLE = "media";
const AVATAR_TARGET_TYPE = "user_avatar";
const PROFILES_TABLE = "profiles";
const USER_METRICS_TABLE = "user_metrics";

export interface CreateUserRecordInput {
  id: string;
  username: string;
  displayName: string;
  locale?: string;
  preferredLang?: string;
  status: string;
  roleCode: string;
  passwordHash: string;
}

export type UserRow = {
  id: string;
  username: string;
  display_name: string;
  locale: string;
  preferred_lang: string;
  status: string;
  role_code: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
  primary_email?: string | null;
  avatar_url?: string | null;
  avatar_updated_at?: string | null;
  avatar_mime_type?: string | null;
  avatar_bytes?: number | string | null;
};

export type ContactRow = {
  id: string;
  user_id: string;
  type: "email" | "phone";
  value: string;
  is_primary: boolean;
  is_recovery: boolean;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
};

export type AvatarRow = {
  id: string;
  owner_id: string;
  target_type: string;
  target_id: string;
  storage_key: string;
  file_url: string;
  mime_type: string | null;
  media_type: string | null;
  bytes: number | null;
  created_at: string;
  updated_at: string | null;
};

function withDb(trx?: Knex.Transaction) {
  return trx ?? db;
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const normalized = email.toLowerCase();
  return db(USERS_TABLE)
    .select<UserRow[]>(`${USERS_TABLE}.*`)
    .joinRaw(
      `INNER JOIN ${CONTACTS_TABLE} c ON c.user_id = ${USERS_TABLE}.id AND c.type = ? AND c.is_primary IS TRUE`,
      ["email"],
    )
    .whereRaw("LOWER(c.value) = ?", [normalized])
    .first();
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  return db<UserRow>(USERS_TABLE).where({ id }).first();
}

export async function findUserByUsername(username: string): Promise<UserRow | undefined> {
  return db<UserRow>(USERS_TABLE).whereRaw("LOWER(username) = ?", [username.toLowerCase()]).first();
}

export async function listUsers(limit = 50, offset = 0): Promise<UserRow[]> {
  return db(USERS_TABLE)
    .select(
      `${USERS_TABLE}.id`,
      `${USERS_TABLE}.username`,
      `${USERS_TABLE}.display_name`,
      `${USERS_TABLE}.locale`,
      `${USERS_TABLE}.preferred_lang`,
      `${USERS_TABLE}.status`,
      `${USERS_TABLE}.role_code`,
      `${USERS_TABLE}.created_at`,
      `${USERS_TABLE}.updated_at`,
      db.raw(
        `(SELECT value FROM ${CONTACTS_TABLE} ec WHERE ec.user_id = ${USERS_TABLE}.id AND ec.type = 'email' AND ec.is_primary IS TRUE LIMIT 1) AS primary_email`,
      ),
      db.raw(
        `(SELECT file_url FROM ${MEDIA_TABLE} m WHERE m.owner_id = ${USERS_TABLE}.id AND m.target_type = ? AND m.target_id = ${USERS_TABLE}.id ORDER BY m.created_at DESC LIMIT 1) AS avatar_url`,
        [AVATAR_TARGET_TYPE],
      ),
      db.raw(
        `(SELECT created_at FROM ${MEDIA_TABLE} m WHERE m.owner_id = ${USERS_TABLE}.id AND m.target_type = ? AND m.target_id = ${USERS_TABLE}.id ORDER BY m.created_at DESC LIMIT 1) AS avatar_updated_at`,
        [AVATAR_TARGET_TYPE],
      ),
      db.raw(
        `(SELECT mime_type FROM ${MEDIA_TABLE} m WHERE m.owner_id = ${USERS_TABLE}.id AND m.target_type = ? AND m.target_id = ${USERS_TABLE}.id ORDER BY m.created_at DESC LIMIT 1) AS avatar_mime_type`,
        [AVATAR_TARGET_TYPE],
      ),
      db.raw(
        `(SELECT bytes FROM ${MEDIA_TABLE} m WHERE m.owner_id = ${USERS_TABLE}.id AND m.target_type = ? AND m.target_id = ${USERS_TABLE}.id ORDER BY m.created_at DESC LIMIT 1) AS avatar_bytes`,
        [AVATAR_TARGET_TYPE],
      ),
    )
    .orderBy(`${USERS_TABLE}.created_at`, "desc")
    .limit(limit)
    .offset(offset);
}

export async function changePassword(id: string, password_hash: string): Promise<number> {
  return db(USERS_TABLE)
    .where({ id })
    .update({ password_hash, updated_at: new Date().toISOString() });
}

export async function updateUserProfile(
  userId: string,
  updates: UpdateProfileDTO,
  trx?: Knex.Transaction,
) {
  const patch: Record<string, unknown> = {};
  if (updates.username !== undefined) {
    patch.username = updates.username;
  }
  if (updates.displayName !== undefined) {
    patch.display_name = updates.displayName;
  }
  if (updates.locale !== undefined) {
    patch.locale = updates.locale;
  }
  if (updates.preferredLang !== undefined) {
    patch.preferred_lang = updates.preferredLang;
  }
  if (updates.defaultVisibility !== undefined) {
    patch.default_visibility = updates.defaultVisibility;
  }
  if (updates.units !== undefined) {
    patch.units = updates.units;
  }

  if (!Object.keys(patch).length) {
    return 0;
  }

  patch.updated_at = new Date().toISOString();
  return withDb(trx)(USERS_TABLE).where({ id: userId }).update(patch);
}

export async function createUserRecord(
  input: CreateUserRecordInput,
  trx?: Knex.Transaction,
): Promise<number> {
  const now = new Date().toISOString();
  return withDb(trx)(USERS_TABLE).insert({
    id: input.id,
    username: input.username,
    display_name: input.displayName,
    locale: input.locale ?? "en-US",
    preferred_lang: input.preferredLang ?? "en",
    status: input.status,
    role_code: input.roleCode,
    password_hash: input.passwordHash,
    created_at: now,
    updated_at: now,
  });
}

export async function setUserStatus(
  userId: string,
  status: string,
  trx?: Knex.Transaction,
): Promise<number> {
  return withDb(trx)(USERS_TABLE)
    .where({ id: userId })
    .update({ status, updated_at: new Date().toISOString() });
}

export async function insertStateHistory(
  userId: string,
  field: string,
  oldValue: unknown,
  newValue: unknown,
  trx?: Knex.Transaction,
) {
  return withDb(trx)(STATE_TABLE).insert({
    id: crypto.randomUUID(),
    user_id: userId,
    field,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
    changed_at: new Date().toISOString(),
  });
}

export async function getUserContacts(
  userId: string,
  trx?: Knex.Transaction,
): Promise<ContactRow[]> {
  return withDb(trx)<ContactRow>(CONTACTS_TABLE)
    .where({ user_id: userId })
    .orderBy("created_at", "asc");
}

export async function getUserAvatar(
  userId: string,
  trx?: Knex.Transaction,
): Promise<AvatarRow | null> {
  const row = await withDb(trx)<AvatarRow>(MEDIA_TABLE)
    .where({
      owner_id: userId,
      target_type: AVATAR_TARGET_TYPE,
      target_id: userId,
    })
    .orderBy("created_at", "desc")
    .first();
  return row ?? null;
}

export async function getContactById(
  contactId: string,
  trx?: Knex.Transaction,
): Promise<ContactRow | undefined> {
  return withDb(trx)<ContactRow>(CONTACTS_TABLE).where({ id: contactId }).first();
}

export async function fetchUserWithContacts(
  userId: string,
  trx?: Knex.Transaction,
): Promise<{
  user: UserRow;
  contacts: ContactRow[];
  avatar: AvatarRow | null;
} | null> {
  const user = await (trx ?? db)<UserRow>(USERS_TABLE).where({ id: userId }).first();
  if (!user) {
    return null;
  }
  const contacts = await getUserContacts(userId, trx);
  const avatar = await getUserAvatar(userId, trx);
  return { user, contacts, avatar };
}

export async function upsertContact(
  userId: string,
  dto: ContactUpsertDTO,
  trx?: Knex.Transaction,
): Promise<number> {
  const dbOrTrx = withDb(trx);
  const now = new Date().toISOString();
  const trimmedValue = dto.value.trim();
  const normalizedValue = dto.type === "email" ? trimmedValue.toLowerCase() : trimmedValue;
  const isPrimary = dto.isPrimary ?? dto.type === "email";
  const isRecovery = dto.isRecovery ?? dto.type === "phone";

  if (isPrimary) {
    await dbOrTrx(CONTACTS_TABLE).where({ user_id: userId }).update({ is_primary: false });
  }

  const existing = await dbOrTrx<ContactRow>(CONTACTS_TABLE)
    .where({ user_id: userId, type: dto.type })
    .orderBy("created_at", "asc")
    .first();

  if (existing) {
    const normalizedExistingValue =
      dto.type === "email" ? existing.value.toLowerCase() : existing.value.trim();
    const valueChanged = normalizedExistingValue !== normalizedValue;
    return dbOrTrx(CONTACTS_TABLE)
      .where({ id: existing.id })
      .update({
        value: normalizedValue,
        is_primary: isPrimary,
        is_recovery: isRecovery,
        is_verified: valueChanged ? false : existing.is_verified,
        verified_at: valueChanged ? null : existing.verified_at,
      });
  }

  return dbOrTrx(CONTACTS_TABLE).insert({
    id: crypto.randomUUID(),
    user_id: userId,
    type: dto.type,
    value: normalizedValue,
    is_primary: isPrimary,
    is_recovery: isRecovery,
    is_verified: false,
    verified_at: null,
    created_at: now,
  });
}

export async function markContactVerified(
  contactId: string,
  trx?: Knex.Transaction,
): Promise<number> {
  return withDb(trx)(CONTACTS_TABLE)
    .where({ id: contactId })
    .update({ is_verified: true, verified_at: new Date().toISOString() });
}

export async function deleteContact(
  userId: string,
  contactId: string,
  trx?: Knex.Transaction,
): Promise<number> {
  return withDb(trx)(CONTACTS_TABLE).where({ id: contactId, user_id: userId }).del();
}

export type ProfileRow = {
  user_id: string;
  alias: string | null;
  alias_changed_at: string | null;
  bio: string | null;
  avatar_asset_id: string | null;
  date_of_birth: string | null;
  gender_code: string | null;
  visibility: string;
  timezone: string | null;
  unit_preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type UserMetricRow = {
  id: string;
  user_id: string;
  weight: number | null;
  unit: string | null;
  fitness_level_code: string | null;
  training_frequency: string | null;
  recorded_at: string;
  created_at: string;
};

export interface UserMetrics {
  follower_count: number;
  following_count: number;
  sessions_completed: number;
  total_points: number;
  current_streak_days: number;
}

export async function getUserMetrics(userId: string, trx?: Knex.Transaction): Promise<UserMetrics> {
  const exec = withDb(trx);

  // Get follower count
  const followerResult = await exec("followers")
    .where({ followed_id: userId })
    .count<{ count: string | number }>("* as count")
    .first();
  const follower_count = Number(followerResult?.count ?? 0);

  // Get following count
  const followingResult = await exec("followers")
    .where({ follower_id: userId })
    .count<{ count: string | number }>("* as count")
    .first();
  const following_count = Number(followingResult?.count ?? 0);

  // Get sessions completed
  const sessionsResult = await exec("sessions")
    .where({ owner_id: userId, status: "completed" })
    .count<{ count: string | number }>("* as count")
    .first();
  const sessions_completed = Number(sessionsResult?.count ?? 0);

  // Get total points
  const pointsResult = await exec("user_points")
    .where({ user_id: userId })
    .sum<{ total: string | number }>("points as total")
    .first();
  const total_points = Number(pointsResult?.total ?? 0);

  // Calculate current streak (consecutive days with completed sessions)
  const recentSessions = await exec("sessions")
    .where({ owner_id: userId, status: "completed" })
    .whereNotNull("completed_at")
    .orderBy("completed_at", "desc")
    .select<{ completed_at: string | Date }[]>("completed_at")
    .limit(365); // Check up to 1 year back

  let current_streak_days = 0;
  if (recentSessions.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessionDates = new Set<string>();
    for (const session of recentSessions) {
      const date = new Date(session.completed_at as string);
      date.setHours(0, 0, 0, 0);
      sessionDates.add(date.toISOString().split("T")[0]);
    }

    // Check if there's activity today or yesterday (allow for timezone differences)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString().split("T")[0];
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    let checkDate: Date;
    if (sessionDates.has(todayStr)) {
      checkDate = today;
      current_streak_days = 1;
    } else if (sessionDates.has(yesterdayStr)) {
      checkDate = yesterday;
      current_streak_days = 1;
    } else {
      checkDate = today; // Streak is broken
    }

    // Count consecutive days backwards
    if (current_streak_days > 0) {
      for (let i = 1; i < 365; i++) {
        const prevDate = new Date(checkDate);
        prevDate.setDate(prevDate.getDate() - i);
        const prevDateStr = prevDate.toISOString().split("T")[0];

        if (sessionDates.has(prevDateStr)) {
          current_streak_days++;
        } else {
          break;
        }
      }
    }
  }

  return {
    follower_count,
    following_count,
    sessions_completed,
    total_points,
    current_streak_days,
  };
}

export async function getProfileByUserId(
  userId: string,
  trx?: Knex.Transaction,
): Promise<ProfileRow | null> {
  const row = await withDb(trx)<ProfileRow>(PROFILES_TABLE)
    .select([
      "user_id",
      "alias",
      "alias_changed_at",
      "bio",
      "avatar_asset_id",
      "date_of_birth",
      "gender_code",
      "visibility",
      "timezone",
      "unit_preferences",
      "created_at",
      "updated_at",
    ])
    .where({ user_id: userId })
    .first();
  return row ?? null;
}

export async function checkAliasAvailable(
  alias: string,
  excludeUserId?: string,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const query = withDb(trx)<ProfileRow>(PROFILES_TABLE).whereRaw("LOWER(alias) = ?", [
    alias.toLowerCase(),
  ]);

  if (excludeUserId) {
    query.where("user_id", "!=", excludeUserId);
  }

  const existing = await query.first();
  return !existing;
}

export async function updateProfileAlias(
  userId: string,
  alias: string,
  trx?: Knex.Transaction,
): Promise<number> {
  const exec = withDb(trx);
  const now = new Date().toISOString();
  // Ensure profile exists
  const existing = await exec<ProfileRow>(PROFILES_TABLE).where({ user_id: userId }).first();

  if (existing) {
    return exec(PROFILES_TABLE).where({ user_id: userId }).update({
      alias,
      alias_changed_at: now,
      updated_at: now,
    });
  }

  // Create profile if it doesn't exist
  const now = new Date().toISOString();
  return exec(PROFILES_TABLE).insert({
    user_id: userId,
    alias,
    alias_changed_at: now,
    visibility: "private",
    unit_preferences: {},
    created_at: now,
    updated_at: now,
  });
}

/**
 * Check if user can change alias (rate limiting: max 1 per 30 days)
 * @returns true if alias change is allowed, false if rate limited
 */
export async function canChangeAlias(
  userId: string,
  trx?: Knex.Transaction,
): Promise<{ allowed: boolean; daysRemaining?: number }> {
  const profile = await getProfileByUserId(userId, trx);
  if (!profile || !profile.alias_changed_at) {
    // No previous alias change, allow it
    return { allowed: true };
  }

  const lastChange = new Date(profile.alias_changed_at);
  const now = new Date();
  const daysSinceChange = Math.floor(
    (now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceChange >= 30) {
    return { allowed: true };
  }

  const daysRemaining = 30 - daysSinceChange;
  return { allowed: false, daysRemaining };
}

export async function insertUserMetric(
  userId: string,
  metric: {
    weight?: number;
    unit?: string;
    fitness_level_code?: string;
    training_frequency?: string;
  },
  trx?: Knex.Transaction,
): Promise<string> {
  const exec = withDb(trx);
  const now = new Date().toISOString();
  const [record] = (await exec(USER_METRICS_TABLE)
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      weight: metric.weight ?? null,
      unit: metric.unit ?? "kg",
      fitness_level_code: metric.fitness_level_code ?? null,
      training_frequency: metric.training_frequency ?? null,
      recorded_at: now,
      created_at: now,
    })
    .returning("id")) as Array<{ id: string }>;
  return record.id;
}

export async function getLatestUserMetrics(
  userId: string,
  trx?: Knex.Transaction,
): Promise<{
  weight: number | null;
  unit: string | null;
  fitness_level_code: string | null;
  training_frequency: string | null;
} | null> {
  const row = await withDb(trx)<UserMetricRow>(USER_METRICS_TABLE)
    .where({ user_id: userId })
    .orderBy("recorded_at", "desc")
    .select(["weight", "unit", "fitness_level_code", "training_frequency"])
    .first();

  return row
    ? {
        weight: row.weight,
        unit: row.unit,
        fitness_level_code: row.fitness_level_code,
        training_frequency: row.training_frequency,
      }
    : null;
}
