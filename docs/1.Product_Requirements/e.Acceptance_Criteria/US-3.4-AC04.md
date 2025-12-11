# US-3.4-AC04: Comment Rate Limiting

---

**AC ID**: US-3.4-AC04  
**Story ID**: [US-3.4](../d.User_stories/US-3.4-comments.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Comment rate limiting: 20 comments per hour per user; exceeding limit returns 429 with Retry-After header.

**SMART Criteria Checklist**:

- **Specific**: Clear rate limit and error response
- **Measurable**: 429 status code with Retry-After header
- **Achievable**: Standard rate limiting pattern
- **Relevant**: Prevents spam and abuse
- **Time-bound**: 20 comments per hour

## Test Method

Integration tests verify rate limiting.

## Evidence Required

- Rate limit tests
- HTTP headers showing Retry-After

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
