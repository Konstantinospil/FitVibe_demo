# US-1.1: Profile Editing

---

**Story ID**: US-1.1  
**Epic ID**: [E1](../b.Epics/E1-profile-and-settings.md)  
**Title**: Profile Editing  
**Status**: Done  
**Story Points**: 5  
**Priority**: Medium  
**Created**: 2025-01-21  
**Updated**: 2025-12-14  
**Completed**: 2025-12-14

---

## User Story

**As a** authenticated user  
**I want** to edit my profile information (alias, weight, fitness level, training frequency)  
**So that** I can keep my profile up to date and personalize my experience

## Description

Users need the ability to edit their profile information with proper validation, immutable field protection, and audit logging. The system must handle weight unit conversion and ensure data integrity.

## Related Acceptance Criteria

- [US-1.1-AC01](../e.Acceptance_Criteria/US-1.1-AC01.md): Profile editing API
- [US-1.1-AC02](../e.Acceptance_Criteria/US-1.1-AC02.md): Field validation
- [US-1.1-AC03](../e.Acceptance_Criteria/US-1.1-AC03.md): Immutable fields protection
- [US-1.1-AC04](../e.Acceptance_Criteria/US-1.1-AC04.md): Weight unit conversion
- [US-1.1-AC05](../e.Acceptance_Criteria/US-1.1-AC05.md): Audit logging

## Dependencies

### Feature Dependencies

- [FR-001: User Registration](../a.Requirements/FR-001-user-registration.md): User accounts required
- [FR-002: Login & Session](../a.Requirements/FR-002-login-and-session.md): Authentication required

## Technical Notes

- Response time ≤500ms
- Weight stored internally as kg, converted for display
- Immutable fields: date_of_birth, gender
- All changes audit-logged

## Test Strategy

- Integration tests for API endpoints
- E2E tests for complete workflow
- Unit tests for validation logic

## Definition of Done

- [x] All acceptance criteria met
- [x] Code implemented and reviewed
- [x] Tests written and passing (≥80% coverage)
- [x] Documentation updated
- [x] Evidence collected for all ACs

---

**Last Updated**: 2025-12-14  
**Next Review**: N/A (Story completed)
