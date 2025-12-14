import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "../../db/connection.js";
import type { ContactRow, UserRow, AvatarRow } from "./users.repository.js";
import {
  findUserById,
  listUsers as listUserRows,
  changePassword,
  updateUserProfile,
  createUserRecord,
  setUserStatus,
  fetchUserWithContacts,
  insertStateHistory,
  getUserContacts,
  upsertContact,
  markContactVerified,
  deleteContact,
  getContactById,
  getProfileByUserId,
  checkAliasAvailable,
  updateProfileAlias,
  canChangeAlias,
  insertUserMetric,
  getLatestUserMetrics,
  type ProfileRow,
  type UserMetricRow,
} from "./users.repository.js";
import type {
  UpdateProfileDTO,
  ChangePasswordDTO,
  CreateUserDTO,
  UserSafe,
  UserDetail,
  UserStatus,
  UserContact,
  UserAvatar,
  UserDataExportBundle,
} from "./users.types.js";
import {
  revokeRefreshByUserId,
  createAuthToken,
  findAuthToken,
  consumeAuthToken,
  markAuthTokensConsumed,
  countAuthTokensSince,
  purgeAuthTokensOlderThan,
} from "../auth/auth.repository.js";
import { assertPasswordPolicy } from "../auth/passwordPolicy.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/http.js";
import { insertAudit } from "../common/audit.util.js";
import {
  scheduleAccountDeletion,
  executeAccountDeletion,
  processDueAccountDeletions,
  type DeleteSchedule,
} from "./dsr.service.js";

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,50}$/;
const STATUS_TRANSITIONS: Record<UserStatus, UserStatus[]> = {
  pending_verification: ["active", "archived", "pending_deletion"],
  active: ["archived", "pending_deletion"],
  archived: ["active", "pending_deletion"],
  pending_deletion: [],
};
const INITIAL_ALLOWED_STATUSES: UserStatus[] = ["pending_verification", "active", "archived"];
const CONTACT_VERIFICATION_TOKEN_PREFIX = "contact_verify";
const CONTACT_VERIFICATION_TTL_SEC = env.EMAIL_VERIFICATION_TTL_SEC;
const CONTACT_VERIFICATION_RESEND_LIMIT = 3;
const CONTACT_VERIFICATION_RESEND_WINDOW_MS = 60 * 60 * 1000;
const CONTACT_VERIFICATION_RETENTION_DAYS = 7;

// ProfileRow and UserMetricRow are imported from repository

type SessionRow = { id: string; owner_id: string };
type SessionExerciseRow = { id: string; session_id: string };
type GenericRow = Record<string, unknown>;
type UserPointRow = { id: string; user_id: string; points: number | string; awarded_at?: string };
type BadgeRow = { id: string; user_id: string; badge_type: string; awarded_at: string };
type MediaRow = {
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
};
type UserStateHistoryRow = {
  id: string;
  user_id: string;
  field: string;
  old_value: unknown;
  new_value: unknown;
  changed_at: string;
};

function toContact(row: ContactRow): UserContact {
  return {
    id: row.id,
    type: row.type,
    value: row.value,
    isPrimary: row.is_primary,
    isRecovery: row.is_recovery,
    isVerified: row.is_verified,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
  };
}

export { executeAccountDeletion, processDueAccountDeletions };

function primaryEmail(contacts: ContactRow[]): string | null {
  return contacts.find((contact) => contact.type === "email" && contact.is_primary)?.value ?? null;
}

function primaryPhone(contacts: ContactRow[]): string | null {
  return contacts.find((contact) => contact.type === "phone")?.value ?? null;
}

async function toUserDetail(
  user: UserRow,
  contacts: ContactRow[],
  avatar?: AvatarRow | null,
): Promise<UserDetail> {
  // Fetch profile and latest metrics
  const profile = await getProfileByUserId(user.id);
  const latestMetrics = await getLatestUserMetrics(user.id);

  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    locale: user.locale,
    preferredLang: user.preferred_lang,
    defaultVisibility: (user as { default_visibility?: string }).default_visibility ?? "private",
    units: (user as { units?: string }).units ?? "metric",
    role: user.role_code,
    status: user.status as UserStatus,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    primaryEmail: primaryEmail(contacts),
    phoneNumber: primaryPhone(contacts),
    avatar: toUserAvatar(avatar),
    contacts: contacts.map(toContact),
    profile: {
      alias: profile?.alias ?? null,
      bio: profile?.bio ?? null,
      weight: latestMetrics?.weight ?? null,
      weightUnit: latestMetrics?.unit ?? null,
      fitnessLevel: latestMetrics?.fitness_level_code ?? null,
      trainingFrequency: latestMetrics?.training_frequency ?? null,
    },
  };
}

function toUserSafe(row: UserRow): UserSafe {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    locale: row.locale,
    preferredLang: row.preferred_lang,
    defaultVisibility: (row as { default_visibility?: string }).default_visibility ?? "private",
    units: (row as { units?: string }).units ?? "metric",
    role: row.role_code,
    status: row.status as UserStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    primaryEmail: row.primary_email ?? null,
    phoneNumber: null,
    avatar: toUserAvatarFromList(row),
  };
}

async function ensureUsernameAvailable(userId: string, username: string) {
  const normalized = username.toLowerCase();
  const conflict = await db<UserRow>("users")
    .whereRaw("LOWER(username) = ?", [normalized])
    .whereNot({ id: userId })
    .first<UserRow>();
  if (conflict) {
    throw new HttpError(409, "USER_USERNAME_TAKEN", "USER_USERNAME_TAKEN");
  }
}

function ensureUsernameFormat(username: string) {
  if (!USERNAME_REGEX.test(username)) {
    throw new HttpError(422, "USER_USERNAME_INVALID", "USER_USERNAME_INVALID");
  }
}

function assertStatusTransition(current: string, next: UserStatus) {
  const allowed = STATUS_TRANSITIONS[current as UserStatus] ?? [];
  if (!allowed.includes(next)) {
    throw new HttpError(
      400,
      "USER_STATUS_INVALID",
      `Cannot transition status from ${current} to ${next}`,
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" && maybeCode === "23505";
}

function toUserAvatar(row: AvatarRow | null | undefined): UserAvatar | null {
  if (!row) {
    return null;
  }
  return {
    url: row.file_url,
    mimeType: row.mime_type ?? null,
    bytes: row.bytes ?? null,
    updatedAt: row.created_at ?? null,
  };
}

function toUserAvatarFromList(row: {
  avatar_url?: string | null;
  avatar_mime_type?: string | null;
  avatar_bytes?: number | string | null;
  avatar_updated_at?: string | null;
}): UserAvatar | null {
  if (!row?.avatar_url) {
    return null;
  }
  const bytes =
    row.avatar_bytes === undefined || row.avatar_bytes === null ? null : Number(row.avatar_bytes);
  return {
    url: row.avatar_url,
    mimeType: row.avatar_mime_type ?? null,
    bytes,
    updatedAt: row.avatar_updated_at ?? null,
  };
}

function contactTokenType(contactId: string): string {
  return `${CONTACT_VERIFICATION_TOKEN_PREFIX}:${contactId}`;
}

function generateContactToken() {
  const raw = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export async function createUser(
  actorUserId: string | null,
  dto: CreateUserDTO,
): Promise<UserDetail> {
  const userId = crypto.randomUUID();
  const username = dto.username.trim();
  const displayName = dto.displayName.trim();
  const email = dto.email.trim().toLowerCase();
  const roleCode = dto.role.trim();
  const initialStatus: UserStatus = dto.status ?? "pending_verification";

  ensureUsernameFormat(username);
  if (!displayName) {
    throw new HttpError(422, "USER_DISPLAY_NAME_REQUIRED", "USER_DISPLAY_NAME_REQUIRED");
  }
  if (!email) {
    throw new HttpError(422, "USER_EMAIL_INVALID", "USER_EMAIL_INVALID");
  }
  if (!roleCode) {
    throw new HttpError(422, "USER_ROLE_INVALID", "USER_ROLE_INVALID");
  }
  if (!INITIAL_ALLOWED_STATUSES.includes(initialStatus)) {
    throw new HttpError(400, "USER_STATUS_INVALID", "Invalid initial status");
  }

  await ensureUsernameAvailable(userId, username);
  assertPasswordPolicy(dto.password, { email, username });
  const passwordHash = await bcrypt.hash(dto.password, 12);
  const locale = dto.locale?.trim() || undefined;
  const preferredLang = dto.preferredLang?.trim() || undefined;

  try {
    await db.transaction(async (trx) => {
      await createUserRecord(
        {
          id: userId,
          username,
          displayName,
          locale,
          preferredLang,
          status: initialStatus,
          roleCode,
          passwordHash,
        },
        trx,
      );
      try {
        await upsertContact(
          userId,
          { type: "email", value: email, isPrimary: true, isRecovery: true },
          trx,
        );
      } catch (contactError) {
        if (isUniqueViolation(contactError)) {
          throw new HttpError(409, "USER_EMAIL_TAKEN", "USER_EMAIL_TAKEN");
        }
        throw contactError;
      }
      await insertStateHistory(userId, "status", null, initialStatus, trx);
    });
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "USER_USERNAME_TAKEN", "USER_USERNAME_TAKEN");
    }
    throw error;
  }

  await insertAudit({
    actorUserId,
    entity: "users",
    action: "create",
    entityId: userId,
    metadata: {
      status: initialStatus,
      role: roleCode,
    },
  });

  const created = await fetchUserWithContacts(userId);
  if (!created) {
    throw new HttpError(500, "USER_REFRESH_FAILED", "USER_REFRESH_FAILED");
  }
  return await toUserDetail(created.user, created.contacts, created.avatar);
}

export async function getMe(id: string): Promise<UserDetail | null> {
  const full = await fetchUserWithContacts(id);
  if (!full) {
    return null;
  }
  return await toUserDetail(full.user, full.contacts, full.avatar);
}

export async function listAll(limit = 50, offset = 0): Promise<UserSafe[]> {
  const rows = await listUserRows(limit, offset);
  return rows.map(toUserSafe);
}

export async function updateProfile(userId: string, dto: UpdateProfileDTO): Promise<UserDetail> {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "USER_NOT_FOUND");
  }

  const patch: UpdateProfileDTO = {};
  const changes: Record<string, { old: unknown; next: unknown }> = {};

  if (dto.username) {
    const normalized = dto.username.trim();
    ensureUsernameFormat(normalized);
    if (normalized.toLowerCase() !== user.username.toLowerCase()) {
      await ensureUsernameAvailable(userId, normalized);
      patch.username = normalized;
      changes.username = { old: user.username, next: normalized };
    }
  }

  if (dto.displayName && dto.displayName !== user.display_name) {
    patch.displayName = dto.displayName;
    changes.display_name = { old: user.display_name, next: dto.displayName };
  }

  if (dto.locale && dto.locale !== user.locale) {
    patch.locale = dto.locale;
    changes.locale = { old: user.locale, next: dto.locale };
  }

  if (dto.preferredLang && dto.preferredLang !== user.preferred_lang) {
    patch.preferredLang = dto.preferredLang;
    changes.preferred_lang = {
      old: user.preferred_lang,
      next: dto.preferredLang,
    };
  }

  const userWithPrefs = user as { default_visibility?: string; units?: string };
  if (dto.defaultVisibility && dto.defaultVisibility !== userWithPrefs.default_visibility) {
    patch.defaultVisibility = dto.defaultVisibility;
    changes.default_visibility = {
      old: userWithPrefs.default_visibility,
      next: dto.defaultVisibility,
    };
  }

  if (dto.units && dto.units !== userWithPrefs.units) {
    patch.units = dto.units;
    changes.units = {
      old: userWithPrefs.units,
      next: dto.units,
    };
  }

  // Handle alias update
  if (dto.alias !== undefined) {
    const normalizedAlias = dto.alias.trim();
    const profile = await getProfileByUserId(userId);
    const currentAlias = profile?.alias ?? null;

    if (normalizedAlias !== currentAlias) {
      // Check alias change rate limiting (max 1 per 30 days)
      const aliasChangeCheck = await canChangeAlias(userId);
      if (!aliasChangeCheck.allowed) {
        const daysRemaining = aliasChangeCheck.daysRemaining ?? 30;
        throw new HttpError(
          429,
          "E.ALIAS_CHANGE_RATE_LIMITED",
          `Alias can only be changed once per 30 days. Please try again in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
        );
      }

      // Check alias availability (case-insensitive)
      const isAvailable = await checkAliasAvailable(normalizedAlias, userId);
      if (!isAvailable) {
        // Genericize error message to prevent enumeration attacks
        // Add random delay (100-500ms) to prevent timing attacks
        const delay = Math.floor(Math.random() * 400) + 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
        throw new HttpError(
          409,
          "E.PROFILE_UPDATE_FAILED",
          "Profile update failed. Please try again.",
        );
      }
      changes.alias = { old: currentAlias, next: normalizedAlias };
    }
  }

  // Handle weight, fitness level, and training frequency updates
  const metricUpdates: {
    weight?: number;
    unit?: string;
    fitness_level_code?: string;
    training_frequency?: string;
  } = {};

  if (dto.weight !== undefined || dto.weightUnit !== undefined) {
    let weightInKg = dto.weight;
    if (dto.weight !== undefined && dto.weightUnit === "lb") {
      // Convert lb to kg
      weightInKg = dto.weight * 0.453592;
    }

    // Validate and round weight precision (max 2 decimal places)
    if (weightInKg !== undefined) {
      // Round to 2 decimal places
      weightInKg = Math.round(weightInKg * 100) / 100;

      // Validate precision (should not have more than 2 decimal places)
      if (weightInKg.toString().split(".")[1]?.length > 2) {
        throw new HttpError(400, "E.VALIDATION_ERROR", "Weight must have at most 2 decimal places");
      }
    }

    const latestMetrics = await getLatestUserMetrics(userId);
    const currentWeight = latestMetrics?.weight ?? null;
    if (weightInKg !== undefined && weightInKg !== currentWeight) {
      metricUpdates.weight = weightInKg;
      // If weight was converted from lb to kg, store unit as kg
      metricUpdates.unit = dto.weightUnit === "lb" ? "kg" : (dto.weightUnit ?? "kg");
      changes.weight = { old: currentWeight, next: weightInKg };
    }
  }

  if (dto.fitnessLevel !== undefined) {
    const latestMetrics = await getLatestUserMetrics(userId);
    const currentFitnessLevel = latestMetrics?.fitness_level_code ?? null;
    if (dto.fitnessLevel !== currentFitnessLevel) {
      metricUpdates.fitness_level_code = dto.fitnessLevel;
      changes.fitness_level = { old: currentFitnessLevel, next: dto.fitnessLevel };
    }
  }

  if (dto.trainingFrequency !== undefined) {
    const latestMetrics = await getLatestUserMetrics(userId);
    const currentTrainingFrequency = latestMetrics?.training_frequency ?? null;
    if (dto.trainingFrequency !== currentTrainingFrequency) {
      metricUpdates.training_frequency = dto.trainingFrequency;
      changes.training_frequency = { old: currentTrainingFrequency, next: dto.trainingFrequency };
    }
  }

  await db.transaction(async (trx) => {
    // Update user profile fields
    if (Object.keys(patch).length > 0) {
      await updateUserProfile(userId, patch, trx);
    }

    // Update alias in profiles table
    if (dto.alias !== undefined) {
      const normalizedAlias = dto.alias.trim();
      const profile = await getProfileByUserId(userId, trx);
      const currentAlias = profile?.alias ?? null;
      if (normalizedAlias !== currentAlias) {
        await updateProfileAlias(userId, normalizedAlias, trx);
      }
    }

    // Insert new user metric record if any metric fields are being updated
    if (Object.keys(metricUpdates).length > 0) {
      await insertUserMetric(userId, metricUpdates, trx);
    }

    // Record state history for all changes
    for (const [field, diff] of Object.entries(changes)) {
      await insertStateHistory(userId, field, diff.old, diff.next, trx);
    }
  });

  if (Object.keys(changes).length > 0) {
    await insertAudit({
      actorUserId: userId,
      entity: "users",
      action: "profile_update",
      entityId: userId,
      metadata: { changes },
    });
  }

  const updated = await fetchUserWithContacts(userId);
  if (!updated) {
    throw new HttpError(500, "USER_REFRESH_FAILED", "USER_REFRESH_FAILED");
  }
  return await toUserDetail(updated.user, updated.contacts, updated.avatar);
}

export async function updatePassword(userId: string, dto: ChangePasswordDTO): Promise<void> {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "USER_NOT_FOUND");
  }

  const ok = await bcrypt.compare(dto.currentPassword, user.password_hash);
  if (!ok) {
    throw new HttpError(401, "USER_INVALID_PASSWORD", "USER_INVALID_PASSWORD");
  }

  const contacts = await getUserContacts(userId);
  const email = primaryEmail(contacts) ?? undefined;

  assertPasswordPolicy(dto.newPassword, { email, username: user.username });
  const newHash = await bcrypt.hash(dto.newPassword, 12);
  await changePassword(userId, newHash);
  await revokeRefreshByUserId(userId);
  await insertAudit({
    actorUserId: userId,
    entity: "users",
    action: "password_change",
    entityId: userId,
    metadata: { rotatedSessions: true },
  });
}

export async function changeStatus(
  actorUserId: string | null,
  userId: string,
  nextStatus: UserStatus,
): Promise<UserDetail> {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "USER_NOT_FOUND");
  }
  if (user.status === nextStatus) {
    const full = await fetchUserWithContacts(userId);
    if (!full) {
      throw new HttpError(500, "USER_REFRESH_FAILED", "USER_REFRESH_FAILED");
    }
    return await toUserDetail(full.user, full.contacts, full.avatar);
  }
  assertStatusTransition(user.status, nextStatus);

  await db.transaction(async (trx) => {
    await setUserStatus(userId, nextStatus, trx);
    await insertStateHistory(userId, "status", user.status, nextStatus, trx);
  });

  await insertAudit({
    actorUserId,
    entity: "users",
    action: "status_change",
    entityId: userId,
    metadata: { from: user.status, to: nextStatus },
  });

  if (nextStatus !== "active") {
    await revokeRefreshByUserId(userId);
  }

  const refreshed = await fetchUserWithContacts(userId);
  if (!refreshed) {
    throw new HttpError(500, "USER_REFRESH_FAILED", "USER_REFRESH_FAILED");
  }
  return toUserDetail(refreshed.user, refreshed.contacts, refreshed.avatar);
}

export async function requestAccountDeletion(
  userId: string,
  password: string,
): Promise<DeleteSchedule> {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "USER_NOT_FOUND");
  }

  // SECURITY: Verify password before allowing account deletion
  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    throw new HttpError(401, "USER_INVALID_PASSWORD", "Invalid password");
  }

  if (user.status !== "pending_deletion") {
    await changeStatus(userId, userId, "pending_deletion");
    await revokeRefreshByUserId(userId);
    await insertAudit({
      actorUserId: userId,
      entity: "users",
      action: "delete_request",
      entityId: userId,
      metadata: {},
    });
  }

  const schedule = await scheduleAccountDeletion(userId);
  return schedule;
}

export async function listContacts(userId: string): Promise<UserContact[]> {
  const contacts = await getUserContacts(userId);
  return contacts.map(toContact);
}

export async function requestContactVerification(
  userId: string,
  contactId: string,
): Promise<{ token: string; expiresAt: string }> {
  const contact = await getContactById(contactId);
  if (!contact || contact.user_id !== userId) {
    throw new HttpError(404, "USER_CONTACT_NOT_FOUND", "USER_CONTACT_NOT_FOUND");
  }
  if (contact.is_verified) {
    throw new HttpError(409, "USER_CONTACT_ALREADY_VERIFIED", "USER_CONTACT_ALREADY_VERIFIED");
  }

  const now = Date.now();
  const tokenType = contactTokenType(contactId);
  const windowStart = new Date(now - CONTACT_VERIFICATION_RESEND_WINDOW_MS);
  const recentAttempts = await countAuthTokensSince(userId, tokenType, windowStart);
  if (recentAttempts >= CONTACT_VERIFICATION_RESEND_LIMIT) {
    throw new HttpError(
      429,
      "USER_CONTACT_VERIFY_LIMIT",
      "Verification request limit reached. Try again later.",
    );
  }

  const retentionCutoff = new Date(now - CONTACT_VERIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await purgeAuthTokensOlderThan(tokenType, retentionCutoff);
  await markAuthTokensConsumed(userId, tokenType);

  const { raw, hash } = generateContactToken();
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(now + CONTACT_VERIFICATION_TTL_SEC * 1000).toISOString();

  await createAuthToken({
    id: crypto.randomUUID(),
    user_id: userId,
    token_type: tokenType,
    token_hash: hash,
    created_at: createdAt,
    expires_at: expiresAt,
  });

  await insertAudit({
    actorUserId: userId,
    entity: "user_contacts",
    action: "verification_token_requested",
    entityId: contactId,
    metadata: { type: contact.type },
  });

  return { token: raw, expiresAt };
}

export async function updatePrimaryEmail(userId: string, email: string): Promise<UserDetail> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    throw new HttpError(422, "USER_EMAIL_INVALID", "USER_EMAIL_INVALID");
  }

  try {
    await upsertContact(userId, {
      type: "email",
      value: trimmed,
      isPrimary: true,
      isRecovery: true,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "USER_EMAIL_TAKEN", "USER_EMAIL_TAKEN");
    }
    throw error;
  }

  await insertAudit({
    actorUserId: userId,
    entity: "user_contacts",
    action: "email_upsert",
    entityId: userId,
    metadata: { email: trimmed },
  });

  const refreshed = await fetchUserWithContacts(userId);
  if (!refreshed) {
    throw new HttpError(500, "USER_REFRESH_FAILED", "USER_REFRESH_FAILED");
  }
  return toUserDetail(refreshed.user, refreshed.contacts, refreshed.avatar);
}

export async function updatePhoneNumber(
  userId: string,
  phone: string,
  isRecovery = true,
): Promise<UserDetail> {
  const trimmed = phone.trim();
  if (!trimmed) {
    throw new HttpError(422, "USER_PHONE_INVALID", "USER_PHONE_INVALID");
  }

  try {
    await upsertContact(userId, {
      type: "phone",
      value: trimmed,
      isPrimary: false,
      isRecovery,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "USER_PHONE_TAKEN", "USER_PHONE_TAKEN");
    }
    throw error;
  }

  await insertAudit({
    actorUserId: userId,
    entity: "user_contacts",
    action: "phone_upsert",
    entityId: userId,
    metadata: { phone: trimmed, isRecovery },
  });

  const refreshed = await fetchUserWithContacts(userId);
  if (!refreshed) {
    throw new HttpError(500, "USER_REFRESH_FAILED", "USER_REFRESH_FAILED");
  }
  return toUserDetail(refreshed.user, refreshed.contacts, refreshed.avatar);
}

export async function verifyContact(
  userId: string,
  contactId: string,
  token: string,
): Promise<UserContact> {
  const contact = await getContactById(contactId);
  if (!contact || contact.user_id !== userId) {
    throw new HttpError(404, "USER_CONTACT_NOT_FOUND", "USER_CONTACT_NOT_FOUND");
  }

  if (contact.is_verified) {
    return toContact(contact);
  }

  const trimmedToken = token?.trim();
  if (!trimmedToken) {
    throw new HttpError(400, "USER_CONTACT_TOKEN_REQUIRED", "USER_CONTACT_TOKEN_REQUIRED");
  }

  const tokenType = contactTokenType(contactId);
  const tokenHash = crypto.createHash("sha256").update(trimmedToken).digest("hex");
  const record = await findAuthToken(tokenType, tokenHash);
  if (!record || record.user_id !== userId) {
    throw new HttpError(400, "USER_CONTACT_TOKEN_INVALID", "USER_CONTACT_TOKEN_INVALID");
  }

  if (new Date(record.expires_at).getTime() <= Date.now()) {
    await consumeAuthToken(record.id);
    throw new HttpError(400, "USER_CONTACT_TOKEN_EXPIRED", "USER_CONTACT_TOKEN_EXPIRED");
  }

  await markContactVerified(contactId);
  await consumeAuthToken(record.id);
  await markAuthTokensConsumed(userId, tokenType);

  await insertAudit({
    actorUserId: userId,
    entity: "user_contacts",
    action: "contact_verify",
    entityId: contactId,
    metadata: { type: contact.type },
  });

  const refreshed = await getContactById(contactId);
  if (!refreshed) {
    throw new HttpError(500, "USER_CONTACT_REFRESH_FAILED", "USER_CONTACT_REFRESH_FAILED");
  }
  return toContact(refreshed);
}

export async function removeContact(userId: string, contactId: string): Promise<void> {
  const contact = await getContactById(contactId);
  if (!contact || contact.user_id !== userId) {
    throw new HttpError(404, "USER_CONTACT_NOT_FOUND", "USER_CONTACT_NOT_FOUND");
  }
  if (contact.type === "email" && contact.is_primary) {
    throw new HttpError(400, "USER_CONTACT_REMOVE_PRIMARY", "USER_CONTACT_REMOVE_PRIMARY");
  }
  await deleteContact(userId, contactId);
  await insertAudit({
    actorUserId: userId,
    entity: "user_contacts",
    action: "contact_remove",
    entityId: contactId,
    metadata: { type: contact.type },
  });
}

export async function collectUserData(userId: string): Promise<UserDataExportBundle> {
  const user = await db<UserRow>("users").where({ id: userId }).first<UserRow>();
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "USER_NOT_FOUND");
  }

  const contacts = await db<ContactRow>("user_contacts").where({ user_id: userId });
  const profileRow = await db<ProfileRow>("profiles")
    .where({ user_id: userId })
    .first<ProfileRow>();
  const profile = profileRow
    ? {
        user_id: profileRow.user_id,
        alias: profileRow.alias,
        bio: profileRow.bio,
        avatar_asset_id: profileRow.avatar_asset_id,
        date_of_birth: profileRow.date_of_birth,
        gender_code: profileRow.gender_code,
        visibility: profileRow.visibility,
        timezone: profileRow.timezone,
        unit_preferences: profileRow.unit_preferences,
        created_at: profileRow.created_at,
        updated_at: profileRow.updated_at,
      }
    : null;

  const metrics = await db<UserMetricRow>("user_metrics")
    .where({ user_id: userId })
    .orderBy("recorded_at", "asc");

  // Parallelize independent queries for better performance
  const [sessions, plans, exercises, pointsHistory, badges, followers, following] =
    await Promise.all([
      db<SessionRow>("sessions").where({ owner_id: userId }),
      db<GenericRow>("plans").where({ user_id: userId }),
      db<GenericRow>("exercises").where({ owner_id: userId }),
      db<UserPointRow>("user_points").where({ user_id: userId }).orderBy("awarded_at", "asc"),
      db<BadgeRow>("badges").where({ user_id: userId }).orderBy("awarded_at", "asc"),
      db<GenericRow>("followers").where({ following_id: userId }).orderBy("created_at", "asc"),
      db<GenericRow>("followers").where({ follower_id: userId }).orderBy("created_at", "asc"),
    ]);

  const sessionIds = sessions.map((session) => session.id);
  const totalPoints = pointsHistory.reduce((sum, record) => sum + Number(record.points ?? 0), 0);

  // These queries depend on sessionIds, so run them in parallel after sessions are loaded
  const [sessionExercises, exerciseSets] = await Promise.all([
    sessionIds.length
      ? db<SessionExerciseRow>("session_exercises").whereIn("session_id", sessionIds)
      : Promise.resolve([]),
    sessionIds.length
      ? db<GenericRow>("exercise_sets").whereIn("session_id", sessionIds)
      : Promise.resolve([]),
  ]);

  const mediaRows = await db<MediaRow>("media")
    .where({ owner_id: userId })
    .orderBy("created_at", "asc");
  const media = mediaRows.map((row) => ({
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    storageKey: row.storage_key,
    fileUrl: row.file_url,
    mimeType: row.mime_type,
    mediaType: row.media_type,
    bytes: row.bytes ?? null,
    createdAt: row.created_at,
  }));

  const stateHistory = await db<UserStateHistoryRow>("user_state_history")
    .where({ user_id: userId })
    .orderBy("changed_at", "asc");

  const userRecord: Record<string, unknown> = { ...user };
  delete userRecord.password_hash;
  if (!("primary_email" in userRecord)) {
    const primaryContact = contacts.find(
      (contact) => contact.type === "email" && contact.is_primary,
    );
    if (primaryContact) {
      userRecord.primary_email = primaryContact.value;
    }
  }

  const recordCounts: Record<string, number> = {
    contacts: contacts.length,
    sessions: sessions.length,
    sessionExercises: sessionExercises.length,
    sessionSets: exerciseSets.length,
    plans: plans.length,
    personalExercises: exercises.length,
    metrics: metrics.length,
    pointsHistory: pointsHistory.length,
    badges: badges.length,
    media: media.length,
    followers: followers.length,
    following: following.length,
    stateHistory: stateHistory.length,
  };

  return {
    meta: {
      schemaVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      recordCounts,
    },
    user: { ...userRecord },
    profile,
    contacts: contacts.map((contact) => ({ ...contact })),
    metrics: metrics.map((metric) => ({ ...metric })),
    social: {
      followers,
      following,
    },
    exercises: {
      personal: exercises,
      plans,
    },
    sessions: {
      items: sessions,
      exercises: sessionExercises,
      sets: exerciseSets,
    },
    points: {
      total: totalPoints,
      history: pointsHistory,
    },
    badges,
    media,
    stateHistory,
  };
}
