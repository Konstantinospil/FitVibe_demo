import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import db from "../../db/index.js";
import { is2FAEnabled, verify2FACode } from "./twofa.service.js";
import { normalizeAuthTiming } from "./timing.utils.js";
import {
  createPending2FASession,
  getPending2FASession,
  markPending2FASessionVerified,
  deletePending2FASession,
} from "./pending-2fa.repository.js";
import {
  findUserByEmail,
  findUserByUsername,
  insertRefreshToken,
  getRefreshByHash,
  revokeRefreshByHash,
  findUserById,
  createUser,
  createAuthToken,
  findAuthToken,
  consumeAuthToken,
  revokeRefreshByUserId,
  revokeRefreshByUserExceptSession,
  updateUserStatus,
  updateUserPassword,
  markAuthTokensConsumed,
  countAuthTokensSince,
  purgeAuthTokensOlderThan,
  revokeRefreshBySession,
  findRefreshTokenRaw,
  createAuthSession,
  findSessionById,
  listSessionsByUserId,
  updateSession,
  revokeSessionById,
  revokeSessionsByUserId,
  markEmailVerified,
} from "./auth.repository.js";
import type {
  JwtPayload,
  LoginDTO,
  LoginContext,
  RefreshTokenPayload,
  RegisterDTO,
  SessionRevokeOptions,
  SessionView,
  SessionRecord,
  TokenPair,
  UserSafe,
} from "./auth.types.js";
import type { AuthUserRecord } from "./auth.repository.js";
import { env, RSA_KEYS } from "../../config/env.js";
import { getCurrentTermsVersion, isTermsVersionOutdated } from "../../config/terms.js";
import {
  getCurrentPrivacyPolicyVersion,
  isPrivacyPolicyVersionOutdated,
} from "../../config/privacy.js";
import { HttpError } from "../../utils/http.js";
import { assertPasswordPolicy } from "./passwordPolicy.js";
import { incrementRefreshReuse } from "../../observability/metrics.js";
import { mailerService } from "../../services/mailer.service.js";
import {
  generateVerificationEmailHtml,
  generateVerificationEmailText,
  generateResendVerificationEmailHtml,
  generateResendVerificationEmailText,
  getEmailTranslations,
} from "../../services/i18n.service.js";
import {
  getFailedAttempt,
  recordFailedAttempt,
  resetFailedAttempts,
  isAccountLocked,
  getRemainingLockoutSeconds,
  getRemainingAccountAttempts,
  getMaxAccountAttempts,
  getFailedAttemptByIP,
  recordFailedAttemptByIP,
  resetFailedAttemptsByIP,
  isIPLocked,
  getRemainingIPLockoutSeconds,
  getRemainingIPAttempts,
  getMaxIPAttempts,
  getMaxIPDistinctEmails,
} from "./bruteforce.repository.js";
import { logger } from "../../config/logger.js";

const ACCESS_TTL = env.ACCESS_TOKEN_TTL;
const REFRESH_TTL = env.REFRESH_TOKEN_TTL;
const EMAIL_VERIFICATION_TTL = env.EMAIL_VERIFICATION_TTL_SEC;
const PASSWORD_RESET_TTL = env.PASSWORD_RESET_TTL_SEC;
const TOKEN_RETENTION_DAYS = 7;
const RESEND_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_RESEND_LIMIT = 3;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("fitvibe-placeholder-password", 12);

const TOKEN_TYPES = {
  EMAIL_VERIFICATION: "email_verification",
  PASSWORD_RESET: "password_reset",
} as const;

const SESSION_EXPIRY_MS = REFRESH_TTL * 1000;

function asError(err: unknown): Error {
  return err instanceof Error
    ? err
    : new Error(typeof err === "string" ? err : JSON.stringify(err));
}

function nextSessionExpiry(): string {
  return new Date(Date.now() + SESSION_EXPIRY_MS).toISOString();
}

function sanitizeUserAgent(userAgent?: string | null): string | null {
  if (!userAgent) {
    return null;
  }
  return userAgent.length > 512 ? userAgent.slice(0, 512) : userAgent;
}

/**
 * Validates if a string is a valid UUID format
 */
function isValidUUID(str: string | null): boolean {
  if (!str) {
    return false;
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

async function recordAuditEvent(
  userId: string | null,
  action: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    // Validate userId is a valid UUID or null
    // Test IDs like "user-123" are not valid UUIDs and will cause database errors
    const validUserId = userId && isValidUUID(userId) ? userId : null;

    await db("audit_log").insert({
      id: uuidv4(),
      actor_user_id: validUserId,
      action,
      entity_type: "auth",
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const err = asError(error);
    logger.error({ err, action }, "[audit] failed to record audit event");
  }
}

function signAccess(payload: Omit<JwtPayload, "iat" | "exp" | "jti">) {
  return jwt.sign(payload, RSA_KEYS.privateKey, {
    algorithm: "RS256",
    expiresIn: ACCESS_TTL,
    jwtid: uuidv4(),
  });
}

function signRefresh(payload: Pick<RefreshTokenPayload, "sub" | "sid">) {
  return jwt.sign({ sub: payload.sub, sid: payload.sid, typ: "refresh" }, RSA_KEYS.privateKey, {
    algorithm: "RS256",
    expiresIn: REFRESH_TTL,
    jwtid: uuidv4(),
  });
}

function generateToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

async function issueAuthToken(userId: string, type: string, ttlSeconds: number) {
  const now = Date.now();
  const retentionCutoff = new Date(now - TOKEN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await purgeAuthTokensOlderThan(type, retentionCutoff);

  if (type === TOKEN_TYPES.EMAIL_VERIFICATION) {
    const windowStart = new Date(now - RESEND_WINDOW_MS);
    const recentAttempts = await countAuthTokensSince(userId, type, windowStart);
    if (recentAttempts >= EMAIL_VERIFICATION_RESEND_LIMIT) {
      throw new HttpError(429, "AUTH_TOO_MANY_REQUESTS", "AUTH_TOO_MANY_REQUESTS");
    }
  }

  await markAuthTokensConsumed(userId, type);
  const { raw, hash } = generateToken();
  const issuedAtIso = new Date(now).toISOString();
  const expires_at = new Date(now + ttlSeconds * 1000).toISOString();
  await createAuthToken({
    id: uuidv4(),
    user_id: userId,
    token_type: type,
    token_hash: hash,
    expires_at,
    created_at: issuedAtIso,
  });
  return raw;
}

function toSafeUser(record: AuthUserRecord): UserSafe {
  return {
    id: record.id,
    email: record.primary_email ?? "",
    username: record.username,
    role: record.role_code,
    status: record.status,
    created_at: record.created_at,
  };
}

function isForeignKeyViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" && maybeCode === "23503";
}

export async function register(
  dto: RegisterDTO,
): Promise<{ verificationToken?: string; user?: UserSafe }> {
  // Start timing for enumeration protection (AC-1.12)
  const startTime = Date.now();

  try {
    const email = dto.email.toLowerCase();
    const username = dto.username.trim();
    assertPasswordPolicy(dto.password, { email, username });
    const existingByEmail = await findUserByEmail(email);
    const existingByUsername = await findUserByUsername(username);

    if (existingByEmail || existingByUsername) {
      if (existingByEmail && existingByEmail.status === "pending_verification") {
        const token = await issueAuthToken(
          existingByEmail.id,
          TOKEN_TYPES.EMAIL_VERIFICATION,
          EMAIL_VERIFICATION_TTL,
        );

        // Resend verification email
        if (env.email.enabled) {
          try {
            const verificationUrl = `${env.frontendUrl}/verify?token=${token}`;
            const expiresInMinutes = Math.floor(EMAIL_VERIFICATION_TTL / 60);
            const locale = existingByEmail.locale;
            const t = getEmailTranslations(locale);

            await mailerService.send({
              to: email,
              subject: t.resend.subject,
              html: generateResendVerificationEmailHtml(verificationUrl, expiresInMinutes, locale),
              text: generateResendVerificationEmailText(verificationUrl, expiresInMinutes, locale),
            });
          } catch (emailError) {
            // Log error but don't fail registration - user still gets token in response
            logger.error(
              { err: emailError, userId: existingByEmail.id, email },
              "[auth] Failed to send verification email during registration resend",
            );
          }
        }

        return { verificationToken: token, user: toSafeUser(existingByEmail) };
      }
      throw new HttpError(409, "AUTH_CONFLICT", "AUTH_CONFLICT");
    }

    // Validate terms acceptance
    if (!dto.terms_accepted) {
      throw new HttpError(400, "TERMS_ACCEPTANCE_REQUIRED", "TERMS_ACCEPTANCE_REQUIRED");
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(dto.password, 12);
    const now = new Date().toISOString();
    const termsVersion = getCurrentTermsVersion();

    try {
      await createUser({
        id,
        username,
        display_name: dto.profile?.display_name ?? username,
        status: "pending_verification",
        role_code: "athlete",
        password_hash,
        primaryEmail: email,
        terms_accepted: true,
        terms_accepted_at: now,
        terms_version: termsVersion,
      });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new HttpError(
          500,
          "DATABASE_CONFIGURATION_ERROR",
          "Database configuration error: required data is missing. Please contact support.",
        );
      }
      throw error;
    }

    const verificationToken = await issueAuthToken(
      id,
      TOKEN_TYPES.EMAIL_VERIFICATION,
      EMAIL_VERIFICATION_TTL,
    );

    // Send verification email
    if (env.email.enabled) {
      try {
        const verificationUrl = `${env.frontendUrl}/verify?token=${verificationToken}`;
        const expiresInMinutes = Math.floor(EMAIL_VERIFICATION_TTL / 60);

        // Get user's locale if available (for new users, use default)
        const user = await findUserById(id);
        const locale = user?.locale;
        const t = getEmailTranslations(locale);

        await mailerService.send({
          to: email,
          subject: t.verification.subject,
          html: generateVerificationEmailHtml(verificationUrl, expiresInMinutes, locale),
          text: generateVerificationEmailText(verificationUrl, expiresInMinutes, locale),
        });
      } catch (emailError) {
        // Log error but don't fail registration - user still gets token in response (for dev)
        logger.error(
          { err: emailError, userId: id, email },
          "[auth] Failed to send verification email during registration",
        );
      }
    }

    const user = await findUserById(id);
    return { verificationToken, user: user ? toSafeUser(user) : undefined };
  } finally {
    // Normalize timing to prevent user enumeration (AC-1.12)
    await normalizeAuthTiming(startTime);
  }
}

export async function resendVerificationEmail(email: string): Promise<void> {
  // Start timing for enumeration protection (AC-1.12)
  const startTime = Date.now();

  try {
    const normalizedEmail = email.toLowerCase();
    const user = await findUserByEmail(normalizedEmail);

    // Always return success to prevent user enumeration
    // Only send email if user exists and is pending verification
    if (user && user.status === "pending_verification") {
      // Check rate limiting (3 per hour per user)
      const token = await issueAuthToken(
        user.id,
        TOKEN_TYPES.EMAIL_VERIFICATION,
        EMAIL_VERIFICATION_TTL,
      );

      // Send verification email
      if (env.email.enabled) {
        try {
          const verificationUrl = `${env.frontendUrl}/verify?token=${token}`;
          const expiresInMinutes = Math.floor(EMAIL_VERIFICATION_TTL / 60);
          const locale = user.locale;
          const t = getEmailTranslations(locale);

          await mailerService.send({
            to: normalizedEmail,
            subject: t.resend.subject,
            html: generateResendVerificationEmailHtml(verificationUrl, expiresInMinutes, locale),
            text: generateResendVerificationEmailText(verificationUrl, expiresInMinutes, locale),
          });
        } catch (emailError) {
          // Log error but don't fail - function always returns success to prevent user enumeration
          logger.error(
            { err: emailError, userId: user.id, email: normalizedEmail },
            "[auth] Failed to send verification email during resend",
          );
        }
      }
    }

    // Always return success to prevent user enumeration
    // The actual email sending happens asynchronously if conditions are met
  } finally {
    // Normalize timing to prevent user enumeration (AC-1.12)
    await normalizeAuthTiming(startTime);
  }
}

export async function verifyEmail(token: string): Promise<UserSafe> {
  // Start timing for enumeration protection (AC-1.12)
  const startTime = Date.now();

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const record = await findAuthToken(TOKEN_TYPES.EMAIL_VERIFICATION, tokenHash);
    if (!record) {
      throw new HttpError(400, "AUTH_INVALID_TOKEN", "AUTH_INVALID_TOKEN");
    }
    if (new Date(record.expires_at).getTime() <= Date.now()) {
      await consumeAuthToken(record.id);
      throw new HttpError(410, "AUTH_TOKEN_EXPIRED", "AUTH_TOKEN_EXPIRED");
    }

    await consumeAuthToken(record.id);
    await updateUserStatus(record.user_id, "active");
    await markAuthTokensConsumed(record.user_id, TOKEN_TYPES.EMAIL_VERIFICATION);

    const user = await findUserById(record.user_id);
    if (!user) {
      throw new HttpError(404, "AUTH_USER_NOT_FOUND", "AUTH_USER_NOT_FOUND");
    }

    // Mark email as verified
    if (user.primary_email) {
      await markEmailVerified(record.user_id, user.primary_email);
    }

    return toSafeUser(user);
  } finally {
    // Normalize timing to prevent user enumeration (AC-1.12)
    await normalizeAuthTiming(startTime);
  }
}

export async function login(
  dto: LoginDTO,
  context: LoginContext = {},
): Promise<
  | {
      requires2FA: false;
      user: UserSafe;
      tokens: TokenPair;
      session: { id: string; expiresAt: string };
      termsOutdated?: boolean;
      privacyPolicyOutdated?: boolean;
    }
  | {
      requires2FA: true;
      pendingSessionId: string;
    }
> {
  // Start timing for enumeration protection (AC-1.12)
  const startTime = Date.now();

  const identifier = dto.email.toLowerCase();
  const ipAddress = context.ip ?? "unknown";
  const userAgent = sanitizeUserAgent(context.userAgent);

  try {
    // Check for IP-based brute force lockout (prevents cross-email enumeration attacks)
    const ipFailedAttempt = await getFailedAttemptByIP(ipAddress);
    if (isIPLocked(ipFailedAttempt)) {
      const remainingSeconds = getRemainingIPLockoutSeconds(ipFailedAttempt);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);

      await recordAuditEvent(null, "auth.login_blocked_ip", {
        ip: ipAddress,
        remainingSeconds,
        totalAttemptCount: ipFailedAttempt?.total_attempt_count ?? 0,
        distinctEmailCount: ipFailedAttempt?.distinct_email_count ?? 0,
        requestId: context.requestId ?? null,
      });

      throw new HttpError(
        429,
        "AUTH_IP_LOCKED",
        `IP address temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`,
        {
          remainingSeconds,
          lockoutType: "ip",
          totalAttemptCount: ipFailedAttempt?.total_attempt_count ?? 0,
          distinctEmailCount: ipFailedAttempt?.distinct_email_count ?? 0,
          maxAttempts: getMaxIPAttempts(),
          maxDistinctEmails: getMaxIPDistinctEmails(),
        },
      );
    }

    // Check for account-level brute force lockout
    const failedAttempt = await getFailedAttempt(identifier, ipAddress);
    if (isAccountLocked(failedAttempt)) {
      const remainingSeconds = getRemainingLockoutSeconds(failedAttempt);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);

      await recordAuditEvent(null, "auth.login_blocked", {
        identifier,
        ip: ipAddress,
        remainingSeconds,
        attemptCount: failedAttempt?.attempt_count ?? 0,
        requestId: context.requestId ?? null,
      });

      throw new HttpError(
        429,
        "AUTH_ACCOUNT_LOCKED",
        `Account temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`,
        {
          remainingSeconds,
          lockoutType: "account",
          attemptCount: failedAttempt?.attempt_count ?? 0,
          maxAttempts: getMaxAccountAttempts(),
        },
      );
    }

    const user = await findUserByEmail(identifier);
    if (!user || user.status !== "active") {
      await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH);

      // Perform dummy operations to match timing of valid user path (AC-1.12)
      // This prevents timing-based user enumeration
      const dummySessionId = uuidv4();
      const dummyUserId = uuidv4();

      // Dummy JWT signing operations (same as valid path)
      const dummyRefresh = signRefresh({ sub: dummyUserId, sid: dummySessionId });
      crypto.createHash("sha256").update(dummyRefresh).digest("hex");
      signAccess({ sub: dummyUserId, role: "athlete", sid: dummySessionId });

      // Record failed attempt (even for non-existent users to prevent enumeration)
      const accountAttempt = await recordFailedAttempt(identifier, ipAddress, userAgent);
      // Also record IP-based attempt
      const ipAttempt = await recordFailedAttemptByIP(ipAddress, identifier);

      // Check if we should warn about approaching lockout
      const remainingAccountAttempts = getRemainingAccountAttempts(accountAttempt);
      const remainingIPAttempts = getRemainingIPAttempts(ipAttempt);
      const minRemaining = Math.min(
        remainingAccountAttempts,
        remainingIPAttempts.remainingAttempts,
        remainingIPAttempts.remainingDistinctEmails,
      );

      // Include warning in error details if within 3 attempts of lockout
      const errorDetails: Record<string, unknown> = {};
      if (minRemaining <= 3 && minRemaining > 0) {
        errorDetails.warning = true;
        errorDetails.remainingAccountAttempts = remainingAccountAttempts;
        errorDetails.remainingIPAttempts = remainingIPAttempts.remainingAttempts;
        errorDetails.remainingIPDistinctEmails = remainingIPAttempts.remainingDistinctEmails;
        errorDetails.accountAttemptCount = accountAttempt.attempt_count;
        errorDetails.ipTotalAttemptCount = ipAttempt.total_attempt_count;
        errorDetails.ipDistinctEmailCount = ipAttempt.distinct_email_count;
      }

      throw new HttpError(
        401,
        "AUTH_INVALID_CREDENTIALS",
        "AUTH_INVALID_CREDENTIALS",
        Object.keys(errorDetails).length > 0 ? errorDetails : undefined,
      );
    }

    const ok = await bcrypt.compare(dto.password, user.password_hash);
    if (!ok) {
      // Perform dummy operations to match timing of valid user path (AC-1.12)
      const dummySessionId = uuidv4();
      const dummyRefresh = signRefresh({ sub: user.id, sid: dummySessionId });
      crypto.createHash("sha256").update(dummyRefresh).digest("hex");
      signAccess({ sub: user.id, role: user.role_code, sid: dummySessionId });

      // Record failed attempt
      const attempt = await recordFailedAttempt(identifier, ipAddress, userAgent);
      // Also record IP-based attempt
      const ipAttempt = await recordFailedAttemptByIP(ipAddress, identifier);

      await recordAuditEvent(user.id, "auth.login_failed", {
        ip: ipAddress,
        attemptCount: attempt.attempt_count,
        lockedUntil: attempt.locked_until,
        requestId: context.requestId ?? null,
      });

      // Check if we should warn about approaching lockout
      const remainingAccountAttempts = getRemainingAccountAttempts(attempt);
      const remainingIPAttempts = getRemainingIPAttempts(ipAttempt);
      const minRemaining = Math.min(
        remainingAccountAttempts,
        remainingIPAttempts.remainingAttempts,
        remainingIPAttempts.remainingDistinctEmails,
      );

      // Include warning in error details if within 3 attempts of lockout
      const errorDetails: Record<string, unknown> = {};
      if (minRemaining <= 3 && minRemaining > 0) {
        errorDetails.warning = true;
        errorDetails.remainingAccountAttempts = remainingAccountAttempts;
        errorDetails.remainingIPAttempts = remainingIPAttempts.remainingAttempts;
        errorDetails.remainingIPDistinctEmails = remainingIPAttempts.remainingDistinctEmails;
        errorDetails.accountAttemptCount = attempt.attempt_count;
        errorDetails.ipTotalAttemptCount = ipAttempt.total_attempt_count;
        errorDetails.ipDistinctEmailCount = ipAttempt.distinct_email_count;
      }

      throw new HttpError(
        401,
        "AUTH_INVALID_CREDENTIALS",
        "AUTH_INVALID_CREDENTIALS",
        Object.keys(errorDetails).length > 0 ? errorDetails : undefined,
      );
    }

    // Successful password authentication - reset failed attempts
    await resetFailedAttempts(identifier, ipAddress);
    // Also reset IP-based attempts (legitimate user from this IP)
    await resetFailedAttemptsByIP(ipAddress);

    // Check if user has 2FA enabled
    const has2FA = await is2FAEnabled(user.id);
    if (has2FA) {
      // Create pending 2FA session (expires in 5 minutes)
      const pendingSessionId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

      await createPending2FASession({
        id: pendingSessionId,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        ip: context.ip ?? null,
        user_agent: sanitizeUserAgent(context.userAgent),
      });

      await recordAuditEvent(user.id, "auth.login_2fa_required", {
        pendingSessionId,
        ip: ipAddress,
        requestId: context.requestId ?? null,
      });

      // Return 2FA requirement
      return {
        requires2FA: true,
        pendingSessionId,
      };
    }

    // No 2FA required - issue tokens immediately
    const sessionId = uuidv4();
    const issuedAtIso = new Date().toISOString();
    const sessionExpiresAt = nextSessionExpiry();

    await createAuthSession({
      jti: sessionId,
      user_id: user.id,
      user_agent: sanitizeUserAgent(context.userAgent),
      ip: context.ip ?? null,
      created_at: issuedAtIso,
      expires_at: sessionExpiresAt,
    });

    const refreshToken = signRefresh({ sub: user.id, sid: sessionId });
    const token_hash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    await insertRefreshToken({
      id: uuidv4(),
      user_id: user.id,
      token_hash,
      session_jti: sessionId,
      expires_at: sessionExpiresAt,
      created_at: issuedAtIso,
    });

    const tokens: TokenPair = {
      accessToken: signAccess({ sub: user.id, role: user.role_code, sid: sessionId }),
      refreshToken,
      accessExpiresIn: ACCESS_TTL,
    };

    await recordAuditEvent(user.id, "auth.login", {
      sessionId,
      userAgent: sanitizeUserAgent(context.userAgent),
      ip: context.ip ?? null,
      requestId: context.requestId ?? null,
    });

    // Check if user has accepted current terms and privacy policy versions
    const termsOutdated = isTermsVersionOutdated(user.terms_version);
    const privacyPolicyOutdated = isPrivacyPolicyVersionOutdated(user.privacy_policy_version);

    return {
      requires2FA: false,
      user: toSafeUser(user),
      tokens,
      session: { id: sessionId, expiresAt: sessionExpiresAt },
      termsOutdated,
      privacyPolicyOutdated,
    };
  } finally {
    // Normalize timing to prevent user enumeration (AC-1.12)
    await normalizeAuthTiming(startTime);
  }
}

/**
 * Verify 2FA code and complete login (Stage 2 of 2-stage login)
 */
export async function verify2FALogin(
  pendingSessionId: string,
  code: string,
  context: LoginContext = {},
): Promise<{
  user: UserSafe;
  tokens: TokenPair;
  session: { id: string; expiresAt: string };
  termsOutdated?: boolean;
  privacyPolicyOutdated?: boolean;
}> {
  const ipAddress = context.ip ?? "unknown";
  const userAgent = sanitizeUserAgent(context.userAgent);

  // Get pending session
  const pendingSession = await getPending2FASession(pendingSessionId);
  if (!pendingSession) {
    throw new HttpError(401, "AUTH_INVALID_2FA_SESSION", "Invalid or expired 2FA session");
  }

  // Check if already verified (prevent reuse)
  if (pendingSession.verified) {
    await deletePending2FASession(pendingSessionId);
    throw new HttpError(401, "AUTH_2FA_SESSION_ALREADY_USED", "2FA session already used");
  }

  // Check if expired
  const now = new Date();
  const expiresAt = new Date(pendingSession.expires_at);
  if (now > expiresAt) {
    await deletePending2FASession(pendingSessionId);
    throw new HttpError(401, "AUTH_2FA_SESSION_EXPIRED", "2FA session expired");
  }

  // Security: Verify IP and user agent match
  if (pendingSession.ip !== (context.ip ?? null)) {
    await deletePending2FASession(pendingSessionId);
    await recordAuditEvent(pendingSession.user_id, "auth.login_2fa_ip_mismatch", {
      pendingSessionId,
      expectedIp: pendingSession.ip,
      actualIp: context.ip ?? null,
      requestId: context.requestId ?? null,
    });
    throw new HttpError(401, "AUTH_2FA_SESSION_MISMATCH", "Session security validation failed");
  }

  // Verify 2FA code
  const isValidCode = await verify2FACode(pendingSession.user_id, code);
  if (!isValidCode) {
    await recordAuditEvent(pendingSession.user_id, "auth.login_2fa_failed", {
      pendingSessionId,
      ip: ipAddress,
      requestId: context.requestId ?? null,
    });
    throw new HttpError(401, "AUTH_INVALID_2FA_CODE", "Invalid 2FA code");
  }

  // Mark pending session as verified
  await markPending2FASessionVerified(pendingSessionId);

  // Get user
  const user = await findUserById(pendingSession.user_id);
  if (!user || user.status !== "active") {
    throw new HttpError(401, "AUTH_INVALID_USER", "User not found or inactive");
  }

  // Create full session and issue tokens
  const sessionId = uuidv4();
  const issuedAtIso = new Date().toISOString();
  const sessionExpiresAt = nextSessionExpiry();

  await createAuthSession({
    jti: sessionId,
    user_id: user.id,
    user_agent: userAgent,
    ip: context.ip ?? null,
    created_at: issuedAtIso,
    expires_at: sessionExpiresAt,
  });

  const refreshToken = signRefresh({ sub: user.id, sid: sessionId });
  const token_hash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  await insertRefreshToken({
    id: uuidv4(),
    user_id: user.id,
    token_hash,
    session_jti: sessionId,
    expires_at: sessionExpiresAt,
    created_at: issuedAtIso,
  });

  const tokens: TokenPair = {
    accessToken: signAccess({ sub: user.id, role: user.role_code, sid: sessionId }),
    refreshToken,
    accessExpiresIn: ACCESS_TTL,
  };

  await recordAuditEvent(user.id, "auth.login_2fa_success", {
    sessionId,
    pendingSessionId,
    userAgent,
    ip: context.ip ?? null,
    requestId: context.requestId ?? null,
  });

  // Clean up pending session
  await deletePending2FASession(pendingSessionId);

  // Check if user has accepted current terms and privacy policy versions (after tokens are created)
  const termsOutdated = isTermsVersionOutdated(user.terms_version);
  const privacyPolicyOutdated = isPrivacyPolicyVersionOutdated(user.privacy_policy_version);

  return {
    user: toSafeUser(user),
    tokens,
    session: { id: sessionId, expiresAt: sessionExpiresAt },
    termsOutdated,
    privacyPolicyOutdated,
  };
}

export async function refresh(
  refreshToken: string,
  context: LoginContext = {},
): Promise<{ user: UserSafe; newRefresh: string; accessToken: string }> {
  try {
    const decoded = jwt.verify(refreshToken, RSA_KEYS.publicKey, {
      algorithms: ["RS256"],
    }) as RefreshTokenPayload;
    if (!decoded?.sid) {
      throw new HttpError(401, "AUTH_INVALID_REFRESH", "AUTH_INVALID_REFRESH");
    }

    const token_hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const rec = await getRefreshByHash(token_hash);
    if (!rec) {
      try {
        const historical = await findRefreshTokenRaw(token_hash);
        if (historical?.session_jti) {
          await revokeSessionById(historical.session_jti);
          await revokeRefreshBySession(historical.session_jti);
          incrementRefreshReuse();
          await recordAuditEvent(historical.user_id ?? null, "auth.refresh_reuse", {
            sessionId: historical.session_jti,
            requestId: context.requestId ?? null,
            ip: context.ip ?? null,
            userAgent: sanitizeUserAgent(context.userAgent),
            outcome: "failure",
            familyRevoked: true,
          });
        }
      } catch (error: unknown) {
        if (error instanceof HttpError) {
          throw error;
        }
      }
      throw new HttpError(401, "AUTH_INVALID_REFRESH", "AUTH_INVALID_REFRESH");
    }

    if (rec.session_jti !== decoded.sid) {
      await revokeRefreshByHash(token_hash);
      await recordAuditEvent(rec.user_id, "auth.refresh_session_mismatch", {
        tokenId: rec.id,
        sessionId: decoded.sid,
        storedSessionId: rec.session_jti,
        requestId: context.requestId ?? null,
        outcome: "failure",
      });
      throw new HttpError(401, "AUTH_INVALID_REFRESH", "AUTH_INVALID_REFRESH");
    }

    const session = await findSessionById(decoded.sid);
    if (!session || session.user_id !== rec.user_id) {
      await revokeRefreshByHash(token_hash);
      throw new HttpError(401, "AUTH_INVALID_REFRESH", "AUTH_INVALID_REFRESH");
    }

    if (session.revoked_at) {
      await revokeRefreshByHash(token_hash);
      throw new HttpError(401, "AUTH_SESSION_REVOKED", "AUTH_SESSION_REVOKED");
    }

    if (new Date(rec.expires_at).getTime() <= Date.now()) {
      await revokeRefreshByHash(token_hash);
      await revokeSessionById(session.jti);
      throw new HttpError(401, "AUTH_REFRESH_EXPIRED", "AUTH_REFRESH_EXPIRED");
    }

    if (new Date(session.expires_at).getTime() <= Date.now()) {
      await revokeRefreshBySession(session.jti);
      await revokeSessionById(session.jti);
      throw new HttpError(401, "AUTH_REFRESH_EXPIRED", "AUTH_REFRESH_EXPIRED");
    }

    const user = await findUserById(decoded.sub);
    if (!user || user.status !== "active") {
      throw new HttpError(401, "AUTH_USER_NOT_FOUND", "User not found");
    }

    // Check if user has accepted current terms and privacy policy versions
    if (isTermsVersionOutdated(user.terms_version)) {
      throw new HttpError(403, "TERMS_VERSION_OUTDATED", "TERMS_VERSION_OUTDATED");
    }
    if (isPrivacyPolicyVersionOutdated(user.privacy_policy_version)) {
      throw new HttpError(
        403,
        "PRIVACY_POLICY_VERSION_OUTDATED",
        "PRIVACY_POLICY_VERSION_OUTDATED",
      );
    }

    await revokeRefreshByHash(token_hash);
    const newRefresh = signRefresh({ sub: user.id, sid: session.jti });
    const newHash = crypto.createHash("sha256").update(newRefresh).digest("hex");
    const newExpiry = nextSessionExpiry();

    await insertRefreshToken({
      id: uuidv4(),
      user_id: user.id,
      token_hash: newHash,
      session_jti: session.jti,
      expires_at: newExpiry,
      created_at: new Date().toISOString(),
    });

    const patch: {
      expires_at: string;
      user_agent?: string | null;
      ip?: string | null;
    } = {
      expires_at: newExpiry,
    };
    if (context.userAgent) {
      patch.user_agent = sanitizeUserAgent(context.userAgent);
    }
    if (context.ip) {
      patch.ip = context.ip;
    }
    await updateSession(session.jti, patch);

    await recordAuditEvent(user.id, "auth.refresh", {
      sessionId: session.jti,
      previousTokenId: rec.id,
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: sanitizeUserAgent(context.userAgent),
    });

    return {
      user: toSafeUser(user),
      newRefresh,
      accessToken: signAccess({
        sub: user.id,
        role: user.role_code,
        sid: session.jti,
      }),
    };
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(401, "AUTH_INVALID_REFRESH", "AUTH_INVALID_REFRESH");
  }
}

export async function logout(
  refreshToken: string | undefined,
  context: LoginContext = {},
): Promise<void> {
  if (!refreshToken) {
    return;
  }
  const token_hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  let decoded: RefreshTokenPayload | null = null;
  try {
    decoded = jwt.verify(refreshToken, RSA_KEYS.publicKey, {
      algorithms: ["RS256"],
    }) as RefreshTokenPayload;
  } catch {
    decoded = null;
  }

  await revokeRefreshByHash(token_hash);

  if (decoded?.sid) {
    await revokeRefreshBySession(decoded.sid);
    await revokeSessionById(decoded.sid);
  }

  await recordAuditEvent(decoded?.sub ?? null, "auth.logout", {
    sessionId: decoded?.sid ?? null,
    requestId: context.requestId ?? null,
    ip: context.ip ?? null,
    userAgent: sanitizeUserAgent(context.userAgent),
  });
}

export async function requestPasswordReset(email: string): Promise<{ resetToken?: string }> {
  // Start timing for enumeration protection (AC-1.12)
  const startTime = Date.now();

  try {
    const normalized = email.toLowerCase();
    const user = await findUserByEmail(normalized);
    if (!user || user.status !== "active") {
      // Do not reveal existence - perform dummy operation to normalize timing
      await bcrypt.compare("dummy-password", DUMMY_PASSWORD_HASH);
      return {};
    }

    const resetToken = await issueAuthToken(
      user.id,
      TOKEN_TYPES.PASSWORD_RESET,
      PASSWORD_RESET_TTL,
    );

    // Send password reset email
    if (env.email.enabled) {
      try {
        const resetUrl = `${env.frontendUrl}/reset-password?token=${resetToken}`;
        await mailerService.send({
          to: email,
          subject: "Reset your FitVibe password",
          html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Click the link below to create a new password:</p>
          <p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
              Reset Password
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${resetUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            This link will expire in ${Math.floor(PASSWORD_RESET_TTL / 60)} minutes.
          </p>
          <p style="color: #999; font-size: 12px;">
            If you didn't request this password reset, you can safely ignore this email.
          </p>
        </div>
      `,
          text: `Password Reset Request\n\nWe received a request to reset your password. Please visit the following link to create a new password:\n\n${resetUrl}\n\nThis link will expire in ${Math.floor(PASSWORD_RESET_TTL / 60)} minutes.\n\nIf you didn't request this password reset, you can safely ignore this email.`,
        });
      } catch (emailError) {
        // Log error but don't fail - function always returns success to prevent user enumeration
        logger.error(
          { err: emailError, userId: user.id, email: normalized },
          "[auth] Failed to send password reset email",
        );
      }
    }

    return { resetToken };
  } finally {
    // Normalize timing to prevent user enumeration (AC-1.12)
    await normalizeAuthTiming(startTime);
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await findAuthToken(TOKEN_TYPES.PASSWORD_RESET, tokenHash);
  if (!record) {
    throw new HttpError(400, "AUTH_INVALID_TOKEN", "AUTH_INVALID_TOKEN");
  }
  if (new Date(record.expires_at).getTime() <= Date.now()) {
    await consumeAuthToken(record.id);
    throw new HttpError(400, "AUTH_INVALID_TOKEN", "AUTH_INVALID_TOKEN");
  }

  const user = await findUserById(record.user_id);
  if (!user) {
    throw new HttpError(404, "AUTH_USER_NOT_FOUND", "AUTH_USER_NOT_FOUND");
  }
  assertPasswordPolicy(newPassword, {
    email: user.primary_email ?? undefined,
    username: user.username,
  });

  const password_hash = await bcrypt.hash(newPassword, 12);
  await updateUserPassword(record.user_id, password_hash);
  await consumeAuthToken(record.id);
  await markAuthTokensConsumed(record.user_id, TOKEN_TYPES.PASSWORD_RESET);
  await revokeRefreshByUserId(record.user_id);
}

export async function listSessions(
  userId: string,
  currentSessionId: string | null = null,
): Promise<SessionView[]> {
  const sessions = (await listSessionsByUserId(userId)) as SessionRecord[];
  return sessions.map((session) => ({
    id: session.jti,
    userAgent: session.user_agent,
    ip: session.ip,
    createdAt: session.created_at,
    expiresAt: session.expires_at,
    revokedAt: session.revoked_at,
    isCurrent: currentSessionId ? session.jti === currentSessionId : false,
  }));
}

export async function revokeSessions(
  userId: string,
  options: SessionRevokeOptions,
): Promise<{ revoked: number }> {
  const { sessionId, revokeAll, revokeOthers, currentSessionId = null, context = {} } = options;
  const now = new Date().toISOString();
  let revokedCount = 0;

  if (!sessionId && !revokeAll && !revokeOthers) {
    throw new HttpError(400, "AUTH_INVALID_SCOPE", "AUTH_INVALID_SCOPE");
  }

  if (sessionId) {
    const session = await findSessionById(sessionId);
    if (!session || session.user_id !== userId) {
      throw new HttpError(404, "AUTH_SESSION_NOT_FOUND", "AUTH_SESSION_NOT_FOUND");
    }
    if (!session.revoked_at) {
      await revokeSessionById(sessionId);
      await revokeRefreshBySession(sessionId);
      revokedCount = 1;
    }
    await recordAuditEvent(userId, "auth.session_revoke_single", {
      sessionId,
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: sanitizeUserAgent(context.userAgent),
      at: now,
    });
    return { revoked: revokedCount };
  }

  const sessions = (await listSessionsByUserId(userId)) as SessionRecord[];
  if (revokeAll) {
    const targets = sessions.filter((session) => !session.revoked_at);
    if (targets.length) {
      await revokeSessionsByUserId(userId);
      await revokeRefreshByUserId(userId);
    }
    revokedCount = targets.length;
    await recordAuditEvent(userId, "auth.session_revoke_all", {
      revoked: revokedCount,
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: sanitizeUserAgent(context.userAgent),
      at: now,
    });
    return { revoked: revokedCount };
  }

  if (revokeOthers) {
    if (!currentSessionId) {
      throw new HttpError(400, "AUTH_INVALID_SCOPE", "Current session id required");
    }
    const targets = sessions.filter(
      (session) => !session.revoked_at && session.jti !== currentSessionId,
    );
    if (targets.length) {
      await revokeSessionsByUserId(userId, currentSessionId);
      await revokeRefreshByUserExceptSession(userId, currentSessionId);
    }
    revokedCount = targets.length;
    await recordAuditEvent(userId, "auth.session_revoke_others", {
      revoked: revokedCount,
      keepSessionId: currentSessionId,
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: sanitizeUserAgent(context.userAgent),
      at: now,
    });
    return { revoked: revokedCount };
  }

  return { revoked: revokedCount };
}

export async function acceptTerms(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const termsVersion = getCurrentTermsVersion();

  await db("users").where({ id: userId }).update({
    terms_accepted: true,
    terms_accepted_at: now,
    terms_version: termsVersion,
    updated_at: now,
  });

  await recordAuditEvent(userId, "auth.terms_accepted", {
    termsVersion,
    acceptedAt: now,
  });
}

export async function revokeTerms(userId: string): Promise<void> {
  const now = new Date().toISOString();

  await db("users").where({ id: userId }).update({
    terms_accepted: false,
    terms_accepted_at: null,
    terms_version: null,
    updated_at: now,
  });

  // Revoke all user sessions to log them out
  await revokeSessionsByUserId(userId);
  await revokeRefreshByUserId(userId);

  await recordAuditEvent(userId, "auth.terms_revoked", {
    revokedAt: now,
  });
}

export async function acceptPrivacyPolicy(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const privacyPolicyVersion = getCurrentPrivacyPolicyVersion();

  await db("users").where({ id: userId }).update({
    privacy_policy_accepted: true,
    privacy_policy_accepted_at: now,
    privacy_policy_version: privacyPolicyVersion,
    updated_at: now,
  });

  await recordAuditEvent(userId, "auth.privacy_policy_accepted", {
    privacyPolicyVersion,
    acceptedAt: now,
  });
}

export async function revokePrivacyPolicy(userId: string): Promise<void> {
  const now = new Date().toISOString();

  await db("users").where({ id: userId }).update({
    privacy_policy_accepted: false,
    privacy_policy_accepted_at: null,
    privacy_policy_version: null,
    updated_at: now,
  });

  // Revoke all user sessions to log them out
  await revokeSessionsByUserId(userId);
  await revokeRefreshByUserId(userId);

  await recordAuditEvent(userId, "auth.privacy_policy_revoked", {
    revokedAt: now,
  });
}

export interface LegalDocumentsStatus {
  terms: {
    accepted: boolean;
    acceptedAt: string | null;
    acceptedVersion: string | null;
    currentVersion: string;
    needsAcceptance: boolean;
  };
  privacy: {
    accepted: boolean;
    acceptedAt: string | null;
    acceptedVersion: string | null;
    currentVersion: string;
    needsAcceptance: boolean;
  };
}

export async function getLegalDocumentsStatus(userId: string): Promise<LegalDocumentsStatus> {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "USER_NOT_FOUND");
  }

  const currentTermsVersion = getCurrentTermsVersion();
  const currentPrivacyVersion = getCurrentPrivacyPolicyVersion();

  const termsNeedsAcceptance = !user.terms_accepted || isTermsVersionOutdated(user.terms_version);
  const privacyNeedsAcceptance =
    !user.privacy_policy_accepted || isPrivacyPolicyVersionOutdated(user.privacy_policy_version);

  return {
    terms: {
      accepted: user.terms_accepted,
      acceptedAt: user.terms_accepted_at,
      acceptedVersion: user.terms_version,
      currentVersion: currentTermsVersion,
      needsAcceptance: termsNeedsAcceptance,
    },
    privacy: {
      accepted: user.privacy_policy_accepted,
      acceptedAt: user.privacy_policy_accepted_at,
      acceptedVersion: user.privacy_policy_version,
      currentVersion: currentPrivacyVersion,
      needsAcceptance: privacyNeedsAcceptance,
    },
  };
}
