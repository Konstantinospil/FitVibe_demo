# Brute Force IP Protection - Deep Analysis

## Executive Summary

This document provides a comprehensive analysis of the brute force IP protection implementation, identifying critical bugs, security vulnerabilities, race conditions, and optimization opportunities.

## Critical Issues

### 1. **Lockout Duration Overwrite Bug** ⚠️ CRITICAL

**Location**: `bruteforce.repository.ts:395-401`

**Issue**: When updating an existing IP record that's already locked, the function recalculates the lockout duration based on the new attempt count. This can overwrite a longer lockout with a shorter one.

**Example Scenario**:

- IP has 50 attempts (24-hour lockout until tomorrow)
- New attempt comes in (51 attempts)
- Function recalculates lockout based on 51 attempts
- If the lockout calculation logic changes or if there's a bug, it could reset to a shorter duration

**Impact**: High - Could allow attackers to bypass longer lockouts

**Fix**: Only update `locked_until` if:

1. The record is not currently locked, OR
2. The new lockout duration is longer than the existing one

```typescript
// Current (BUGGY):
const lockedUntil = calculateIPLockoutDuration(newTotalAttemptCount, newDistinctEmailCount);
await exec(IP_TABLE).where({ id: existing.id }).update({
  locked_until: lockedUntil, // Always overwrites!
  // ...
});

// Should be:
const newLockedUntil = calculateIPLockoutDuration(newTotalAttemptCount, newDistinctEmailCount);
const finalLockedUntil =
  existing.locked_until && isIPLocked(existing)
    ? new Date(newLockedUntil || 0) > new Date(existing.locked_until)
      ? newLockedUntil
      : existing.locked_until
    : newLockedUntil;
```

### 2. **Race Condition in Distinct Email Tracking** ⚠️ CRITICAL

**Location**: `bruteforce.repository.ts:344-388`

**Issue**: The function checks if an email exists, then tries to insert it. Two concurrent requests could both see the email as "new" and both increment the distinct count.

**Example Scenario**:

- Request A checks: email doesn't exist → isNewEmail = true
- Request B checks: email doesn't exist → isNewEmail = true
- Request A inserts email record, increments distinct_email_count
- Request B inserts email record (conflict ignored), increments distinct_email_count
- Result: distinct_email_count is incremented twice for the same email

**Impact**: High - Could cause false lockouts or incorrect tracking

**Fix**: Use database-level atomic operations or proper transaction isolation:

```typescript
// Use a subquery with EXISTS or use a CTE with proper locking
const existingEmailAttempts = await exec(TABLE)
  .where({ ip_address: ipAddress, identifier: normalizedIdentifier })
  .first();

// Better: Use INSERT ... ON CONFLICT DO UPDATE with a subquery
// Or use a separate table for tracking distinct emails per IP
```

### 3. **Return Value Inconsistency** ⚠️ HIGH

**Location**: `bruteforce.repository.ts:406-413`

**Issue**: When updating an existing record, the function returns a constructed object instead of fetching the updated record from the database. This could return stale data.

**Comparison**: `recordFailedAttempt` (lines 138-150) correctly fetches the updated record, but `recordFailedAttemptByIP` does not.

**Impact**: Medium - Could return incorrect lockout times or counts

**Fix**: Fetch the updated record after update, similar to `recordFailedAttempt`:

```typescript
// After update:
const updated = await getFailedAttemptByIP(ipAddress, trx);
if (!updated) {
  // Fallback
  return { ...existing, ... };
}
return updated;
```

### 4. **Missing Transaction Wrapping in Login Flow** ⚠️ HIGH

**Location**: `auth.service.ts:487-489, 529-531, 570-572`

**Issue**: The login function calls `recordFailedAttempt` and `recordFailedAttemptByIP` separately without a transaction. Similarly, reset functions are called separately. If one succeeds and the other fails, the state becomes inconsistent.

**Impact**: High - Data inconsistency between account-level and IP-level tracking

**Fix**: Wrap both calls in a transaction:

```typescript
// For recording failures:
await db.transaction(async (trx) => {
  const accountAttempt = await recordFailedAttempt(identifier, ipAddress, userAgent, trx);
  const ipAttempt = await recordFailedAttemptByIP(ipAddress, identifier, trx);
  // ...
});

// For resetting on success:
await db.transaction(async (trx) => {
  await resetFailedAttempts(identifier, ipAddress, trx);
  await resetFailedAttemptsByIP(ipAddress, trx);
});
```

### 5. **Inefficient Query for Email Existence Check** ⚠️ MEDIUM

**Location**: `bruteforce.repository.ts:344-347`

**Issue**: Uses `COUNT(*)` to check if an email exists, which is inefficient. Should use `EXISTS` or `LIMIT 1`.

**Current**:

```typescript
const existingEmailAttempts = await exec(TABLE)
  .where({ ip_address: ipAddress, identifier: normalizedIdentifier })
  .count("* as count")
  .first();
```

**Optimized**:

```typescript
const existingEmailAttempts = await exec(TABLE)
  .where({ ip_address: ipAddress, identifier: normalizedIdentifier })
  .select("id")
  .first();
const isNewEmail = !existingEmailAttempts;
```

**Impact**: Medium - Performance degradation under high load

## Security Issues

### 6. **IP Address Validation Missing** ⚠️ MEDIUM

**Location**: `bruteforce.repository.ts:329-333`, `auth.service.ts:412`

**Issue**: The IP address is used directly without validation. If `extractClientIp` returns "unknown" or an invalid IP, it could cause issues.

**Impact**: Medium - Could allow bypassing protection or cause errors

**Fix**: Validate IP address before using it:

```typescript
if (!ipAddress || ipAddress === "unknown" || !isValidIP(ipAddress)) {
  // Log warning and use a default or skip IP-based tracking
  return;
}
```

### 7. **No Rate Limiting on Lockout Checks** ⚠️ LOW

**Location**: `auth.service.ts:417-443`

**Issue**: The lockout check itself is not rate-limited. An attacker could spam lockout checks to cause performance issues.

**Impact**: Low - DoS potential, but mitigated by existing rate limiting middleware

## Optimization Opportunities

### 8. **Redundant Database Queries**

**Location**: `bruteforce.repository.ts:339, 344-347`

**Issue**: The function queries `getFailedAttemptByIP` and then queries the account-level table. Could be optimized with a JOIN or CTE.

**Optimization**: Use a single query with a subquery or CTE to check email existence:

```typescript
const existing = await exec(IP_TABLE).where({ ip_address: ipAddress }).first();

if (existing) {
  // Use EXISTS subquery instead of separate query
  const emailExists = await exec.raw(
    `
    SELECT EXISTS(
      SELECT 1 FROM ${TABLE}
      WHERE ip_address = ? AND identifier = ?
    ) as exists
  `,
    [ipAddress, normalizedIdentifier],
  );
}
```

### 9. **Missing Database Indexes**

**Location**: Migration file `202511302130_add_ip_bruteforce_protection.ts`

**Issue**: The migration creates indexes on `last_attempt_at` and `ip_address`, but there's no composite index for the common query pattern: `(ip_address, identifier)` in the account-level table.

**Fix**: Add composite index:

```typescript
table.index(["ip_address", "identifier"]);
```

### 10. **Lockout Calculation Could Be Cached**

**Location**: `bruteforce.repository.ts:481-504`

**Issue**: The lockout duration calculation is done on every attempt. For high-traffic scenarios, this could be optimized.

**Impact**: Low - Calculation is simple, but could be optimized for very high load

## Code Quality Issues

### 11. **Inconsistent Error Handling**

**Location**: `bruteforce.repository.ts:378-386, 439-445`

**Issue**: Error handling uses string matching on error messages, which is fragile and not type-safe.

**Fix**: Use proper error types or database error codes:

```typescript
if (error instanceof Error && "code" in error) {
  const dbError = error as { code: string };
  if (dbError.code === "23505") {
    // PostgreSQL unique violation
    isNewEmail = false;
  } else {
    throw error;
  }
}
```

### 12. **Magic Numbers in Lockout Calculations**

**Location**: `bruteforce.repository.ts:206-225, 481-504`

**Issue**: Lockout thresholds (5, 10, 20, 50 attempts) and durations (15 min, 1 hour, 24 hours) are hardcoded.

**Fix**: Extract to configuration constants:

```typescript
const LOCKOUT_THRESHOLDS = {
  ACCOUNT: {
    WARNING: 3,
    LOCKOUT: 5,
    ESCALATION_1: 10,
    ESCALATION_2: 20,
  },
  IP: {
    LOCKOUT_ATTEMPTS: 10,
    LOCKOUT_EMAILS: 5,
    ESCALATION_1_ATTEMPTS: 20,
    ESCALATION_1_EMAILS: 10,
    ESCALATION_2_ATTEMPTS: 50,
    ESCALATION_2_EMAILS: 20,
  },
} as const;
```

### 13. **Missing Input Validation**

**Location**: All functions in `bruteforce.repository.ts`

**Issue**: Functions don't validate input parameters (empty strings, null values, etc.)

**Fix**: Add input validation:

```typescript
if (!ipAddress || typeof ipAddress !== "string" || ipAddress.trim().length === 0) {
  throw new Error("Invalid IP address");
}
```

## Test Coverage Gaps

### 14. **Missing Concurrency Tests**

**Issue**: No tests for race conditions or concurrent requests

**Recommendation**: Add tests that simulate concurrent requests:

```typescript
it("should handle concurrent requests without double-counting", async () => {
  const promises = Array(10)
    .fill(null)
    .map(() => recordFailedAttemptByIP(ipAddress, "test@example.com"));
  await Promise.all(promises);
  const result = await getFailedAttemptByIP(ipAddress);
  expect(result?.distinct_email_count).toBe(1); // Should be 1, not 10
});
```

### 15. **Missing Edge Case Tests**

**Issue**: Missing tests for:

- Lockout duration overwrite scenarios
- Invalid IP addresses
- Transaction rollback scenarios
- Very high attempt counts (100+)

## Recommendations Priority

### Immediate (Critical)

1. Fix lockout duration overwrite bug (#1)
2. Fix race condition in distinct email tracking (#2)
3. Add transaction wrapping in login flow (#4)

### High Priority

4. Fix return value inconsistency (#3)
5. Optimize email existence check query (#5)
6. Add input validation (#13)

### Medium Priority

7. Add IP address validation (#6)
8. Add missing database indexes (#9)
9. Extract magic numbers to constants (#12)

### Low Priority

10. Optimize redundant queries (#8)
11. Improve error handling (#11)
12. Add missing test coverage (#14, #15)

## Implementation Notes

- All fixes should maintain backward compatibility
- Database migrations may be required for index additions
- Transaction wrapping may require refactoring the login flow
- Consider adding monitoring/alerting for lockout events
