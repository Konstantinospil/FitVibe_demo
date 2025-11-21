# FR-008 — Admin & RBAC

---

**Requirement ID**: FR-008
**Type**: Functional Requirement
**Title**: Admin & RBAC
**Status**: Proposed
**Priority**: High
**Gate**: GOLD
**Owner**: ENG/QA
**Generated**: 2025-11-21T20:33:59.196816

---

## Executive Summary

This functional requirement specifies admin & rbac capabilities that the system must provide.

Enable administrative control and role-based access control for platform management.

## Business Context

- **Business Objective**: Enable administrative control and role-based access control for platform management.
- **Success Criteria**: Admins can manage users and content with proper authorization and audit logging.
- **Priority**: High
- **Quality Gate**: GOLD
- **Owner**: ENG/QA
- **Status**: Proposed
- **Target Users**: Administrators and coaches

## Traceability

- **PRD Reference**: PRD §Admin
- **TDD Reference**: TDD §RBAC

## Acceptance Criteria

Each acceptance criterion must be met for this requirement to be considered complete.

### FR-008-AC01-A

**Criterion**: Roles: `user`, `coach`, `admin`; route guards deny access appropriately with **403**; no leakage in error text.

- **Test Method**: Unit + API
- **Evidence Required**: Snapshot policies

### FR-008-AC01-B

**Criterion**: Admin actions (adjust points, edit user, delete session) require 2-step confirm and are fully audit-logged.

- **Test Method**: E2E + Integration
- **Evidence Required**: Audit samples

### FR-008-AC02

**Criterion**: RBAC claims come from JWT `roles[]`; middleware rejects tokens missing required role.

- **Test Method**: Unit + API
- **Evidence Required**: JWT samples

## Test Strategy

- E2E + Integration
- Unit + API

## Evidence Requirements

- Audit samples
- JWT samples
- Snapshot policies

## Use Cases

### Primary Use Cases

- Admin adjusts user points with 2-step confirmation
- Admin edits user profile
- Admin deletes inappropriate session
- User with coach role accesses coach-specific features

### Edge Cases

- Admin attempts action without proper role
- Admin action fails but audit log is created
- Role changes take effect immediately

## Dependencies

### Technical Dependencies

- RBAC middleware
- JWT role claims
- Audit logging system

### Feature Dependencies

- FR-002 (Login & Session)

## Constraints

### Technical Constraints

- Roles: user, coach, admin
- All admin actions require 2-step confirm
- 403 for unauthorized access

### Business Constraints

- All admin actions must be audit-logged
- No role information leakage in errors

## Assumptions

- Admins are trusted users
- Role assignments are accurate
- Audit logs are secure

## Risks & Issues

- **Risk**: Privilege escalation attacks
- **Risk**: Admin mistakes may affect many users
- **Risk**: Audit log tampering
