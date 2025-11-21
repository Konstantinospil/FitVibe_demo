# NFR-001 — Security

---

**Requirement ID**: NFR-001
**Type**: Non-Functional Requirement
**Title**: Security
**Status**: Proposed
**Priority**: High
**Gate**: GOLD
**Owner**: SEC/ENG
**Generated**: 2025-11-21T20:33:59.198056

---

## Executive Summary

This non-functional requirement defines security standards and constraints for the FitVibe platform.

Ensure platform security through headers, rate limiting, and threat protection.

## Business Context

- **Business Objective**: Ensure platform security through headers, rate limiting, and threat protection.
- **Success Criteria**: Security headers are properly configured, rate limiting prevents abuse, and threats are detected.
- **Priority**: High
- **Quality Gate**: GOLD
- **Owner**: SEC/ENG
- **Status**: Proposed
- **Target Users**: All users (security affects everyone)

## Traceability

- **PRD Reference**: PRD §Security
- **TDD Reference**: TDD §Security

## Acceptance Criteria

Each acceptance criterion must be met for this requirement to be considered complete.

### NFR-001-AC01-A

**Criterion**: CSP: no inline scripts/styles; `script-src` uses nonces; report-only passes 7 days before enforce with ≤1% violations.

- **Test Method**: Headers + ZAP
- **Evidence Required**: Header dump, ZAP report

### NFR-001-AC01-B

**Criterion**: HSTS (min-age ≥ 6 months), Referrer-Policy strict, Permissions-Policy limits sensors; cookies flagged properly.

- **Test Method**: Headers test
- **Evidence Required**: Curl captures

### NFR-001-AC02-A

**Criterion**: Rate-limit `/auth/*`: ≥10 req/min/IP; return **429** with `Retry-After`.

- **Test Method**: Integration
- **Evidence Required**: Logs + headers

### NFR-001-AC02-B

**Criterion**: CAPTCHA challenge after sustained abuse (>50 req/10min/IP) toggled via feature flag.

- **Test Method**: E2E
- **Evidence Required**: Abuse sim logs

### NFR-001-AC03-A

**Criterion**: JWT claims validated: `aud/iss/exp` + clock skew ≤30s; alg pinned RS256; kid rotation tested.

- **Test Method**: Unit + Integration
- **Evidence Required**: JWT samples

### NFR-001-AC03-B

**Criterion**: Upload AV scan rejects EICAR and quarantines file with user-safe message.

- **Test Method**: Integration
- **Evidence Required**: AV logs

## Test Strategy

- E2E
- Headers + ZAP
- Headers test
- Integration
- Unit + Integration

## Evidence Requirements

- AV logs
- Abuse sim logs
- Curl captures
- Header dump, ZAP report
- JWT samples
- Logs + headers

## Use Cases

### Primary Use Cases

- Security headers prevent XSS attacks
- Rate limiting prevents brute force attacks
- CAPTCHA challenges suspicious activity
- JWT validation prevents token tampering

### Edge Cases

- Legitimate users hit rate limits
- CAPTCHA fails for accessibility users
- Clock skew causes JWT validation failures

## Dependencies

### Technical Dependencies

- NGINX for headers
- Rate limiting library
- CAPTCHA service
- AV scanning service

### External Dependencies

- CAPTCHA provider (if used)
- Antivirus service

## Constraints

### Technical Constraints

- CSP report-only for 7 days
- HSTS min-age ≥6 months
- Rate limit ≥10 req/min/IP

### Business Constraints

- Security must not degrade user experience
- CAPTCHA via feature flag

## Assumptions

- Security headers are supported by browsers
- Rate limiting thresholds are appropriate
- AV scanning is reliable

## Risks & Issues

- **Risk**: Overly strict security may break functionality
- **Risk**: Rate limiting may block legitimate users
- **Risk**: AV scanning may be slow
