# FR-003 — Auth‑Wall

---

**Requirement ID**: FR-003
**Type**: Functional Requirement
**Title**: Auth‑Wall
**Status**: Proposed
**Priority**: High
**Gate**: GOLD
**Owner**: ENG/QA
**Generated**: 2025-11-21T20:33:59.187950

---

## Executive Summary

This functional requirement specifies auth‑wall capabilities that the system must provide.

Enforce authentication requirement for all platform access, ensuring privacy-by-default.

## Business Context

- **Business Objective**: Enforce authentication requirement for all platform access, ensuring privacy-by-default.
- **Success Criteria**: All unauthenticated requests to protected resources are blocked or redirected to login.
- **Priority**: High
- **Quality Gate**: GOLD
- **Owner**: ENG/QA
- **Status**: Proposed
- **Target Users**: All users (authenticated and unauthenticated)

## Traceability

- **PRD Reference**: PRD §Privacy
- **TDD Reference**: ADR‑0012; TDD §Middleware

## Acceptance Criteria

Each acceptance criterion must be met for this requirement to be considered complete.

### FR-003-AC01

**Criterion**: Unauthenticated SPA navigation to any route except `/login` and `/register` redirects to `/login`.

- **Test Method**: E2E
- **Evidence Required**: Screenshots, router traces

### FR-003-AC02

**Criterion**: Unauthenticated API calls to `/api/**` return **401** `{ error: "unauthorized" }`.

- **Test Method**: API integration
- **Evidence Required**: HTTP traces

### FR-003-AC03-A

**Criterion**: Legacy public/share links return **404**;

- **Test Method**: E2E negative
- **Evidence Required**: Screenshots

### FR-003-AC03-B

**Criterion**: Static assets for auth pages remain reachable (200) and cacheable.

- **Test Method**: Static tests
- **Evidence Required**: HTTP headers

## Test Strategy

- API integration
- E2E
- E2E negative
- Static tests

## Evidence Requirements

- HTTP headers
- HTTP traces
- Screenshots
- Screenshots, router traces

## Use Cases

### Primary Use Cases

- Unauthenticated user navigates to protected route → redirected to /login
- Unauthenticated API call → returns 401
- Authenticated user accesses protected route → allowed

### Edge Cases

- User session expires while navigating
- User attempts to access legacy public/share links
- Static assets must remain accessible

## Dependencies

### Technical Dependencies

- Authentication middleware
- Route guards (frontend)
- API middleware

### Feature Dependencies

- FR-002 (Login & Session)

## Constraints

### Technical Constraints

- Only /login and /register routes accessible without auth
- Static assets must be allowlisted

### Business Constraints

- Privacy-by-default: all content requires authentication

## Assumptions

- Users understand they must log in to access content
- Legacy public links are no longer supported

## Risks & Issues

- **Risk**: Users may be confused by redirect behavior
- **Risk**: SEO impact from requiring authentication
- **Risk**: Legacy bookmarks may break
