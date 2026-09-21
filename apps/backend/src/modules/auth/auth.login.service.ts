import crypto from "crypto";
import jwt from "jsonwebtoken";
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
  getRefreshByHash,
  revokeRefreshByHash,
  findUserById,
  revokeRefreshBySession,
  findRefreshTokenRaw,
  createAuthSession,
  findSessionById,
  updateSession,
  revokeSessionById,
} from "./auth.repository.js";
import { attachAnonymousConsents } from "../consent/consent.repository.js";
import type {
  JwtPayload,
  LoginDTO,
  LoginContext,
  RefreshTokenPayload,
  TokenPair,
  UserSafe,
} from "./auth.types.js";
import { env, RSA_KEYS } from "../../config/env.js";
import { isTermsVersionOutdated } from "../../config/terms.js";
import { HttpError } from "../../utils/http.js";
import { incrementRefreshReuse } from "../../observability/metrics.js";
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

const ACCESS_TTL = env.ACCESS_TOKEN_TTL;
const REFRESH_TTL = env.REFRESH_TOKEN_TTL;
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
      accessExpiresIn: ACCESS_TTL,
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
    accessExpiresIn: ACCESS_TTL,
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

    // Check if user has accepted current terms version
    if (isTermsVersionOutdated(user.terms_version)) {
      throw new HttpError(403, "TERMS_VERSION_OUTDATED", "TERMS_VERSION_OUTDATED");
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
