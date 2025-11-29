# US-2.1: Exercise CRUD

---

**Story ID**: US-2.1  
**Epic ID**: [E2](../epics/E2-exercise-library.md)  
**Title**: Exercise CRUD  
**Status**: Proposed  
**Story Points**: 5  
**Priority**: Medium  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** authenticated user  
**I want** to create, update, and archive my personal exercises  
**So that** I can build and manage my exercise library

## Description

Users need the ability to perform CRUD operations on exercises with proper validation, visibility controls, and archival (soft-delete) to maintain historical accuracy.

## Related Acceptance Criteria

- [US-2.1-AC01](../acceptance-criteria/US-2.1-AC01.md): Exercise creation
- [US-2.1-AC02](../acceptance-criteria/US-2.1-AC02.md): Exercise updates
- [US-2.1-AC03](../acceptance-criteria/US-2.1-AC03.md): Exercise archival
- [US-2.1-AC04](../acceptance-criteria/US-2.1-AC04.md): Exercise visibility model
- [US-2.1-AC05](../acceptance-criteria/US-2.1-AC05.md): Name uniqueness

## Dependencies

### Feature Dependencies

- [FR-001: User Registration](../requirements/FR-001-user-registration.md): User accounts required
- [FR-002: Login & Session](../requirements/FR-002-login-and-session.md): Authentication required

## Technical Notes

- Exercises saved within ≤500ms
- Soft-delete via archived_at timestamp
- Visibility: private (default) or public
- Name uniqueness per owner

## Test Strategy

- Integration tests for API endpoints
- E2E tests for complete workflow
- Unit tests for validation logic

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code implemented and reviewed
- [ ] Tests written and passing (≥80% coverage)
- [ ] Documentation updated
- [ ] Evidence collected for all ACs

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
