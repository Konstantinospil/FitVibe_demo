# US-3.5-AC01: Follow/Unfollow Functionality

---

**AC ID**: US-3.5-AC01  
**Story ID**: [US-3.5](../d.User_stories/US-3.5-user-following.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration + E2E  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Users can follow/unfollow other users via POST /api/v1/users/:alias/follow and DELETE /api/v1/users/:alias/follow; users cannot follow themselves (422 error).

**SMART Criteria Checklist**:

- **Specific**: Clear API endpoints and self-follow prevention
- **Measurable**: Follow/unfollow works, 422 for self-follow
- **Achievable**: Standard follow pattern
- **Relevant**: Core social functionality
- **Time-bound**: N/A

## Test Method

Integration tests verify API functionality and E2E tests verify complete workflow.

## Evidence Required

- Follow button tests
- Follower count tests
- Self-follow prevention verification

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
