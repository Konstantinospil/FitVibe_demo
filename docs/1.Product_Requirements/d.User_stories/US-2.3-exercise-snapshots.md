# US-2.3: Exercise Snapshots

---

**Story ID**: US-2.3  
**Epic ID**: [E2](../b.Epics/E2-exercise-library.md)  
**Title**: Exercise Snapshots  
**Status**: Done  
**Story Points**: 3  
**Priority**: Medium  
**Created**: 2025-01-21  
**Updated**: 2025-12-14  
**Completed**: 2025-12-14

---

## User Story

**As a** authenticated user  
**I want** exercise names to be preserved in historical sessions  
**So that** my past workout records remain accurate even if exercises are modified

## Description

When an exercise is used in a session, a snapshot of the exercise name is stored. This ensures historical accuracy - exercise changes don't affect past session records.

## Related Acceptance Criteria

- [US-2.3-AC01](../e.Acceptance_Criteria/US-2.3-AC01.md): Exercise snapshot on use
- [US-2.3-AC02](../e.Acceptance_Criteria/US-2.3-AC02.md): Historical session display

## Dependencies

### Story Dependencies

- [US-2.1: Exercise CRUD](../d.User_stories/US-2.1-exercise-crud.md): Exercises must exist
- [FR-004: Planner](../a.Requirements/FR-004-planner.md): Sessions must exist
- [FR-005: Logging & Import](../a.Requirements/FR-005-logging-and-import.md): Sessions must exist

## Technical Notes

- Snapshot stored in session_exercises.exercise_name
- Snapshot persists even if exercise modified or archived

## Test Strategy

- Integration tests for snapshot creation
- E2E tests for historical display

## Definition of Done

- [x] All acceptance criteria met
- [x] Code implemented and reviewed
- [x] Tests written and passing (≥80% coverage)
- [x] Documentation updated
- [x] Evidence collected for all ACs

---

**Last Updated**: 2025-12-14  
**Next Review**: N/A (Story completed)
