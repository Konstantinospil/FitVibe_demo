# US-1.1-AC04: Weight Unit Conversion

---

**AC ID**: US-1.1-AC04  
**Story ID**: [US-1.1](../d.User_stories/US-1.1-profile-editing.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Weight is stored internally as kg (weight_kg) regardless of user's preferred unit; UI converts for display based on user's weight_unit preference.

**SMART Criteria Checklist**:

- **Specific**: Clear storage format and conversion behavior
- **Measurable**: DB records show kg, UI shows converted value
- **Achievable**: Standard unit conversion pattern
- **Relevant**: Supports user preference while maintaining data consistency
- **Time-bound**: N/A

## Test Method

Integration tests verify storage format and UI conversion.

## Evidence Required

- DB records showing weight stored as kg
- UI conversion tests showing correct display

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-1.1](../d.User_stories/US-1.1-profile-editing.md)
- **Epic**: [E1](../b.Epics/E1-profile-and-settings.md)
- **Requirement**: [FR-009](../a.Requirements/FR-009-profile-and-settings.md)
- **PRD Reference**: PRD §Profile & Settings
- **TDD Reference**: TDD §Profile & Settings

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
