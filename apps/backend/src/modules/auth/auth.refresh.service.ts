import crypto from "crypto";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { RSA_KEYS } from "../../config/env.js";
import { isTermsVersionOutdated } from "../../config/terms.js";
import { HttpError } from "../../utils/http.js";
import { incrementRefreshReuse } from "../../observability/metrics.js";
import {
  findRefreshTokenRaw,
  findSessionById,
  findUserById,
  getRefreshByHash,
  insertRefreshToken,
  revokeRefreshByHash,
  revokeRefreshBySession,
  revokeSessionById,
  updateSession,
} from "./auth.repository.js";
import type { LoginContext, RefreshTokenPayload, UserSafe } from "./auth.types.js";
import {
  recordAuthAuditEvent as recordAuditEvent,
  sanitizeAuthUserAgent as sanitizeUserAgent,
} from "./auth.audit.js";
import { toSafeUser } from "./auth.mapping.js";
import { nextSessionExpiry, signAccess, signRefresh } from "./auth.session-tokens.js";

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

    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const record = await getRefreshByHash(tokenHash);
    if (!record) {
      try {
        const historical = await findRefreshTokenRaw(tokenHash);
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

    if (record.session_jti !== decoded.sid) {
      await revokeRefreshByHash(tokenHash);
      await recordAuditEvent(record.user_id, "auth.refresh_session_mismatch", {
        tokenId: record.id,
        sessionId: decoded.sid,
        storedSessionId: record.session_jti,
        requestId: context.requestId ?? null,
        outcome: "failure",
      });
      throw new HttpError(401, "AUTH_INVALID_REFRESH", "AUTH_INVALID_REFRESH");
    }

    const session = await findSessionById(decoded.sid);
    if (!session || session.user_id !== record.user_id) {
      await revokeRefreshByHash(tokenHash);
      throw new HttpError(401, "AUTH_INVALID_REFRESH", "AUTH_INVALID_REFRESH");
    }
    if (session.revoked_at) {
      await revokeRefreshByHash(tokenHash);
      throw new HttpError(401, "AUTH_SESSION_REVOKED", "AUTH_SESSION_REVOKED");
    }
    if (new Date(record.expires_at).getTime() <= Date.now()) {
      await revokeRefreshByHash(tokenHash);
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
    if (isTermsVersionOutdated(user.terms_version)) {
      throw new HttpError(403, "TERMS_VERSION_OUTDATED", "TERMS_VERSION_OUTDATED");
    }

    await revokeRefreshByHash(tokenHash);
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

    const patch: { expires_at: string; user_agent?: string | null; ip?: string | null } = {
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
      previousTokenId: record.id,
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

  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  let decoded: RefreshTokenPayload | null = null;
  try {
    decoded = jwt.verify(refreshToken, RSA_KEYS.publicKey, {
      algorithms: ["RS256"],
    }) as RefreshTokenPayload;
  } catch {
    decoded = null;
  }

  await revokeRefreshByHash(tokenHash);
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
