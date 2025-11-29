# US-3.4: Comments

---

**Story ID**: US-3.4  
**Epic ID**: [E3](../epics/E3-sharing-and-community.md)  
**Title**: Comments  
**Status**: Proposed  
**Story Points**: 5  
**Priority**: Medium  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** authenticated user  
**I want** to comment on public sessions  
**So that** I can engage in discussions about workouts

## Description

Users need the ability to comment on public sessions with proper formatting, pagination, deletion controls, and rate limiting (20 comments per hour).

## Related Acceptance Criteria

- [US-3.4-AC01](../acceptance-criteria/US-3.4-AC01.md): Comment creation
- [US-3.4-AC02](../acceptance-criteria/US-3.4-AC02.md): Comment display
- [US-3.4-AC03](../acceptance-criteria/US-3.4-AC03.md): Comment deletion
- [US-3.4-AC04](../acceptance-criteria/US-3.4-AC04.md): Comment rate limiting

## Dependencies

### Story Dependencies

- [US-3.1: Public Feed](../user-stories/US-3.1-public-feed.md): Public sessions must exist

## Technical Notes

- Comments: plain text, max 500 chars
- Pagination: default 20 per page
- Rate limiting: 20 comments per hour
- Soft-delete via deleted_at

## Test Strategy

- Integration tests for comment operations
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
