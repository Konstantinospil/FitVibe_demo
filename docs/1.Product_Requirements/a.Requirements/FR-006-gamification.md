# FR-006 — Gamification

---

**Requirement ID**: FR-006  
**Type**: Functional Requirement  
**Title**: Gamification  
**Status**: Done  
**Priority**: Medium  
**Gate**: SILVER  
**Owner**: ENG  
**Created**: 2025-11-21  
**Updated**: 2025-01-21

---

## Executive Summary

This functional requirement specifies gamification capabilities that the system must provide.

Motivate users through points and badges awarded for completing training sessions.

## Business Context

- **Business Objective**: Motivate users through points and badges awarded for completing training sessions.
- **Success Criteria**: Users receive points and badges upon session completion, visible in profile within 2s.
- **Target Users**: Authenticated users completing workouts

## Traceability

- **PRD Reference**: PRD §Gamification
- **TDD Reference**: TDD §Rules

## Functional Requirements

### Points System

The system shall provide a points system with the following capabilities:

- **Deterministic Scoring**: Scoring rules are deterministic and pure
- **Non-Negative Points**: No negative points awarded
- **Bounded Totals**: User total ≤ configured max per period
- **Auto-Award**: Points automatically awarded on session completion

### Badge System

- **Badge Awards**: Badges appear in profile within ≤2s of qualifying event
- **Persistence**: Badges persist after page reload
- **Revocation Support**: Badge revocation/adjustment re-evaluates affected users within one job cycle
- **Audit Trail**: All badge adjustments are audit-logged

### Anti-Gaming

- **Scoring Protection**: Scoring internals never exposed via API/UI
- **Admin Adjustments**: Admin adjustments create immutable audit entries
- **Anomaly Detection**: Anti-gaming checks logged on threshold breach

## Related Epics

- [E14: Gamification](../b.Epics/E14-gamification.md)

## Dependencies

### Technical Dependencies

- Background job system
- Audit logging system
- Scoring rule engine

### Feature Dependencies

- [FR-004: Planner](./FR-004-planner.md) - Session planning
- [FR-005: Logging & Import](./FR-005-logging-and-import.md) - Session completion
- [FR-008: Admin & RBAC](./FR-008-admin-and-rbac.md) - Admin adjustments

## Constraints

### Technical Constraints

- Badge awards visible within ≤2s
- Scoring rules must be deterministic
- No negative points allowed

### Business Constraints

- Points and badges must motivate without gaming
- Admin adjustments must be transparent

## Assumptions

- Users are motivated by points and badges
- Scoring rules are fair and transparent
- Anti-gaming measures are effective

## Risks & Issues

- **Risk**: Users may game the system for points
- **Risk**: Scoring rules may not motivate all users
- **Risk**: Badge awards may not appear in time

## Open Questions

- Should there be leaderboards?
- Should points expire after a period?

## Related Requirements

- [FR-004: Planner](./FR-004-planner.md) - Session planning
- [FR-005: Logging & Import](./FR-005-logging-and-import.md) - Session completion
- [FR-008: Admin & RBAC](./FR-008-admin-and-rbac.md) - Admin controls

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
