# US-2.3: Exercise Snapshots

---

**Story ID**: US-2.3  
**Epic ID**: [E2](../epics/E2-exercise-library.md)  
**Title**: Exercise Snapshots  
**Status**: Proposed  
**Story Points**: 3  
**Priority**: Medium  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** authenticated user  
**I want** exercise names to be preserved in historical sessions  
**So that** my past workout records remain accurate even if exercises are modified

## Description

When an exercise is used in a session, a snapshot of the exercise name is stored. This ensures historical accuracy - exercise changes don't affect past session records.

## Related Acceptance Criteria

- [US-2.3-AC01](../acceptance-criteria/US-2.3-AC01.md): Exercise snapshot on use
- [US-2.3-AC02](../acceptance-criteria/US-2.3-AC02.md): Historical session display

## Dependencies

### Story Dependencies

- [US-2.1: Exercise CRUD](../user-stories/US-2.1-exercise-crud.md): Exercises must exist
- [FR-004: Planner](../requirements/FR-004-planner.md): Sessions must exist
- [FR-005: Logging & Import](../requirements/FR-005-logging-and-import.md): Sessions must exist

## Technical Notes

- Snapshot stored in session_exercises.exercise_name
- Snapshot persists even if exercise modified or archived

## Test Strategy

- Integration tests for snapshot creation
- E2E tests for historical display

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code implemented and reviewed
- [ ] Tests written and passing (≥80% coverage)
- [ ] Documentation updated
- [ ] Evidence collected for all ACs

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
