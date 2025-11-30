# US-2.1-AC03: Exercise Archival

---

**AC ID**: US-2.1-AC03  
**Story ID**: [US-2.1](../d.User_stories/US-2.1-exercise-crud.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration + E2E  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Exercises can be archived (soft delete) via DELETE /api/v1/exercises/:id; archived exercises have archived_at timestamp set; they are hidden from selectors but retained in database.

**SMART Criteria Checklist**:

- **Specific**: Clear archival mechanism and behavior
- **Measurable**: archived_at timestamp set, hidden from selectors
- **Achievable**: Standard soft-delete pattern
- **Relevant**: Preserves data integrity and history
- **Time-bound**: N/A

## Test Method

Integration tests verify archival functionality and E2E tests verify UI behavior.

## Evidence Required

- DB records showing archived_at timestamp
- UI showing archived exercises not in selectors

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
