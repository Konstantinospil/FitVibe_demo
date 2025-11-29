# US-2.4-AC02: Global Exercise Access Control

---

**AC ID**: US-2.4-AC02  
**Story ID**: [US-2.4](../user-stories/US-2.4-global-exercises.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration + E2E  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Administrators can edit and archive global exercises; non-admin users cannot modify global exercises (403 Forbidden).

**SMART Criteria Checklist**:

- **Specific**: Clear access control rules
- **Measurable**: 403 status code for non-admin attempts
- **Achievable**: Standard access control pattern
- **Relevant**: Prevents unauthorized modifications
- **Time-bound**: N/A

## Test Method

Integration tests verify access control and E2E tests verify UI behavior.

## Evidence Required

- Admin edit tests
- Non-admin access denial verification

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
