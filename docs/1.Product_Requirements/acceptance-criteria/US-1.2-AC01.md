# US-1.2-AC01: Avatar Upload API

---

**AC ID**: US-1.2-AC01  
**Story ID**: [US-1.2](../user-stories/US-1.2-avatar-upload.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Users can upload avatar images via POST /api/v1/users/me/avatar; accepted formats: JPEG, PNG, WebP; max size 5MB; rejected with 422 if invalid.

**SMART Criteria Checklist**:

- **Specific**: Clear API endpoint, formats, and size limit
- **Measurable**: 422 status code for invalid files
- **Achievable**: Standard file upload pattern
- **Relevant**: Core functionality for avatar management
- **Time-bound**: N/A

## Test Method

Integration tests verify upload functionality and validation.

## Evidence Required

- Upload logs showing successful uploads
- Error responses for invalid files

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-1.2](../user-stories/US-1.2-avatar-upload.md)
- **Epic**: [E1](../epics/E1-profile-and-settings.md)
- **Requirement**: [FR-009](../requirements/FR-009-profile-and-settings.md)
- **PRD Reference**: PRD §Profile & Settings
- **TDD Reference**: TDD §Profile & Settings

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
