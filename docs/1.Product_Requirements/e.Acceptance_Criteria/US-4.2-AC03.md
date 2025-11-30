# US-4.2-AC03: Plan Duration Validation

---

**AC ID**: US-4.2-AC03  
**Story ID**: [US-4.2](../d.User_stories/US-4.2-plan-activation-progress.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Unit + API negative  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Plan duration validation: duration_weeks ∈ [1..52]; target_frequency ∈ [1..7] sessions per week; invalid values rejected with 422.

**SMART Criteria Checklist**:

- **Specific**: Clear validation rules and error response
- **Measurable**: 422 status code for invalid values
- **Achievable**: Standard validation pattern
- **Relevant**: Prevents invalid plan configurations
- **Time-bound**: N/A

## Test Method

Unit tests for validation logic and API negative tests for error responses.

## Evidence Required

- Validation test results
- Error responses showing 422 status

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-4.2](../d.User_stories/US-4.2-plan-activation-progress.md)
- **Epic**: [E4](../b.Epics/E4-planner-completion.md)
- **Requirement**: [FR-004](../a.Requirements/FR-004-planner.md)
- **PRD Reference**: PRD §Planner
- **TDD Reference**: TDD §Planner

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
