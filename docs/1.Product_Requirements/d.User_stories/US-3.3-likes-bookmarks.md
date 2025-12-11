# US-3.3: Likes & Bookmarks

---

**Story ID**: US-3.3  
**Epic ID**: [E3](../b.Epics/E3-sharing-and-community.md)  
**Title**: Likes & Bookmarks  
**Status**: Proposed  
**Story Points**: 5  
**Priority**: Medium  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** authenticated user  
**I want** to like and bookmark public sessions  
**So that** I can engage with content and save sessions for later

## Description

Users need the ability to like/unlike public sessions and bookmark/unbookmark sessions. Like counts must update in real-time (≤500ms) and actions must be idempotent.

## Related Acceptance Criteria

- [US-3.3-AC01](../e.Acceptance_Criteria/US-3.3-AC01.md): Like/unlike functionality
- [US-3.3-AC02](../e.Acceptance_Criteria/US-3.3-AC02.md): Like count updates
- [US-3.3-AC03](../e.Acceptance_Criteria/US-3.3-AC03.md): Bookmark functionality
- [US-3.3-AC04](../e.Acceptance_Criteria/US-3.3-AC04.md): Bookmark collection view

## Dependencies

### Story Dependencies

- [US-3.1: Public Feed](../d.User_stories/US-3.1-public-feed.md): Public sessions must exist

## Technical Notes

- Like count updates within ≤500ms
- All actions are idempotent
- Bookmarks paginated

## Test Strategy

- Integration tests for like/bookmark operations
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
