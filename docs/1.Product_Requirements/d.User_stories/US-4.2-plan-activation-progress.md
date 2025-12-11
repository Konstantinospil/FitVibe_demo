# US-4.2: Plan Activation & Progress

---

**Story ID**: US-4.2  
**Epic ID**: [E4](../b.Epics/E4-planner-completion.md)  
**Title**: Plan Activation & Progress  
**Status**: Proposed  
**Story Points**: 5  
**Priority**: Medium  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** authenticated user  
**I want** to activate training plans and track their progress  
**So that** I can see how well I'm following my planned schedule

## Description

Users need the ability to activate training plans, which generates scheduled sessions based on plan templates and recurrence rules. The system must track plan progress by calculating completion percentage and updating it as sessions are completed.

## Related Acceptance Criteria

- [US-4.2-AC01](../e.Acceptance_Criteria/US-4.2-AC01.md): Plan activation
- [US-4.2-AC02](../e.Acceptance_Criteria/US-4.2-AC02.md): Progress tracking
- [US-4.2-AC03](../e.Acceptance_Criteria/US-4.2-AC03.md): Plan duration validation

## Dependencies

### Story Dependencies

- [US-4.1: Plan CRUD](../d.User_stories/US-4.1-plan-crud.md): Plans must exist before activation

## Technical Notes

- Activation generates sessions based on recurrence rules
- Progress calculated as (completed_count / session_count) \* 100
- Duration validation: 1-52 weeks, frequency 1-7 sessions/week

## Test Strategy

- Integration tests for activation flow
- Unit tests for progress calculation
- E2E tests for complete activation workflow

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code implemented and reviewed
- [ ] Tests written and passing (≥80% coverage)
- [ ] Documentation updated
- [ ] Evidence collected for all ACs

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
