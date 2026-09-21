import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "../../db/connection.js";
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
  getProfileByUserId,
  checkAliasAvailable,
  updateProfileAlias,
  updateProfileBio,
  canChangeAlias,
  insertUserMetric,
  getLatestUserMetrics,
} from "./users.repository.js";
import type {
  UpdateProfileDTO,
  ChangePasswordDTO,
  CreateUserDTO,
  UserSafe,
  UserDetail,
  UserStatus,
} from "./users.types.js";
import { revokeRefreshByUserId } from "../auth/auth.repository.js";
import { assertPasswordPolicy } from "../auth/passwordPolicy.js";
import { HttpError } from "../../utils/http.js";
import { insertAudit } from "../common/audit.util.js";
import { primaryEmail, toUserDetail, toUserSafe } from "./users.mapping.js";
import {
  scheduleAccountDeletion,
  executeAccountDeletion,
  processDueAccountDeletions,
  type DeleteSchedule,
} from "./dsr.service.js";

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,50}$/;
const STATUS_TRANSITIONS: Record<UserStatus, UserStatus[]> = {
  pending_verification: ["active", "suspended", "banned", "pending_deletion"],
  active: ["suspended", "banned", "pending_deletion"],
  suspended: ["active", "banned", "pending_deletion"],
  banned: ["active", "suspended", "pending_deletion"],
  pending_deletion: [],
  deleted: [],
};
const INITIAL_ALLOWED_STATUSES: UserStatus[] = ["pending_verification", "active", "suspended"];

export { executeAccountDeletion, processDueAccountDeletions };

async function ensureUsernameAvailable(userId: string, username: string) {
  const available = await checkAliasAvailable(username, userId);
  if (!available) {
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
          displayName,
          locale,
          preferredLang,
          status: initialStatus,
          roleCode,
          passwordHash,
        },
        trx,
      );
      await updateProfileAlias(userId, username, trx);
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
    entityType: "users",
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
    if (normalized.toLowerCase() !== (user.username ?? "").toLowerCase()) {
      await ensureUsernameAvailable(userId, normalized);
      patch.alias = normalized;
      changes.alias = { old: user.username, next: normalized };
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

  if (dto.bio !== undefined) {
    const profile = await getProfileByUserId(userId);
    const currentBio = profile?.bio ?? null;
    if (dto.bio !== currentBio) {
      patch.bio = dto.bio;
      changes.bio = { old: currentBio, next: dto.bio };
    }
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

  if (dto.bio !== undefined) {
    const profile = await getProfileByUserId(userId);
    const currentBio = profile?.bio ?? null;
    if (dto.bio !== currentBio) {
      patch.bio = dto.bio;
      changes.bio = { old: currentBio, next: dto.bio };
    }
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

    if (patch.bio !== undefined) {
      await updateProfileBio(userId, patch.bio, trx);
    }

    // Update alias in profiles table
    const nextAlias = dto.alias ?? patch.alias;
    if (nextAlias !== undefined) {
      const normalizedAlias = nextAlias.trim();
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
      await insertStateHistory(userId, field, diff.old, diff.next, trx, userId, null);
    }
  });

  if (Object.keys(changes).length > 0) {
    await insertAudit({
      actorUserId: userId,
      entityType: "users",
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
    entityType: "users",
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
    entityType: "users",
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
      entityType: "users",
      action: "delete_request",
      entityId: userId,
      metadata: {},
    });
  }

  const schedule = await scheduleAccountDeletion(userId);
  return schedule;
}

export {
  listContacts,
  requestContactVerification,
  updatePrimaryEmail,
  updatePhoneNumber,
  verifyContact,
  removeContact,
} from "./users.contacts.service.js";
export { collectUserData } from "./users.export.service.js";
export { getPrivacySettings, updatePrivacySettings } from "./users.privacy.service.js";
