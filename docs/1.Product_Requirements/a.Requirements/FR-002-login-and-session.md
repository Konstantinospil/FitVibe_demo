# FR-002 — Login & Session

---

**Requirement ID**: FR-002
**Type**: Functional Requirement
**Title**: Login & Session
**Status**: Done
**Priority**: High
**Gate**: GOLD
**Owner**: ENG/QA
**Created**: 2025-11-21
**Updated**: 2025-01-21

---

## Executive Summary

This functional requirement specifies login & session capabilities that the system must provide.

Provide secure authentication and session management with token-based access control.

## Business Context

- **Business Objective**: Provide secure authentication and session management with token-based access control.
- **Success Criteria**: Users can securely log in, maintain sessions, and log out with proper token invalidation.
- **Target Users**: All authenticated users

## Traceability

- **PRD Reference**: PRD §Auth
- **TDD Reference**: TDD §Sessions

## Functional Requirements

### Authentication

The system shall provide secure authentication with the following capabilities:

- **Token-Based Authentication**: RS256 JWT tokens with proper TTL (access ≤15m, refresh ≤30d)
- **Secure Cookie Configuration**: HttpOnly, Secure, SameSite flags per environment
- **No Secret Storage**: Local storage not used for secrets

### Session Management

- **Token Refresh**: Refresh token rotation with replay detection
- **Logout**: Server-side token invalidation within ≤1s
- **Session Locking**: Reused rotated tokens trigger session lock and security event logging
- **Session Listing**: Users can view their active sessions with device metadata
- **Session Revocation**: Users can revoke specific sessions or all sessions except current

### Security Features

- **Account Lockout**: After 10 failed attempts per 15m/IP+account, auto-unlock after 15m
- **No User Enumeration**: Generic error messages, timing variance ≤5ms
- **2FA Support**: Optional TOTP with QR enrollment, backup codes (10 one-time)

## Related Epics

- [E11: Authentication & Registration](../b.Epics/E11-authentication-and-registration.md)

## Dependencies

### Technical Dependencies

- JWT library (RS256)
- Session storage
- 2FA library (TOTP)

### Feature Dependencies

- [FR-001: User Registration](./FR-001-user-registration.md) - User accounts must exist

## Constraints

### Technical Constraints

- Access token TTL ≤15m
- Refresh token TTL ≤30d
- Account lockout: 10 attempts per 15m
- Timing variance ≤5ms for user enumeration prevention

### Business Constraints

- Secure cookie configuration required
- 2FA must be optional (not mandatory)

## Assumptions

- Users understand token-based authentication
- Secure cookie support in browsers
- 2FA devices/apps available to users

## Risks & Issues

- **Risk**: Token expiration may interrupt user sessions
- **Risk**: Account lockout may prevent legitimate access
- **Risk**: 2FA setup complexity may deter users

## Open Questions

- None

## Related Requirements

- [FR-001: User Registration](./FR-001-user-registration.md) - User account creation
- [FR-003: Auth-Wall](./FR-003-authwall.md) - Protected route access
- [NFR-001: Security](./NFR-001-security.md) - Security requirements

---

**Last Updated**: 2025-01-21
**Next Review**: 2025-02-21
