# US-2.1-AC05: Exercise Name Uniqueness

---

**AC ID**: US-2.1-AC05  
**Story ID**: [US-2.1](../user-stories/US-2.1-exercise-crud.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Unit + API negative  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

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

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-2.1](../user-stories/US-2.1-exercise-crud.md)
- **Epic**: [E2](../epics/E2-exercise-library.md)
- **Requirement**: [FR-010](../requirements/FR-010-exercise-library.md)
- **PRD Reference**: PRD §Exercise Library
- **TDD Reference**: TDD §Exercise Library

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
