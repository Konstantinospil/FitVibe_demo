# FR-001 — User Registration

---

**Requirement ID**: FR-001  
**Type**: Functional Requirement  
**Title**: User Registration  
**Status**: Done  
**Priority**: High  
**Gate**: GOLD  
**Owner**: ENG/QA  
**Created**: 2025-11-21  
**Updated**: 2025-12-04  
**Completed**: 2025-12-04

---

## Executive Summary

This functional requirement specifies user registration capabilities that the system must provide.

Enable secure user onboarding with email verification to ensure valid accounts and prevent abuse.

## Business Context

- **Business Objective**: Enable secure user onboarding with email verification to ensure valid accounts and prevent abuse.
- **Success Criteria**: Users can register, verify email, and access the platform within 24 hours of registration.
- **Target Users**: New users creating accounts

## Traceability

- **PRD Reference**: PRD §Auth
- **TDD Reference**: TDD §Auth-API

## Functional Requirements

### User Registration Flow

The system shall provide a secure user registration process with the following capabilities:

- **Email and Password Registration**: Users can register with email and password
- **Email Verification**: Users must verify their email address before accessing protected routes
- **Password Policy**: Enforce strong password requirements (length ≥12, mixed character classes)
- **Duplicate Prevention**: Prevent duplicate registrations with email normalization
- **Rate Limiting**: Limit verification email resend requests to prevent abuse

### Email Verification

- **Verification Token**: Generate time-limited verification tokens (TTL = 15 minutes)
- **Token Expiration**: Expired tokens return 410 Gone with resend option
- **Resend Limits**: Maximum 3 resend requests per hour per user
- **Access Control**: Unverified users cannot access protected routes (401 API, redirect to /login SPA)

### Security Features

- **Password Validation**: Enforce password policy at registration
- **Email Normalization**: Case-folding and trimming to prevent duplicate accounts
- **Rate Limiting**: Prevent abuse with user-based rate limits (3 resend requests per hour per user)

## Related Epics

- [E11: Authentication & Registration](../b.Epics/E11-authentication-and-registration.md)

## Dependencies

### Technical Dependencies

- Email service (SMTP/nodemailer)
- Database for user storage
- JWT token generation

### External Dependencies

- Email delivery service

## Constraints

### Technical Constraints

- Email verification token TTL = 15 minutes
- Rate limiting: 3 resend requests/hour/user
- Auto-purge: Unverified accounts older than 7 days are automatically deleted

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

## Open Questions

- None

## Related Requirements

- [FR-002: Login & Session](./FR-002-login-and-session.md): Authentication flow continuation
- [FR-003: Auth-Wall](./FR-003-authwall.md): Protected route access control
- [NFR-001: Security](./NFR-001-security.md): Security requirements

---

**Last Updated**: 2025-12-04  
**Next Review**: 2026-01-04

---

## Change Log

- **2025-12-04** (Documentation Update): Updated token TTL from 24h to 15 minutes, resend limits from 5/24h/IP to 3/hour/user, and added auto-purge constraint to match PRD and implementation. This change aligns the FR-001 specification with the actual implementation and PRD requirements.
- **2025-12-04** (Completion): FR-001 marked as complete. All critical and non-critical issues resolved including: dedicated resend verification endpoint, frontend resend UI, username input field, email template localization (5 languages), rate limit countdown display, and comprehensive test coverage. Implementation review completed and all acceptance criteria met.
