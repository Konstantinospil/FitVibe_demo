# US-1.4-AC04: Combined Measures and Value Validation

---

**AC ID**: US-1.4-AC04  
**Story ID**: [US-1.4](../d.User_stories/US-1.4-profile-measurements.md)  
**Status**: Proposed  
**Priority**: High  
**Test Method**: Integration + E2E  
**Created**: 2026-01-04  
**Updated**: 2026-01-04

---

## Criterion

Users can define a combined measurement based on two existing attributes (e.g., ratio A/B), and any measurement entry outside the configured min/max range is blocked with a validation error; derived values update when source values change.

**SMART Criteria Checklist**:

- **Specific**: Combined measure definition, validation, and updates are defined
- **Measurable**: Validation blocks out-of-range saves and derived values update
- **Achievable**: Standard derived-field and validation logic
- **Relevant**: Supports advanced measurements and data quality
- **Time-bound**: Update occurs on save within ≤500ms

## Test Method

Integration tests validate derived measure definitions and E2E tests validate UI validation behavior.

## Evidence Required

- API logs showing derived measure definition and updates
- E2E results showing validation error on out-of-range input
- UI capture showing derived value refresh after updates

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-1.4](../d.User_stories/US-1.4-profile-measurements.md)
- **Epic**: [E1](../b.Epics/E1-profile-and-settings.md)
- **Requirement**: [FR-009](../a.Requirements/FR-009-profile-and-settings.md)
- **PRD Reference**: PRD §Profile & Settings
- **TDD Reference**: TDD §Profile & Settings

---

**Last Updated**: 2026-01-04  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
