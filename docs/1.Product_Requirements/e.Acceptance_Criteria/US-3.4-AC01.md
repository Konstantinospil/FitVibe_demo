# US-3.4-AC01: Comment Creation

---

**AC ID**: US-3.4-AC01  
**Story ID**: [US-3.4](../d.User_stories/US-3.4-comments.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: E2E  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Users can comment on public sessions via POST /api/v1/feed/item/:feedItemId/comments with body (plain text, max 500 chars); comments are idempotent.

**SMART Criteria Checklist**:

- **Specific**: Clear API endpoint, format, and size limit
- **Measurable**: Comments created, max 500 chars, idempotent
- **Achievable**: Standard comment pattern
- **Relevant**: Core social engagement functionality
- **Time-bound**: N/A

## Test Method

E2E tests verify comment creation.

## Evidence Required

- Comment UI screenshots
- Comment creation tests

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-3.4](../d.User_stories/US-3.4-comments.md)
- **Epic**: [E3](../b.Epics/E3-sharing-and-community.md)
- **Requirement**: [FR-011](../a.Requirements/FR-011-sharing-and-community.md)
- **PRD Reference**: PRD §Sharing & Community
- **TDD Reference**: TDD §Sharing & Community

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
