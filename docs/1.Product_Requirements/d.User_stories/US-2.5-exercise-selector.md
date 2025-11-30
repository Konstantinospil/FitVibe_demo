# US-2.5: Exercise Selector

---

**Story ID**: US-2.5  
**Epic ID**: [E2](../b.Epics/E2-exercise-library.md)  
**Title**: Exercise Selector  
**Status**: Proposed  
**Story Points**: 3  
**Priority**: Medium  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** authenticated user  
**I want** to select exercises from my library when planning or logging sessions  
**So that** I can easily add exercises to my workouts

## Description

Users need an exercise selector component that displays personal exercises, global exercises, and public exercises (excluding archived). The selector should support search and filtering.

## Related Acceptance Criteria

- [US-2.5-AC01](../e.Acceptance_Criteria/US-2.5-AC01.md): Exercise selector display
- [US-2.5-AC02](../e.Acceptance_Criteria/US-2.5-AC02.md): Exercise selector search

## Dependencies

### Story Dependencies

- [US-2.1: Exercise CRUD](../d.User_stories/US-2.1-exercise-crud.md): Exercises must exist
- [US-2.2: Exercise Search](../d.User_stories/US-2.2-exercise-search.md): Search functionality
- [FR-004: Planner](../a.Requirements/FR-004-planner.md): Used in planner
- [FR-005: Logging & Import](../a.Requirements/FR-005-logging-and-import.md): Used in logger

## Technical Notes

- Displays: personal, global, and public exercises
- Excludes archived exercises
- Supports search and filtering

## Test Strategy

- E2E tests for selector functionality
- Integration tests for exercise list API

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code implemented and reviewed
- [ ] Tests written and passing (≥80% coverage)
- [ ] Documentation updated
- [ ] Evidence collected for all ACs

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
