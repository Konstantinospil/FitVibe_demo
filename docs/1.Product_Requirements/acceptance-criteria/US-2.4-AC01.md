# US-2.4-AC01: Admin Creates Global Exercises

---

**AC ID**: US-2.4-AC01  
**Story ID**: [US-2.4](../user-stories/US-2.4-global-exercises.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration + E2E  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Administrators can create global exercises (owner_id = null) via POST /api/v1/exercises with admin role; global exercises are accessible to all users.

**SMART Criteria Checklist**:

- **Specific**: Clear admin capability and global exercise definition
- **Measurable**: Global exercises accessible to all users
- **Achievable**: Standard admin pattern
- **Relevant**: Provides curated exercise library
- **Time-bound**: N/A

## Test Method

Integration tests verify admin operations and E2E tests verify access.

## Evidence Required

- Admin UI screenshots
- Access control tests showing global access

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-2.4](../user-stories/US-2.4-global-exercises.md)
- **Epic**: [E2](../epics/E2-exercise-library.md)
- **Requirement**: [FR-010](../requirements/FR-010-exercise-library.md)
- **PRD Reference**: PRD §Exercise Library
- **TDD Reference**: TDD §Exercise Library

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
