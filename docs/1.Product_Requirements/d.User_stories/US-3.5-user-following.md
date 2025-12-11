# US-3.5: User Following

---

**Story ID**: US-3.5  
**Epic ID**: [E3](../b.Epics/E3-sharing-and-community.md)  
**Title**: User Following  
**Status**: Proposed  
**Story Points**: 3  
**Priority**: Medium  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** authenticated user  
**I want** to follow and unfollow other users  
**So that** I can see content from users I'm interested in

## Description

Users need the ability to follow/unfollow other users with proper follower/following counts, pagination, self-follow prevention, and rate limiting (50 follows per day).

## Related Acceptance Criteria

- [US-3.5-AC01](../e.Acceptance_Criteria/US-3.5-AC01.md): Follow/unfollow functionality
- [US-3.5-AC02](../e.Acceptance_Criteria/US-3.5-AC02.md): Follower counts
- [US-3.5-AC03](../e.Acceptance_Criteria/US-3.5-AC03.md): Follow rate limiting

## Dependencies

### Feature Dependencies

- [FR-009: Profile & Settings](../a.Requirements/FR-009-profile-and-settings.md): User profiles required

## Technical Notes

- Self-follow prevention (422 error)
- Rate limiting: 50 follows per day
- Follower/following lists paginated

## Test Strategy

- Integration tests for follow operations
- E2E tests for complete workflow

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code implemented and reviewed
- [ ] Tests written and passing (≥80% coverage)
- [ ] Documentation updated
- [ ] Evidence collected for all ACs

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
