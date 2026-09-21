import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { isTermsVersionOutdated } from "../../config/terms.js";
import { HttpError } from "../../utils/http.js";
import { attachAnonymousConsents } from "../consent/consent.repository.js";
import { verify2FACode } from "./two-factor.service.js";
import {
  deletePending2FASession,
  getPending2FASession,
  markPending2FASessionVerified,
} from "./pending-2fa.repository.js";
import { createAuthSession, findUserById, insertRefreshToken } from "./auth.repository.js";
import type { LoginContext, TokenPair, UserSafe } from "./auth.types.js";
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

function isValidUUID(value: string | null): boolean {
  return Boolean(
    value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
  );
}

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
