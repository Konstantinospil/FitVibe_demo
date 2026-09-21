import crypto from "crypto";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { is2FAEnabled } from "./two-factor.service.js";
import { normalizeAuthTiming } from "./timing.utils.js";
import { createPending2FASession } from "./pending-2fa.repository.js";
import {
  findUserByEmail,
  findUserByUsername,
  insertRefreshToken,
  createAuthSession,
} from "./auth.repository.js";
import { attachAnonymousConsents } from "../consent/consent.repository.js";
import type { LoginDTO, LoginContext, TokenPair, UserSafe } from "./auth.types.js";
import { HttpError } from "../../utils/http.js";
import { isTermsVersionOutdated } from "../../config/terms.js";
import {
  recordAuthAuditEvent as recordAuditEvent,
  sanitizeAuthUserAgent as sanitizeUserAgent,
} from "./auth.audit.js";
import { toSafeUser } from "./auth.mapping.js";
import {
  assertLoginAllowed,
  recordLoginFailure,
  resetLoginFailures,
} from "./auth.login-attempt.service.js";
import {
  accessTokenTtl,
  nextSessionExpiry,
  signAccess,
  signRefresh,
} from "./auth.session-tokens.js";

const DUMMY_PASSWORD_HASH = bcrypt.hashSync("fitvibe-placeholder-password", 12);

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
    await assertLoginAllowed(identifier, ipAddress, context.requestId ?? null);

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

      await recordLoginFailure({
        identifier,
        ipAddress,
        userAgent,
        actorUserId: null,
        requestId: context.requestId ?? null,
      });
    }

    const ok = await bcrypt.compare(dto.password, user.password_hash);
    if (!ok) {
      // Perform dummy operations to match timing of valid user path (AC-1.12)
      const dummySessionId = uuidv4();
      const dummyRefresh = signRefresh({ sub: user.id, sid: dummySessionId });
      crypto.createHash("sha256").update(dummyRefresh).digest("hex");
      signAccess({ sub: user.id, role: user.role_code, sid: dummySessionId });

      await recordLoginFailure({
        identifier,
        ipAddress,
        userAgent,
        actorUserId: user.id,
        requestId: context.requestId ?? null,
      });
    }

    await resetLoginFailures(identifier, ipAddress);

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
