# US-3.5-AC02: Follower Counts

---

**AC ID**: US-3.5-AC02  
**Story ID**: [US-3.5](../d.User_stories/US-3.5-user-following.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration + E2E  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Follower and following counts update correctly; counts displayed on user profiles; GET /api/v1/users/:alias/followers and /following return paginated lists.

**SMART Criteria Checklist**:

- **Specific**: Clear count update and display requirements
- **Measurable**: Counts update correctly, displayed on profiles, paginated lists
- **Achievable**: Standard count pattern
- **Relevant**: User experience requirement
- **Time-bound**: N/A

## Test Method

Integration tests verify count updates and E2E tests verify UI display.

## Evidence Required

- Follower count tests
- UI screenshots
- API responses

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-3.5](../d.User_stories/US-3.5-user-following.md)
- **Epic**: [E3](../b.Epics/E3-sharing-and-community.md)
- **Requirement**: [FR-011](../a.Requirements/FR-011-sharing-and-community.md)
- **PRD Reference**: PRD §Sharing & Community
- **TDD Reference**: TDD §Sharing & Community

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
