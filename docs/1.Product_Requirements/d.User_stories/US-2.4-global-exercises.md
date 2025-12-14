# US-2.4: Global Exercises

---

**Story ID**: US-2.4  
**Epic ID**: [E2](../b.Epics/E2-exercise-library.md)  
**Title**: Global Exercises  
**Status**: Done  
**Story Points**: 5  
**Priority**: Medium  
**Created**: 2025-01-21  
**Updated**: 2025-12-14  
**Completed**: 2025-12-14

---

## User Story

**As an** administrator  
**I want** to create and manage global exercises  
**So that** all users have access to a curated exercise library

## Description

Administrators need the ability to create system-wide exercises (owner_id = null) that are accessible to all users. Non-admin users cannot modify global exercises.

## Related Acceptance Criteria

- [US-2.4-AC01](../e.Acceptance_Criteria/US-2.4-AC01.md): Admin creates global exercises
- [US-2.4-AC02](../e.Acceptance_Criteria/US-2.4-AC02.md): Global exercise access control

## Dependencies

### Feature Dependencies

- [FR-008: Admin & RBAC](../a.Requirements/FR-008-admin-and-rbac.md): Admin role required

## Technical Notes

- Global exercises have owner_id = null
- Accessible to all users
- Only admins can modify

## Test Strategy

- Integration tests for admin operations
- E2E tests for access control

## Definition of Done

- [x] All acceptance criteria met
- [x] Code implemented and reviewed
- [x] Tests written and passing (≥80% coverage)
- [x] Documentation updated
- [x] Evidence collected for all ACs

---

**Last Updated**: 2025-12-14  
**Next Review**: N/A (Story completed)
