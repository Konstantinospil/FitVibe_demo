# US-2.1-AC01: Exercise Creation

---

**AC ID**: US-2.1-AC01  
**Story ID**: [US-2.1](../user-stories/US-2.1-exercise-crud.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration + E2E  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Users can create exercises via POST /api/v1/exercises with required fields (name, type_code) and optional fields (muscle_group, equipment, tags, description); exercise saved within ≤500ms.

**SMART Criteria Checklist**:

- **Specific**: Clear API endpoint and field requirements
- **Measurable**: Response time ≤500ms
- **Achievable**: Realistic performance target
- **Relevant**: Core functionality for exercise management
- **Time-bound**: Response time constraint specified

## Test Method

Integration tests verify API functionality and E2E tests verify complete workflow.

## Evidence Required

- DB snapshot showing created exercise
- UI screenshots showing exercise creation
- API response times

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
