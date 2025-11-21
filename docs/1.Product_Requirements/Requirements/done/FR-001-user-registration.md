# FR-001 — User Registration

---

**Requirement ID**: FR-001
**Type**: Functional Requirement
**Title**: User Registration
**Status**: Proposed
**Priority**: High
**Gate**: GOLD
**Owner**: ENG/QA
**Generated**: 2025-11-21T20:33:59.183343

---

## Executive Summary

This functional requirement specifies user registration capabilities that the system must provide.

Enable secure user onboarding with email verification to ensure valid accounts and prevent abuse.

## Business Context

- **Business Objective**: Enable secure user onboarding with email verification to ensure valid accounts and prevent abuse.
- **Success Criteria**: Users can register, verify email, and access the platform within 24 hours of registration.
- **Priority**: High
- **Quality Gate**: GOLD
- **Owner**: ENG/QA
- **Status**: Proposed
- **Target Users**: New users creating accounts

## Traceability

- **PRD Reference**: PRD §Auth
- **TDD Reference**: TDD §Auth-API

## Acceptance Criteria

Each acceptance criterion must be met for this requirement to be considered complete.

### FR-001-AC01-A

**Criterion**: Given a valid email+password, POST /auth/register creates a user record and sends a verification email within **<1s**.

- **Test Method**: API integration
- **Evidence Required**: HTTP recordings, DB snapshot (user+token), email spool

### FR-001-AC01-B

**Criterion**: Password policy enforced: length ≥12, 1 upper, 1 lower, 1 digit or symbol; weak passwords rejected with code `WEAK_PASSWORD`.

- **Test Method**: Unit + API negative
- **Evidence Required**: Validator test, sample payloads

### FR-001-AC02-A

**Criterion**: Unverified users cannot access protected routes; responses are **401** (API) or redirect to **/login** (SPA).

- **Test Method**: E2E (Playwright)
- **Evidence Required**: Screenshots, 401 traces

### FR-001-AC02-B

**Criterion**: Email verification token TTL **= 24h**; using an expired token returns **410 Gone** and offers resend flow.

- **Test Method**: Integration + E2E
- **Evidence Required**: DB token TTL, HTTP recordings

### FR-001-AC02-C

**Criterion**: Resend verification limited to **5 requests/24h/IP**; further attempts respond **429** with `Retry-After`.

- **Test Method**: Rate-limit integration
- **Evidence Required**: Header dump, logs

### FR-001-AC03-A

**Criterion**: Duplicate registration for an existing email is rejected with `409 CONFLICT`; no second user record is created.

- **Test Method**: API negative
- **Evidence Required**: DB before/after

### FR-001-AC03-B

**Criterion**: Email normalization (case-folding/trim) prevents duplicates differing only by case/whitespace.

- **Test Method**: Unit
- **Evidence Required**: Normalization tests

### FR-001-AC03-C

**Criterion**: After a successful verification the user can login in the application.

- **Test Method**: Unit
- **Evidence Required**: DB before/after

## Test Strategy

- API integration
- API negative
- E2E (Playwright)
- Integration + E2E
- Rate-limit integration
- Unit
- Unit + API negative

## Evidence Requirements

- DB before/after
- DB token TTL, HTTP recordings
- HTTP recordings, DB snapshot (user+token), email spool
- Header dump, logs
- Normalization tests
- Screenshots, 401 traces
- Validator test, sample payloads

## Use Cases

### Primary Use Cases

- User provides email and password to create account
- User receives verification email and clicks link
- User completes registration and can log in

### Edge Cases

- User registers with duplicate email (case variations)
- User requests verification email multiple times
- User attempts to use expired verification token
- User provides weak password that fails policy

## Dependencies

### Technical Dependencies

- Email service (SMTP/nodemailer)
- Database for user storage
- JWT token generation

### External Dependencies

- Email delivery service

## Constraints

### Technical Constraints

- Email verification token TTL = 24h
- Rate limiting: 5 resend requests/24h/IP

### Business Constraints

- Password policy must be enforced
- Unverified accounts cannot access protected routes

## Assumptions

- Users have access to email inbox
- Email delivery is reliable (<1s for verification email)
- Users understand email verification process

## Risks & Issues

- **Risk**: Email delivery delays could frustrate users
- **Risk**: Spam filters may block verification emails
- **Risk**: Rate limiting may prevent legitimate users from resending emails
