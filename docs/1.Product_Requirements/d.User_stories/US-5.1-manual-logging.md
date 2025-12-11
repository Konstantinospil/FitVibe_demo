# US-5.1: Manual Logging

---

**Story ID**: US-5.1  
**Epic ID**: [E5](../b.Epics/E5-logging-and-import.md)  
**Title**: Manual Logging  
**Status**: Proposed  
**Story Points**: 5  
**Priority**: Medium  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** user  
**I want** to log session metrics manually (duration, distance, heart rate, sets, reps, weight)  
**So that** I can track my workouts even when I don't have device data

## Description

Users need the ability to manually enter workout metrics through a logging interface. The system must support various metric types (duration, distance, heart rate, sets, reps, weight) and provide proper validation and unit conversion. All edits must be audit-logged.

## Related Acceptance Criteria

- [US-5.1-AC01](../e.Acceptance_Criteria/US-5.1-AC01.md): Session metrics logging
- [US-5.1-AC02](../e.Acceptance_Criteria/US-5.1-AC02.md): Audit logging
- [US-5.1-AC03](../e.Acceptance_Criteria/US-5.1-AC03.md): Logger frontend

## Dependencies

### Story Dependencies

- [FR-004: Planner](../a.Requirements/FR-004-planner.md): Session planning
- [FR-001: User Registration](../a.Requirements/FR-001-user-registration.md): User accounts

## Technical Notes

- Metrics stored in session_exercises table
- Unit conversion handled client-side with server-side validation
- Audit log tracks all field changes

## Test Strategy

- Integration tests for API endpoints
- E2E tests for complete logging workflow
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
