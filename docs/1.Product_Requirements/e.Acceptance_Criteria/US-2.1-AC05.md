# US-2.1-AC05: Exercise Name Uniqueness

---

**AC ID**: US-2.1-AC05  
**Story ID**: [US-2.1](../d.User_stories/US-2.1-exercise-crud.md)  
**Status**: Done  
**Priority**: Medium  
**Test Method**: Unit + API negative  
**Created**: 2025-01-21  
**Updated**: 2025-12-14  
**Completed**: 2025-12-14

---

## Criterion

Exercise name uniqueness enforced per owner: (owner_id, normalized_name) unique constraint; duplicate names rejected with 409 CONFLICT.

**SMART Criteria Checklist**:

- **Specific**: Clear uniqueness rule and error response
- **Measurable**: 409 status code for duplicates
- **Achievable**: Standard uniqueness constraint
- **Relevant**: Prevents duplicate exercise names per user
- **Time-bound**: N/A

## Test Method

Unit tests for validation logic and API negative tests for error responses.

## Evidence Required

- Uniqueness test results
- Error responses showing 409 CONFLICT

## Verification

- [x] Criterion is specific and measurable
- [x] Test method is appropriate
- [x] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-2.1](../d.User_stories/US-2.1-exercise-crud.md)
- **Epic**: [E2](../b.Epics/E2-exercise-library.md)
- **Requirement**: [FR-010](../a.Requirements/FR-010-exercise-library.md)
- **PRD Reference**: PRD §Exercise Library
- **TDD Reference**: TDD §Exercise Library

---

**Last Updated**: 2025-12-14  
**Verified By**: Development Team  
**Verified Date**: 2025-12-14
