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
**Updated**: 2025-01-21

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

- **Verification Token**: Generate time-limited verification tokens (TTL = 24h)
- **Token Expiration**: Expired tokens return 410 Gone with resend option
- **Resend Limits**: Maximum 5 resend requests per 24 hours per IP address
- **Access Control**: Unverified users cannot access protected routes (401 API, redirect to /login SPA)

### Security Features

- **Password Validation**: Enforce password policy at registration
- **Email Normalization**: Case-folding and trimming to prevent duplicate accounts
- **Rate Limiting**: Prevent abuse with IP-based rate limits

## Related Epics

{Note: FR-001 is a foundational requirement. No specific epic exists yet, but it supports all authentication-related features.}

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

## Open Questions

- None

## Related Requirements

- [FR-002: Login & Session](./FR-002-login-and-session.md): Authentication flow continuation
- [FR-003: Auth-Wall](./FR-003-authwall.md): Protected route access control
- [NFR-001: Security](./NFR-001-security.md): Security requirements

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
