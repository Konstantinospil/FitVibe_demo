# US-2.1-AC02: Exercise Updates

---

**AC ID**: US-2.1-AC02  
**Story ID**: [US-2.1](../d.User_stories/US-2.1-exercise-crud.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration + E2E  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Users can update their own exercises via PATCH /api/v1/exercises/:id; edits preserve historical accuracy; unauthorized edits return 403.

**SMART Criteria Checklist**:

- **Specific**: Clear API endpoint and access control
- **Measurable**: 403 status code for unauthorized edits
- **Achievable**: Standard access control pattern
- **Relevant**: Prevents unauthorized modifications
- **Time-bound**: N/A

## Test Method

Integration tests verify update functionality and access control.

## Evidence Required

- Update tests showing successful modification
- Access control verification showing 403 for unauthorized

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-2.1](../d.User_stories/US-2.1-exercise-crud.md)
- **Epic**: [E2](../b.Epics/E2-exercise-library.md)
- **Requirement**: [FR-010](../a.Requirements/FR-010-exercise-library.md)
- **PRD Reference**: PRD §Exercise Library
- **TDD Reference**: TDD §Exercise Library

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
