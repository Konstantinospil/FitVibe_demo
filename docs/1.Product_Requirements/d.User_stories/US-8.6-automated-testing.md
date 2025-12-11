# US-8.6: Automated Testing

---

**Story ID**: US-8.6  
**Epic ID**: [E8](../b.Epics/E8-accessibility.md)  
**Title**: Automated Testing  
**Status**: Proposed  
**Story Points**: 3  
**Priority**: High  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** developer  
**I want** automated accessibility tests to run in CI  
**So that** I can catch accessibility issues early

## Description

Automated accessibility tests (axe-core) run in CI. Tests cover all pages and components; violations block merge. Accessibility test coverage ≥80% of interactive elements; critical violations (level 1) must be zero.

## Related Acceptance Criteria

- [US-8.6-AC01](../e.Acceptance_Criteria/US-8.6-AC01.md): Automated tests in CI
- [US-8.6-AC02](../e.Acceptance_Criteria/US-8.6-AC02.md): Test coverage and violations

## Dependencies

### Story Dependencies

- [NFR-004: Accessibility](../a.Requirements/NFR-004-a11y.md): Parent requirement

## Technical Notes

- axe-core integration
- CI test execution
- Coverage tracking

## Test Strategy

- Automated accessibility tests
- Coverage measurement
- Violation tracking

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code implemented and reviewed
- [ ] Tests written and passing (≥80% coverage)
- [ ] Documentation updated
- [ ] Evidence collected for all ACs

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
