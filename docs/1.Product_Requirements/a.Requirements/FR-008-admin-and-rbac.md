# FR-008 — Admin & RBAC

---

**Requirement ID**: FR-008  
**Type**: Functional Requirement  
**Title**: Admin & RBAC  
**Status**: Done  
**Priority**: High  
**Gate**: GOLD  
**Owner**: ENG/QA  
**Created**: 2025-11-21  
**Updated**: 2025-01-21

---

## Executive Summary

This functional requirement specifies admin & rbac capabilities that the system must provide.

Enable administrative control and role-based access control for platform management.

## Business Context

- **Business Objective**: Enable administrative control and role-based access control for platform management.
- **Success Criteria**: Admins can manage users and content with proper authorization and audit logging.
- **Target Users**: Administrators and coaches

## Traceability

- **PRD Reference**: PRD §Admin
- **TDD Reference**: TDD §RBAC

## Functional Requirements

### Role-Based Access Control

The system shall provide RBAC with the following capabilities:

- **Roles**: Support `user`, `coach`, and `admin` roles
- **Route Guards**: Route guards deny access appropriately with 403 Forbidden
- **JWT Claims**: RBAC claims come from JWT `roles[]` array
- **Middleware Enforcement**: Middleware rejects tokens missing required role
- **No Information Leakage**: Error messages do not leak role information

### Admin Actions

- **2-Step Confirmation**: Admin actions (adjust points, edit user, delete session) require 2-step confirmation
- **Audit Logging**: All admin actions are fully audit-logged
- **User Management**: Admins can view and edit user profiles
- **Content Moderation**: Admins can moderate and delete inappropriate content

### Security

- **Authorization Checks**: All admin endpoints enforce role=admin
- **No IDOR**: No Insecure Direct Object Reference vulnerabilities
- **Audit Trail**: Complete audit trail for all admin actions

## Related Epics

- [E16: Admin & RBAC](../b.Epics/E16-admin-and-rbac.md)

## Dependencies

### Technical Dependencies

- JWT token system
- Middleware system
- Audit logging system

### Feature Dependencies

- [FR-001: User Registration](./FR-001-user-registration.md) - User accounts
- [FR-002: Login & Session](./FR-002-login-and-session.md) - Authentication
- [NFR-001: Security](./NFR-001-security.md) - Security requirements

## Constraints

### Technical Constraints

- Role checks must be fast (<10ms)
- Audit logging must not impact performance
- 2-step confirmation required for destructive actions

### Business Constraints

- Admin actions must be transparent
- Role assignments must be secure

## Assumptions

- Administrators are trusted users
- Role assignments are managed securely
- Audit logs are reviewed regularly

## Risks & Issues

- **Risk**: Unauthorized access to admin functions
- **Risk**: Admin actions may affect many users
- **Risk**: Audit logs may grow very large

## Open Questions

- Should there be role hierarchies?
- Should coaches have limited admin capabilities?

## Related Requirements

- [FR-001: User Registration](./FR-001-user-registration.md) - User management
- [FR-002: Login & Session](./FR-002-login-and-session.md) - Authentication
- [FR-006: Gamification](./FR-006-gamification.md) - Points adjustment
- [NFR-001: Security](./NFR-001-security.md) - Security requirements

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
