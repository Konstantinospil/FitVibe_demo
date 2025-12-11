# US-3.6: Session Cloning

---

**Story ID**: US-3.6  
**Epic ID**: [E3](../b.Epics/E3-sharing-and-community.md)  
**Title**: Session Cloning  
**Status**: Proposed  
**Story Points**: 5  
**Priority**: Medium  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** authenticated user  
**I want** to clone public sessions into my planner  
**So that** I can reuse workouts created by others

## Description

Users need the ability to clone public sessions into their planner as planned sessions. Cloned sessions must preserve attribution and allow modifications without affecting the original.

## Related Acceptance Criteria

- [US-3.6-AC01](../e.Acceptance_Criteria/US-3.6-AC01.md): Session cloning
- [US-3.6-AC02](../e.Acceptance_Criteria/US-3.6-AC02.md): Attribution preservation
- [US-3.6-AC03](../e.Acceptance_Criteria/US-3.6-AC03.md): Clone modifications

## Dependencies

### Story Dependencies

- [US-3.1: Public Feed](../d.User_stories/US-3.1-public-feed.md): Public sessions must exist
- [FR-004: Planner](../a.Requirements/FR-004-planner.md): Planner must exist

## Technical Notes

- Cloned sessions created as planned sessions
- Attribution via source_session_id or metadata
- Original session unaffected by modifications

## Test Strategy

- Integration tests for clone operations
- E2E tests for complete workflow

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code implemented and reviewed
- [ ] Tests written and passing (≥80% coverage)
- [ ] Documentation updated
- [ ] Evidence collected for all ACs

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
