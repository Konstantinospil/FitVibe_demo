# FR-002 — Login & Session

---

**Requirement ID**: FR-002
**Type**: Functional Requirement
**Title**: Login & Session
**Status**: Proposed
**Priority**: High
**Gate**: GOLD
**Owner**: ENG/QA
**Generated**: 2025-11-21T20:33:59.185894

---

## Executive Summary

This functional requirement specifies login & session capabilities that the system must provide.

Provide secure authentication and session management with token-based access control.

## Business Context

- **Business Objective**: Provide secure authentication and session management with token-based access control.
- **Success Criteria**: Users can securely log in, maintain sessions, and log out with proper token invalidation.
- **Priority**: High
- **Quality Gate**: GOLD
- **Owner**: ENG/QA
- **Status**: Proposed
- **Target Users**: All authenticated users

## Traceability

- **PRD Reference**: PRD §Auth
- **TDD Reference**: TDD §Sessions

## Acceptance Criteria

Each acceptance criterion must be met for this requirement to be considered complete.

### FR-002-AC01-A

**Criterion**: On valid credentials, issue RS256 access token (TTL ≤15m) and refresh token (TTL ≤30d); tokens contain `sub`, `iat`, `exp`, `iss`, `aud`.

- **Test Method**: Unit + API
- **Evidence Required**: JWT samples, config snapshot

### FR-002-AC01-B

**Criterion**: Secure cookie flags (HttpOnly, Secure, SameSite=Lax/Strict) configured per environment; local storage not used for secrets.

- **Test Method**: Integration
- **Evidence Required**: Set-Cookie headers

### FR-002-AC02-A

**Criterion**: Logout invalidates the current refresh token server-side; subsequent refresh fails with **401** within **≤1s**.

- **Test Method**: Integration
- **Evidence Required**: Revocation log

### FR-002-AC02-B

**Criterion**: Refresh rotation with replay detection: attempting reuse of a rotated token locks that session and logs a security event.

- **Test Method**: Unit + Integration
- **Evidence Required**: Audit event, JWT samples

### FR-002-AC03-A

**Criterion**: Incorrect credentials return a single generic error; timing does not differ by user existence (±5ms).

- **Test Method**: Security negative
- **Evidence Required**: Timing histogram

### FR-002-AC03-B

**Criterion**: Account lockout after **10** failed attempts per 15m/IP+account, auto-unlock after 15m; 2FA unaffected.

- **Test Method**: Integration
- **Evidence Required**: Lockout records

### FR-002-AC04-A

**Criterion**: Optional 2FA (TOTP): enroll with QR, verify once, backup codes (10 one-time).

- **Test Method**: E2E + Unit
- **Evidence Required**: QR fixture, code list

## Test Strategy

- E2E + Unit
- Integration
- Security negative
- Unit + API
- Unit + Integration

## Evidence Requirements

- Audit event, JWT samples
- JWT samples, config snapshot
- Lockout records
- QR fixture, code list
- Revocation log
- Set-Cookie headers
- Timing histogram

## Use Cases

### Primary Use Cases

- User logs in with email and password
- User receives access and refresh tokens
- User refreshes access token when expired
- User logs out and tokens are invalidated

### Edge Cases

- User attempts login with incorrect credentials multiple times (lockout)
- User attempts to reuse rotated refresh token (replay attack)
- User enables 2FA and must provide TOTP code
- User loses 2FA device and uses backup codes

## Dependencies

### Technical Dependencies

- JWT library (jose)
- Database for refresh token storage
- Cookie management

### Feature Dependencies

- FR-001 (User Registration)

## Constraints

### Technical Constraints

- Access token TTL ≤15m
- Refresh token TTL ≤30d
- RS256 algorithm required

### Business Constraints

- Account lockout after 10 failed attempts
- 2FA is optional

## Assumptions

- Users remember their passwords
- Users have access to 2FA device if enabled
- Clock skew between client and server ≤30s

## Risks & Issues

- **Risk**: Token theft via XSS if cookies not properly secured
- **Risk**: Brute force attacks on login endpoint
- **Risk**: Session fixation attacks
