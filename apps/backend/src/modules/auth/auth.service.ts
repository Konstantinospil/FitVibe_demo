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
} from "./auth.repository";
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
import { HttpError } from "../../utils/http.js";
import { assertPasswordPolicy } from "./passwordPolicy.js";
import { incrementRefreshReuse } from "../../observability/metrics.js";
import { mailerService } from "../../services/mailer.service.js";
import {
  getFailedAttempt,
  recordFailedAttempt,
  resetFailedAttempts,
  isAccountLocked,
  getRemainingLockoutSeconds,
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

async function recordAuditEvent(
  userId: string | null,
  action: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    await db("audit_log").insert({
      id: uuidv4(),
      actor_user_id: userId,
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
          const verificationUrl = `${env.frontendUrl}/verify?token=${token}`;
          await mailerService.send({
            to: email,
            subject: "Verify your FitVibe account",
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Welcome back to FitVibe!</h2>
              <p>We noticed you tried to register again. Please verify your email address by clicking the link below:</p>
              <p>
                <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
                  Verify Email Address
                </a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
              <p style="color: #999; font-size: 12px; margin-top: 32px;">
                This link will expire in ${Math.floor(EMAIL_VERIFICATION_TTL / 60)} minutes.
              </p>
            </div>
          `,
            text: `Welcome back to FitVibe! Please verify your email address by visiting: ${verificationUrl}\n\nThis link will expire in ${Math.floor(EMAIL_VERIFICATION_TTL / 60)} minutes.`,
          });
        }

        return { verificationToken: token, user: toSafeUser(existingByEmail) };
      }
      throw new HttpError(409, "AUTH_CONFLICT", "AUTH_CONFLICT");
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(dto.password, 12);

    await createUser({
      id,
      username,
      display_name: dto.profile?.display_name ?? username,
      status: "pending_verification",
      role_code: "athlete",
      password_hash,
      primaryEmail: email,
    });

    const verificationToken = await issueAuthToken(
      id,
      TOKEN_TYPES.EMAIL_VERIFICATION,
      EMAIL_VERIFICATION_TTL,
    );

    // Send verification email
    if (env.email.enabled) {
      const verificationUrl = `${env.frontendUrl}/verify?token=${verificationToken}`;
      await mailerService.send({
        to: email,
        subject: "Verify your FitVibe account",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to FitVibe!</h2>
          <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
          <p>
            <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
              Verify Email Address
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            This link will expire in ${Math.floor(EMAIL_VERIFICATION_TTL / 60)} minutes.
          </p>
        </div>
      `,
        text: `Welcome to FitVibe! Please verify your email address by visiting: ${verificationUrl}\n\nThis link will expire in ${Math.floor(EMAIL_VERIFICATION_TTL / 60)} minutes.`,
      });
    }

    const user = await findUserById(id);
    return { verificationToken, user: user ? toSafeUser(user) : undefined };
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
    // Check for brute force lockout
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
      await recordFailedAttempt(identifier, ipAddress, userAgent);

      throw new HttpError(401, "AUTH_INVALID_CREDENTIALS", "AUTH_INVALID_CREDENTIALS");
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

      await recordAuditEvent(user.id, "auth.login_failed", {
        ip: ipAddress,
        attemptCount: attempt.attempt_count,
        lockedUntil: attempt.locked_until,
        requestId: context.requestId ?? null,
      });

      throw new HttpError(401, "AUTH_INVALID_CREDENTIALS", "AUTH_INVALID_CREDENTIALS");
    }

    // Successful password authentication - reset failed attempts
    await resetFailedAttempts(identifier, ipAddress);

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
