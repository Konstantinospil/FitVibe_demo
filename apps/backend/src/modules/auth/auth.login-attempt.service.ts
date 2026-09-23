import { db } from "../../db/index.js";
import { HttpError } from "../../utils/http.js";
import {
  getFailedAttempt,
  recordFailedAttempt,
  resetFailedAttempts,
  isAccountLocked,
  getRemainingLockoutSeconds,
  getMaxAccountAttempts,
  getFailedAttemptByIP,
  recordFailedAttemptByIP,
  isIPLocked,
  getRemainingIPLockoutSeconds,
  getMaxIPAttempts,
  getMaxIPDistinctEmails,
  lockLoginAttemptIp,
} from "./bruteforce.repository.js";
import { recordAuthAuditEvent as recordAuditEvent } from "./auth.audit.js";

function ipLockError(
  attempt: { total_attempt_count?: number; distinct_email_count?: number },
  remainingSeconds: number,
): HttpError {
  const remainingMinutes = Math.ceil(remainingSeconds / 60);
  return new HttpError(
    429,
    "AUTH_IP_LOCKED",
    `Authentication temporarily throttled. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`,
    {
      remainingSeconds,
      lockoutType: "ip",
      totalAttemptCount: attempt.total_attempt_count ?? 0,
      distinctEmailCount: attempt.distinct_email_count ?? 0,
      maxAttempts: getMaxIPAttempts(),
      maxDistinctEmails: getMaxIPDistinctEmails(),
    },
  );
}

function accountLockError(
  attempt: { attempt_count?: number },
  remainingSeconds: number,
): HttpError {
  const remainingMinutes = Math.ceil(remainingSeconds / 60);
  return new HttpError(
    429,
    "AUTH_ACCOUNT_LOCKED",
    `Authentication temporarily throttled. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`,
    {
      remainingSeconds,
      lockoutType: "account",
      attemptCount: attempt.attempt_count ?? 0,
      maxAttempts: getMaxAccountAttempts(),
    },
  );
}

export async function assertLoginAllowed(
  identifier: string,
  ipAddress: string,
  requestId: string | null,
): Promise<void> {
  const ipAttempt = await getFailedAttemptByIP(ipAddress);
  if (isIPLocked(ipAttempt)) {
    const remainingSeconds = getRemainingIPLockoutSeconds(ipAttempt);
    await recordAuditEvent(null, "auth.login_blocked_ip", {
      ip: ipAddress,
      remainingSeconds,
      totalAttemptCount: ipAttempt?.total_attempt_count ?? 0,
      distinctEmailCount: ipAttempt?.distinct_email_count ?? 0,
      requestId,
    });
    throw ipLockError(ipAttempt ?? {}, remainingSeconds);
  }

  const accountAttempt = await getFailedAttempt(identifier, ipAddress);
  if (isAccountLocked(accountAttempt)) {
    const remainingSeconds = getRemainingLockoutSeconds(accountAttempt);
    await recordAuditEvent(null, "auth.login_blocked", {
      identifier,
      ip: ipAddress,
      remainingSeconds,
      attemptCount: accountAttempt?.attempt_count ?? 0,
      requestId,
    });
    throw accountLockError(accountAttempt ?? {}, remainingSeconds);
  }
}

export async function recordLoginFailure({
  identifier,
  ipAddress,
  userAgent,
  actorUserId,
  requestId,
}: {
  identifier: string;
  ipAddress: string;
  userAgent: string | null;
  actorUserId: string | null;
  requestId: string | null;
}): Promise<void> {
  const attempts = await db.transaction(async (trx) => {
    await lockLoginAttemptIp(ipAddress, trx);
    const account = await recordFailedAttempt(identifier, ipAddress, userAgent, trx);
    const ip = await recordFailedAttemptByIP(ipAddress, identifier, trx);
    return { account, ip };
  });

  if (isIPLocked(attempts.ip)) {
    const remainingSeconds = getRemainingIPLockoutSeconds(attempts.ip);
    await recordAuditEvent(actorUserId, "auth.login_blocked_ip", {
      ip: ipAddress,
      remainingSeconds,
      totalAttemptCount: attempts.ip.total_attempt_count,
      distinctEmailCount: attempts.ip.distinct_email_count,
      requestId,
    });
    throw ipLockError(attempts.ip, remainingSeconds);
  }

  if (isAccountLocked(attempts.account)) {
    const remainingSeconds = getRemainingLockoutSeconds(attempts.account);
    await recordAuditEvent(actorUserId, "auth.login_blocked", {
      identifier,
      ip: ipAddress,
      remainingSeconds,
      attemptCount: attempts.account.attempt_count,
      requestId,
    });
    throw accountLockError(attempts.account, remainingSeconds);
  }

  if (actorUserId) {
    await recordAuditEvent(actorUserId, "auth.login_failed", {
      ip: ipAddress,
      attemptCount: attempts.account.attempt_count,
      lockedUntil: attempts.account.locked_until,
      requestId,
    });
  }
}

export async function resetLoginFailures(identifier: string, ipAddress: string): Promise<void> {
  await resetFailedAttempts(identifier, ipAddress);
}
