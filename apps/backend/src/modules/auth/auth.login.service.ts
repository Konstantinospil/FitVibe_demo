import crypto from "crypto";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../db/index.js";
import { is2FAEnabled, verify2FACode } from "./two-factor.service.js";
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
  findUserById,
  createAuthSession,
} from "./auth.repository.js";
import { attachAnonymousConsents } from "../consent/consent.repository.js";
import type {
  JwtPayload,
  LoginDTO,
  LoginContext,
  TokenPair,
  UserSafe,
} from "./auth.types.js";
import { HttpError } from "../../utils/http.js";
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
import {
  recordAuthAuditEvent as recordAuditEvent,
  sanitizeAuthUserAgent as sanitizeUserAgent,
} from "./auth.audit.js";
import { toSafeUser } from "./auth.mapping.js";
import {
  accessTokenTtl,
  nextSessionExpiry,
  signAccess,
  signRefresh,
} from "./auth.session-tokens.js";

const DUMMY_PASSWORD_HASH = bcrypt.hashSync("fitvibe-placeholder-password", 12);

const SESSION_EXPIRY_MS = REFRESH_TTL * 1000;

function nextSessionExpiry(): string {
  return new Date(Date.now() + SESSION_EXPIRY_MS).toISOString();
}

function isValidUUID(value: string | null): boolean {
  return Boolean(
    value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
  );
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
    }
  | {
      requires2FA: true;
      pendingSessionId: string;
    }
> {
  // Start timing for enumeration protection (AC-1.12)
  const startTime = Date.now();

  const identifier = dto.email.trim().toLowerCase();
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

    const user = identifier.includes("@")
      ? await findUserByEmail(identifier)
      : await findUserByUsername(identifier);
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
      // Use transaction to ensure atomicity between account-level and IP-level tracking
      const accountAttempt = await db.transaction(async (trx) => {
        const account = await recordFailedAttempt(identifier, ipAddress, userAgent, trx);
        const ip = await recordFailedAttemptByIP(ipAddress, identifier, trx);
        return { account, ip };
      });
      const ipAttempt = accountAttempt.ip;
      const accountAttemptRecord = accountAttempt.account;

      // Check if IP lockout was triggered by this attempt (after recording)
      if (isIPLocked(ipAttempt)) {
        const remainingSeconds = getRemainingIPLockoutSeconds(ipAttempt);
        const remainingMinutes = Math.ceil(remainingSeconds / 60);

        await recordAuditEvent(null, "auth.login_blocked_ip", {
          ip: ipAddress,
          remainingSeconds,
          totalAttemptCount: ipAttempt.total_attempt_count,
          distinctEmailCount: ipAttempt.distinct_email_count,
          requestId: context.requestId ?? null,
        });

        throw new HttpError(
          429,
          "AUTH_IP_LOCKED",
          `IP address temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`,
          {
            remainingSeconds,
            lockoutType: "ip",
            totalAttemptCount: ipAttempt.total_attempt_count,
            distinctEmailCount: ipAttempt.distinct_email_count,
            maxAttempts: getMaxIPAttempts(),
            maxDistinctEmails: getMaxIPDistinctEmails(),
          },
        );
      }

      // Check if account lockout was triggered by this attempt (after recording)
      if (isAccountLocked(accountAttemptRecord)) {
        const remainingSeconds = getRemainingLockoutSeconds(accountAttemptRecord);
        const remainingMinutes = Math.ceil(remainingSeconds / 60);

        await recordAuditEvent(null, "auth.login_blocked", {
          identifier,
          ip: ipAddress,
          remainingSeconds,
          attemptCount: accountAttemptRecord.attempt_count,
          requestId: context.requestId ?? null,
        });

        throw new HttpError(
          429,
          "AUTH_ACCOUNT_LOCKED",
          `Account temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`,
          {
            remainingSeconds,
            lockoutType: "account",
            attemptCount: accountAttemptRecord.attempt_count,
            maxAttempts: getMaxAccountAttempts(),
          },
        );
      }

      // If this attempt just triggered IP lockout, return 429 on this request
      if (isIPLocked(ipAttempt)) {
        const remainingSeconds = getRemainingIPLockoutSeconds(ipAttempt);
        const remainingMinutes = Math.ceil(remainingSeconds / 60);
        await recordAuditEvent(null, "auth.login_blocked_ip", {
          ip: ipAddress,
          remainingSeconds,
          totalAttemptCount: ipAttempt.total_attempt_count ?? 0,
          distinctEmailCount: ipAttempt.distinct_email_count ?? 0,
          requestId: context.requestId ?? null,
        });
        throw new HttpError(
          429,
          "AUTH_IP_LOCKED",
          `IP address temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`,
          {
            remainingSeconds,
            lockoutType: "ip",
            totalAttemptCount: ipAttempt.total_attempt_count ?? 0,
            distinctEmailCount: ipAttempt.distinct_email_count ?? 0,
            maxAttempts: getMaxIPAttempts(),
            maxDistinctEmails: getMaxIPDistinctEmails(),
          },
        );
      }

      // Check if we should warn about approaching lockout
      const remainingAccountAttempts = getRemainingAccountAttempts(accountAttemptRecord);
      const remainingIPAttempts = getRemainingIPAttempts(ipAttempt);
      const minRemaining = Math.min(
        remainingAccountAttempts,
        remainingIPAttempts.remainingAttempts,
        remainingIPAttempts.remainingDistinctEmails,
      );

      // Include warning in error details if within 3 attempts of lockout
      const errorDetails: Record<string, unknown> = {};
      if (minRemaining <= 2 && minRemaining > 0) {
        errorDetails.warning = true;
        errorDetails.remainingAccountAttempts = remainingAccountAttempts;
        errorDetails.remainingIPAttempts = remainingIPAttempts.remainingAttempts;
        errorDetails.remainingIPDistinctEmails = remainingIPAttempts.remainingDistinctEmails;
        errorDetails.accountAttemptCount = accountAttemptRecord.attempt_count;
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
      // Use transaction to ensure atomicity between account-level and IP-level tracking
      const attemptResult = await db.transaction(async (trx) => {
        const account = await recordFailedAttempt(identifier, ipAddress, userAgent, trx);
        const ip = await recordFailedAttemptByIP(ipAddress, identifier, trx);
        return { account, ip };
      });
      const attempt = attemptResult.account;
      const ipAttempt = attemptResult.ip;

      // Check if IP lockout was triggered by this attempt (after recording)
      if (isIPLocked(ipAttempt)) {
        const remainingSeconds = getRemainingIPLockoutSeconds(ipAttempt);
        const remainingMinutes = Math.ceil(remainingSeconds / 60);

        await recordAuditEvent(user.id, "auth.login_blocked_ip", {
          ip: ipAddress,
          remainingSeconds,
          totalAttemptCount: ipAttempt.total_attempt_count,
          distinctEmailCount: ipAttempt.distinct_email_count,
          requestId: context.requestId ?? null,
        });

        throw new HttpError(
          429,
          "AUTH_IP_LOCKED",
          `IP address temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`,
          {
            remainingSeconds,
            lockoutType: "ip",
            totalAttemptCount: ipAttempt.total_attempt_count,
            distinctEmailCount: ipAttempt.distinct_email_count,
            maxAttempts: getMaxIPAttempts(),
            maxDistinctEmails: getMaxIPDistinctEmails(),
          },
        );
      }

      // Check if account lockout was triggered by this attempt (after recording)
      if (isAccountLocked(attempt)) {
        const remainingSeconds = getRemainingLockoutSeconds(attempt);
        const remainingMinutes = Math.ceil(remainingSeconds / 60);

        await recordAuditEvent(user.id, "auth.login_blocked", {
          identifier,
          ip: ipAddress,
          remainingSeconds,
          attemptCount: attempt.attempt_count,
          requestId: context.requestId ?? null,
        });

        throw new HttpError(
          429,
          "AUTH_ACCOUNT_LOCKED",
          `Account temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`,
          {
            remainingSeconds,
            lockoutType: "account",
            attemptCount: attempt.attempt_count,
            maxAttempts: getMaxAccountAttempts(),
          },
        );
      }

      // If this attempt just triggered IP lockout, return 429 on this request
      if (isIPLocked(ipAttempt)) {
        const remainingSeconds = getRemainingIPLockoutSeconds(ipAttempt);
        const remainingMinutes = Math.ceil(remainingSeconds / 60);
        await recordAuditEvent(user.id, "auth.login_blocked_ip", {
          ip: ipAddress,
          remainingSeconds,
          totalAttemptCount: ipAttempt.total_attempt_count ?? 0,
          distinctEmailCount: ipAttempt.distinct_email_count ?? 0,
          requestId: context.requestId ?? null,
        });
        throw new HttpError(
          429,
          "AUTH_IP_LOCKED",
          `IP address temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`,
          {
            remainingSeconds,
            lockoutType: "ip",
            totalAttemptCount: ipAttempt.total_attempt_count ?? 0,
            distinctEmailCount: ipAttempt.distinct_email_count ?? 0,
            maxAttempts: getMaxIPAttempts(),
            maxDistinctEmails: getMaxIPDistinctEmails(),
          },
        );
      }

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
      if (minRemaining <= 2 && minRemaining > 0) {
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
    // Use transaction to ensure atomicity between account-level and IP-level reset
    await db.transaction(async (trx) => {
      await resetFailedAttempts(identifier, ipAddress, trx);
      await resetFailedAttemptsByIP(ipAddress, trx);
    });

    // Check if user has accepted current terms version
    if (isTermsVersionOutdated(user.terms_version)) {
      throw new HttpError(403, "TERMS_VERSION_OUTDATED", "TERMS_VERSION_OUTDATED");
    }

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
      accessExpiresIn: accessTokenTtl,
    };

    await recordAuditEvent(user.id, "auth.login", {
      sessionId,
      userAgent: sanitizeUserAgent(context.userAgent),
      ip: context.ip ?? null,
      requestId: context.requestId ?? null,
    });
    if (isValidUUID(user.id)) {
      await attachAnonymousConsents(user.id, ipAddress);
    }

    return {
      requires2FA: false,
      user: toSafeUser(user),
      tokens,
      session: { id: sessionId, expiresAt: sessionExpiresAt },
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

  // Check if user has accepted current terms version
  if (isTermsVersionOutdated(user.terms_version)) {
    throw new HttpError(403, "TERMS_VERSION_OUTDATED", "TERMS_VERSION_OUTDATED");
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
    accessExpiresIn: accessTokenTtl,
  };

  await recordAuditEvent(user.id, "auth.login_2fa_success", {
    sessionId,
    pendingSessionId,
    userAgent,
    ip: context.ip ?? null,
    requestId: context.requestId ?? null,
  });
  if (isValidUUID(user.id)) {
    await attachAnonymousConsents(user.id, context.ip ?? ipAddress ?? "unknown");
  }

  // Clean up pending session
  await deletePending2FASession(pendingSessionId);

  return {
    user: toSafeUser(user),
    tokens,
    session: { id: sessionId, expiresAt: sessionExpiresAt },
  };
}
