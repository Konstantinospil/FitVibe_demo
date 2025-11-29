# US-1.1-AC02: Profile Field Validation

---

**AC ID**: US-1.1-AC02  
**Story ID**: [US-1.1](../user-stories/US-1.1-profile-editing.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Unit + API negative  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Profile field validation: alias max 32 chars, weight range 20-400 kg (or equivalent in lbs), fitness level enum (beginner/intermediate/advanced/elite), training frequency enum (rarely/1_2_per_week/3_4_per_week/5_plus_per_week). Invalid values rejected with 422 and clear error messages.

**SMART Criteria Checklist**:

- **Specific**: Clear validation rules for each field
- **Measurable**: 422 status code for invalid values
- **Achievable**: Standard validation pattern
- **Relevant**: Prevents invalid data entry
- **Time-bound**: N/A

## Test Method

Unit tests for validation logic and API negative tests for error responses.

## Evidence Required

- Validation test results
- Error message samples showing clear messages

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
