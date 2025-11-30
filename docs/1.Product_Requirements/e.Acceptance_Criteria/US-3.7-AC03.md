# US-3.7-AC03: Report Rate Limiting

---

**AC ID**: US-3.7-AC03  
**Story ID**: [US-3.7](../d.User_stories/US-3.7-content-reporting.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Report rate limiting: 10 reports per day per user; exceeding limit returns 429.

**SMART Criteria Checklist**:

- **Specific**: Clear rate limit (10 per day per user) and error response
- **Measurable**: Rate limit enforced, 429 returned when exceeded
- **Achievable**: Standard rate limiting pattern
- **Relevant**: Prevents abuse of reporting system
- **Time-bound**: Per day window

## Test Method

Integration tests verify rate limiting behavior and error responses.

## Evidence Required

- Rate limit tests
- 429 error response verification

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-3.7](../d.User_stories/US-3.7-content-reporting.md)
- **Epic**: [E3](../b.Epics/E3-sharing-and-community.md)
- **Requirement**: [FR-011](../a.Requirements/FR-011-sharing-and-community.md)
- **PRD Reference**: PRD §Sharing & Community
- **TDD Reference**: TDD §Sharing & Community

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
