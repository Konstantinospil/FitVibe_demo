# US-3.7-AC01: Content Reporting

---

**AC ID**: US-3.7-AC01  
**Story ID**: [US-3.7](../d.User_stories/US-3.7-content-reporting.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration + E2E  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Users can report inappropriate content (sessions or comments) via POST /api/v1/feed/report with reason and details; reports are idempotent.

**SMART Criteria Checklist**:

- **Specific**: Clear API endpoint and report content types
- **Measurable**: Reports created, idempotent behavior verified
- **Achievable**: Standard reporting pattern
- **Relevant**: Content moderation capability
- **Time-bound**: N/A

## Test Method

Integration tests verify API functionality and E2E tests verify complete workflow.

## Evidence Required

- Report UI screenshots
- Report creation tests

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
