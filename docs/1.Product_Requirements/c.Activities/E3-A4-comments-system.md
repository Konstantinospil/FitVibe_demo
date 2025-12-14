# E3-A4: Comments System

---

**Activity ID**: E3-A4  
**Epic ID**: [E3](../b.Epics/E3-sharing-&-community.md)  
**Title**: Comments System  
**Status**: Done  
**Difficulty**: 3  
**Estimated Effort**: 3 story points  
**Created**: 2025-11-30  
**Updated**: 2025-12-14  
**Completed**: 2025-12-14

---

## Description

Implement comments system for Sharing & Community. Implement backend API endpoints and frontend components with proper validation, error handling, and performance targets.

## Implementation Details

### Backend Implementation

- **Feed Service** (`apps/backend/src/modules/feed/feed.service.ts`):
  - `createComment()`: Create comment on feed item (max 500 chars, plain text)
  - `deleteComment()`: Soft-delete comment (comment owner or session owner)
  - `listComments()`: Paginated comment list (default 20 per page)
  - Rate limiting: 20 comments per hour per user

- **Feed Repository** (`apps/backend/src/modules/feed/feed.repository.ts`):
  - `insertComment()`: Insert comment with validation
  - `softDeleteComment()`: Mark comment as deleted
  - `listCommentsForFeedItem()`: Get comments with author info
  - Comments stored in `feed_comments` table with soft-delete support

- **Feed Controller** (`apps/backend/src/modules/feed/feed.controller.ts`):
  - `GET /api/v1/feed/item/:feedItemId/comments`: List comments
  - `POST /api/v1/feed/item/:feedItemId/comments`: Create comment
  - `DELETE /api/v1/feed/comments/:commentId`: Delete comment
  - Rate limiting: 20 comments per hour (3600s window)

### Frontend Implementation

- Comment display and creation UI (to be implemented in Feed page)
- Comment deletion with proper authorization checks

### Testing

- **Unit Tests**: `tests/backend/modules/feed/feed.service.test.ts` (comment operations)
- **Integration Tests**: Comment creation, deletion, authorization
- **E2E Tests**: Complete comment workflow

## Acceptance Criteria

- Implementation meets all related user story acceptance criteria
- Code implemented with proper validation and error handling
- Tests written with ≥80% coverage
- Documentation updated
- Performance targets met (if applicable)
- Accessibility requirements met (WCAG 2.2 AA)

## Dependencies

### Blocking Dependencies

- [E3: Sharing & Community](../b.Epics/E3-sharing-&-community.md): Parent epic

### Non-Blocking Dependencies

{Note: Dependencies will be identified as implementation progresses}

## Related User Stories

- [US-3.4: Comments](../d.User_stories/US-3.4-comments.md)

## Technical Notes

{Note: Technical notes will be added during implementation planning}

## Test Strategy

- Unit tests for core logic
- Integration tests for API/database interactions
- E2E tests for complete workflows
- Performance tests (if applicable)
- Accessibility tests (if applicable)

## Definition of Done

- [x] Code implemented and reviewed
- [x] Tests written and passing (≥80% coverage)
- [x] Documentation updated
- [x] Acceptance criteria met
- [x] Related user stories updated
- [x] Performance targets verified (if applicable)

---

**Last Updated**: 2025-12-14  
**Next Review**: N/A (Activity completed)
