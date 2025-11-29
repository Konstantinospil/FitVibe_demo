# US-1.1-AC03: Immutable Fields Protection

---

**AC ID**: US-1.1-AC03  
**Story ID**: [US-1.1](../user-stories/US-1.1-profile-editing.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: API negative  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Immutable fields (date_of_birth, gender) cannot be modified; attempts return 403 Forbidden with error code E.USER.IMMUTABLE_FIELD.

**SMART Criteria Checklist**:

- **Specific**: Clear fields that cannot be modified and error response
- **Measurable**: 403 status code with specific error code
- **Achievable**: Standard protection pattern
- **Relevant**: Prevents unauthorized data modification
- **Time-bound**: N/A

## Test Method

API negative tests verify immutable field protection.

## Evidence Required

- HTTP traces showing 403 responses
- Error responses with E.USER.IMMUTABLE_FIELD code

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-1.1](../user-stories/US-1.1-profile-editing.md)
- **Epic**: [E1](../epics/E1-profile-and-settings.md)
- **Requirement**: [FR-009](../requirements/FR-009-profile-and-settings.md)
- **PRD Reference**: PRD §Profile & Settings
- **TDD Reference**: TDD §Profile & Settings

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
