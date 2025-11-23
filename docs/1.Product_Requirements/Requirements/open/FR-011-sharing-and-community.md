# FR-011 — Sharing & Community

---

**Requirement ID**: FR-011  
**Type**: Functional Requirement  
**Title**: Sharing & Community  
**Status**: Open  
**Priority**: Medium  
**Gate**: SILVER  
**Owner**: ENG/QA  
**Created**: 2025-01-20

---

## Executive Summary

This functional requirement specifies social sharing and community engagement capabilities that the system must provide.

Enable users to share their training sessions, discover content from others, and engage with the community through likes, bookmarks, comments, and following features.

## Business Context

- **Business Objective**: Foster community engagement and knowledge sharing while maintaining robust privacy controls and content moderation capabilities.
- **Success Criteria**: Users can share sessions, discover content, engage with others, and administrators can moderate community content effectively.
- **Priority**: Medium
- **Quality Gate**: SILVER
- **Owner**: ENG/QA
- **Status**: Open
- **Target Users**: All authenticated users (sharing and engagement), Administrators (moderation)

## Traceability

- **PRD Reference**: PRD §4.7 (FR-7 Sharing & Community)
- **TDD Reference**: TDD §Feed Module, §Social Module

## Functional Requirements

### Public Feed

#### Authenticated Feed

- **Access**: Only authenticated users can access the public feed
- **Content**: Feed displays public sessions from all users
- **Search & Sort**: Users can search and sort feed content
- **Pagination**: Feed supports pagination (default 20 items per page)

#### Session Sharing

- **Visibility Control**: Sessions default to private; users can make sessions public
- **Privacy Policy**: Default privacy is private; community guidelines apply
- **No Data Leakage**: Switching session visibility never leaks past private data

### Social Engagement

#### Likes

- **Like Sessions**: Users can like public sessions
- **Like Count**: Display like count on sessions
- **Unlike**: Users can unlike sessions they previously liked

#### Bookmarks

- **Bookmark Sessions**: Users can bookmark public sessions for later reference
- **Bookmark Collection**: Users can view their bookmarked sessions
- **Unbookmark**: Users can remove bookmarks

#### Comments

- **Comment on Sessions**: Users can comment on public sessions
- **Comment Threading**: Support for comment replies (future enhancement)
- **Comment Moderation**: Comments subject to moderation (placeholder for admin UI)

### User Following

#### Follow/Unfollow

- **Follow Users**: Users can follow other users
- **Unfollow**: Users can unfollow users they previously followed
- **Follow UI**: Clear follow/unfollow UI elements
- **Follower Counts**: Display follower counts on user profiles

#### Feed Personalization

- **Following Feed**: Users can view sessions from users they follow (future enhancement)
- **Mixed Feed**: Default feed shows all public sessions

### Session Cloning

#### Clone Public Sessions

- **Clone to Planner**: Users can clone public sessions into their planner
- **Attribution Preserved**: Cloned sessions retain attribution to original creator
- **Modification Allowed**: Users can modify cloned sessions for their own use

### Content Moderation

#### Reporting

- **Report Content**: Users can report inappropriate sessions or comments
- **Report Queue**: Reports appear in admin moderation queue (placeholder for admin UI)
- **Report Types**: Support for different report categories (spam, inappropriate, etc.)

#### Moderation Actions

- **Admin Moderation**: Administrators can review and moderate reported content
- **Suspensions**: Administrators can suspend users (placeholder for admin UI)
- **Takedowns**: Administrators can remove/hide inappropriate content (placeholder for admin UI)

## Acceptance Criteria

Each acceptance criterion must be met for this requirement to be considered complete.

### US-3.1-AC01

**Criterion**: Authenticated users can access public feed via GET /api/v1/feed?scope=public with pagination (default 20 items per page, max 100); feed returns public sessions only.

- **Test Method**: Integration + E2E
- **Evidence Required**: Feed API responses, pagination tests, UI screenshots
- **Related Story**: US-3.1

### US-3.1-AC02

**Criterion**: Feed supports search via ?q=keyword parameter; search matches session titles, exercise names, and user aliases.

- **Test Method**: E2E
- **Evidence Required**: Search functionality tests, search result screenshots
- **Related Story**: US-3.1

### US-3.1-AC03

**Criterion**: Feed supports sorting by date (default), popularity (likes), and relevance; sort parameter ?sort=date|popularity|relevance.

- **Test Method**: E2E
- **Evidence Required**: Sort functionality tests, sorted feed screenshots
- **Related Story**: US-3.1

### US-3.1-AC04

**Criterion**: Feed response time p95 ≤400ms per PRD performance targets; feed is cached for 30s via NGINX edge caching.

- **Test Method**: Performance
- **Evidence Required**: Performance metrics, cache hit ratio
- **Related Story**: US-3.1

### US-3.2-AC01

**Criterion**: Users can toggle session visibility (private/public) via PATCH /api/v1/sessions/:id with visibility field; default is private.

- **Test Method**: Integration + E2E
- **Evidence Required**: Visibility toggle tests, API responses
- **Related Story**: US-3.2

### US-3.2-AC02

**Criterion**: Switching session from private to public makes it visible in feed within ≤2s; switching from public to private removes it from feed immediately; past private data never leaked.

- **Test Method**: Integration + Security
- **Evidence Required**: Privacy tests, data leakage verification, feed update timing
- **Related Story**: US-3.2

### US-3.3-AC01

**Criterion**: Users can like/unlike public sessions via POST /api/v1/feed/item/:feedItemId/like and DELETE /api/v1/feed/item/:feedItemId/like; like action is idempotent.

- **Test Method**: Integration + E2E
- **Evidence Required**: Like button tests, API responses, idempotency verification
- **Related Story**: US-3.3

### US-3.3-AC02

**Criterion**: Like counts update in real-time within ≤500ms; like count displayed on feed items and session details.

- **Test Method**: Integration + E2E
- **Evidence Required**: Count update tests, UI screenshots, API response times
- **Related Story**: US-3.3

### US-3.3-AC03

**Criterion**: Users can bookmark/unbookmark sessions via POST /api/v1/sessions/:id/bookmark and DELETE /api/v1/sessions/:id/bookmark; bookmarks are idempotent.

- **Test Method**: E2E
- **Evidence Required**: Bookmark UI screenshots, bookmark functionality tests
- **Related Story**: US-3.3

### US-3.3-AC04

**Criterion**: Users can view their bookmarked sessions via GET /api/v1/users/me/bookmarks with pagination.

- **Test Method**: E2E
- **Evidence Required**: Bookmark collection view tests, UI screenshots
- **Related Story**: US-3.3

### US-3.4-AC01

**Criterion**: Users can comment on public sessions via POST /api/v1/feed/item/:feedItemId/comments with body (plain text, max 500 chars); comments are idempotent.

- **Test Method**: E2E
- **Evidence Required**: Comment UI screenshots, comment creation tests
- **Related Story**: US-3.4

### US-3.4-AC02

**Criterion**: Comments are displayed with author info, timestamp, and proper formatting; comments list paginated (default 20 per page).

- **Test Method**: E2E
- **Evidence Required**: Comment display tests, comment list screenshots
- **Related Story**: US-3.4

### US-3.4-AC03

**Criterion**: Comment owners and session owners can delete comments via DELETE /api/v1/comments/:commentId; deleted comments are soft-deleted (deleted_at set).

- **Test Method**: E2E
- **Evidence Required**: Comment deletion tests, access control verification
- **Related Story**: US-3.4

### US-3.4-AC04

**Criterion**: Comment rate limiting: 20 comments per hour per user; exceeding limit returns 429 with Retry-After header.

- **Test Method**: Integration
- **Evidence Required**: Rate limit tests, HTTP headers
- **Related Story**: US-3.4

### US-3.5-AC01

**Criterion**: Users can follow/unfollow other users via POST /api/v1/users/:alias/follow and DELETE /api/v1/users/:alias/follow; users cannot follow themselves (422 error).

- **Test Method**: Integration + E2E
- **Evidence Required**: Follow button tests, follower count tests, self-follow prevention
- **Related Story**: US-3.5

### US-3.5-AC02

**Criterion**: Follower and following counts update correctly; counts displayed on user profiles; GET /api/v1/users/:alias/followers and /following return paginated lists.

- **Test Method**: Integration + E2E
- **Evidence Required**: Follower count tests, UI screenshots, API responses
- **Related Story**: US-3.5

### US-3.5-AC03

**Criterion**: Follow rate limiting: 50 follows per day per user; exceeding limit returns 429.

- **Test Method**: Integration
- **Evidence Required**: Rate limit tests
- **Related Story**: US-3.5

### US-3.6-AC01

**Criterion**: Users can clone public sessions via POST /api/v1/sessions/:id/clone or POST /api/v1/feed/session/:sessionId/clone; cloned session created as planned session for current user.

- **Test Method**: Integration + E2E
- **Evidence Required**: Clone functionality tests, cloned session verification
- **Related Story**: US-3.6

### US-3.6-AC02

**Criterion**: Cloned sessions preserve attribution: source_session_id or metadata field contains original session ID and creator info; attribution visible in UI.

- **Test Method**: Integration + E2E
- **Evidence Required**: Attribution verification, UI screenshots showing attribution
- **Related Story**: US-3.6

### US-3.6-AC03

**Criterion**: Users can modify cloned sessions (title, date, exercises, sets); modifications do not affect original session.

- **Test Method**: E2E
- **Evidence Required**: Modification tests, original session preservation
- **Related Story**: US-3.6

### US-3.7-AC01

**Criterion**: Users can report inappropriate content (sessions or comments) via POST /api/v1/feed/report with reason and details; reports are idempotent.

- **Test Method**: Integration + E2E
- **Evidence Required**: Report UI screenshots, report creation tests
- **Related Story**: US-3.7

### US-3.7-AC02

**Criterion**: Reports appear in admin moderation queue; admins can view reports via GET /api/v1/admin/reports with filtering and pagination.

- **Test Method**: Integration + E2E
- **Evidence Required**: Admin queue tests, report list screenshots
- **Related Story**: US-3.7

### US-3.7-AC03

**Criterion**: Report rate limiting: 10 reports per day per user; exceeding limit returns 429.

- **Test Method**: Integration
- **Evidence Required**: Rate limit tests
- **Related Story**: US-3.7

### US-3.8-AC01

**Criterion**: Unit tests cover like, bookmark, comment, follow, and clone operations with ≥90% code coverage.

- **Test Method**: Unit
- **Evidence Required**: Test coverage reports
- **Related Story**: US-3.8

### US-3.8-AC02

**Criterion**: Integration tests verify feed access, social interactions, cloning, and reporting scenarios.

- **Test Method**: Integration
- **Evidence Required**: Integration test results
- **Related Story**: US-3.8

### US-3.8-AC03

**Criterion**: E2E tests verify complete social workflow including feed browsing, liking, commenting, following, and cloning.

- **Test Method**: E2E
- **Evidence Required**: E2E test results, UI screenshots
- **Related Story**: US-3.8

## Test Strategy

- E2E
- Integration
- Integration + E2E
- Integration + Security
- Security

## Evidence Requirements

- Admin queue tests
- API response times
- Attribution verification
- Bookmark UI screenshots
- Clone functionality tests
- Comment display tests
- Comment UI screenshots
- Collection view tests
- Count update tests
- Data leakage verification
- Feed UI screenshots
- Follow button tests
- Follower count tests
- Guideline enforcement tests
- Like button tests
- Modification tests
- Pagination tests
- Privacy tests
- Report UI screenshots
- Search UI screenshots
- Sort functionality tests
- UI screenshots
- Visibility toggle tests

## Use Cases

### Primary Use Cases

- User makes their session public and it appears in the feed
- User searches for sessions by keyword
- User likes a public session
- User bookmarks a session for later reference
- User comments on a public session
- User follows another user
- User clones a public session into their planner
- User reports inappropriate content
- Administrator reviews and moderates reported content

### Edge Cases

- User attempts to like their own session (should be allowed or prevented?)
- User attempts to follow themselves (should be prevented)
- User clones a session that is later deleted/archived (attribution preserved)
- User switches session from public to private (past data not leaked)
- Feed pagination with large number of sessions
- Search returns no results
- Comment contains inappropriate content (moderation needed)
- User reports content that is later removed

## Dependencies

### Technical Dependencies

- Database for feed, likes, bookmarks, comments, follows
- Search/indexing for feed search
- Real-time updates for like counts (optional)
- Notification system for engagement (future)

### Feature Dependencies

- FR-001 (User Registration) - User accounts required
- FR-002 (Login & Session) - Authentication required
- FR-004 (Planner) - Session planning and cloning
- FR-005 (Logging & Import) - Session logging
- FR-008 (Admin & RBAC) - Admin moderation
- FR-009 (Profile & Settings) - User profiles for following
- NFR-002 (Privacy) - Privacy controls

## Constraints

### Technical Constraints

- Feed pagination: default 20 items per page, max 100
- Like count update: ≤500ms
- Feed update after sharing: ≤2s
- Attribution must be preserved in cloned sessions

### Business Constraints

- Default privacy is private
- Community guidelines must be enforced
- No data leakage when switching visibility
- Attribution must be preserved

## Assumptions

- Users understand privacy implications of public sharing
- Community guidelines are clear and enforceable
- Moderation queue will be manageable
- Users want to engage with community content
- Attribution is important for content creators

## Risks & Issues

- **Risk**: Public feed may contain inappropriate content
- **Risk**: Spam or abuse in comments and reports
- **Risk**: Privacy concerns with public sharing
- **Risk**: Moderation workload may be high
- **Risk**: Attribution may be lost or misrepresented
- **Risk**: Feed performance may degrade with large user base

## Open Questions

- Should users be able to like their own sessions?
- Should there be a separate "Following" feed?
- What is the comment threading strategy?
- Should there be notification for likes/comments/follows?
- What are the community guidelines?
- Should there be content categories/tags for feed filtering?
- Should there be trending/popular sessions section?

## Related Requirements

- FR-001: User Registration (user accounts)
- FR-002: Login & Session (authentication)
- FR-004: Planner (session planning and cloning)
- FR-005: Logging & Import (session logging)
- FR-008: Admin & RBAC (moderation)
- FR-009: Profile & Settings (user profiles)
- NFR-002: Privacy (privacy controls)
- NFR-003: Performance (feed performance)
