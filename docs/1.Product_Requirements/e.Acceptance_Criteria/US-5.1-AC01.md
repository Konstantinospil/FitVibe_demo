# US-5.1-AC01: Session Metrics Logging

---

**AC ID**: US-5.1-AC01  
**Story ID**: [US-5.1](../d.User_stories/US-5.1-manual-logging.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration + E2E  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Users can log session metrics (duration, distance, heart rate, sets, reps, weight) via PATCH /api/v1/sessions/:id with status='completed'; metrics saved within ≤500ms.

**SMART Criteria Checklist**:

- **Specific**: Clear API endpoint and metric types
- **Measurable**: Metrics saved, response time ≤500ms
- **Achievable**: Standard API pattern
- **Relevant**: Core logging functionality
- **Time-bound**: ≤500ms response time

## Test Method

Integration tests verify API functionality and E2E tests verify complete workflow.

## Evidence Required

- Logging tests
- DB records
- API response times

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-5.1](../d.User_stories/US-5.1-manual-logging.md)
- **Epic**: [E5](../b.Epics/E5-logging-and-import.md)
- **Requirement**: [FR-005](../a.Requirements/FR-005-logging-and-import.md)
- **PRD Reference**: PRD §Logging & Import
- **TDD Reference**: TDD §Logging & Import

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
