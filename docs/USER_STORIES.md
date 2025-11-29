# FitVibe User Stories

**Version**: 1.0
**Created**: 2025-01-21
**Status**: Planning
**Owner**: Development Team

---

## Overview

This document groups activities from the Epics and Activities document into user stories. Each user story represents a deliverable feature that provides value to users or the system.

### User Story Format

- **As a** [user type]
- **I want** [goal]
- **So that** [benefit]

---

## Epic 1: Profile & Settings (FR-009)

### US-1.1: Edit Profile Information

**As a** user
**I want** to edit my profile information (alias, weight, fitness level, training frequency)
**So that** I can keep my profile up to date and personalize my experience

**Activities:**

- E1-A1: Profile Edit API
- E1-A2: Profile Validation
- E1-A3: Immutable Fields Protection
- E1-A6: Profile Edit Frontend

**Story Points**: 5
**Priority**: Medium
**Dependencies**: FR-001, FR-002

**Acceptance Criteria:**

- **US-1.1-AC01**: Users can edit alias, weight, fitness level, and training frequency via API endpoint PATCH /api/v1/users/me within ≤500ms response time.
  - Test Method: Integration + E2E
  - Evidence: API response times, DB snapshot, UI screenshots

- **US-1.1-AC02**: Profile field validation: alias max 32 chars, weight range 20-400 kg (or equivalent in lbs), fitness level enum (beginner/intermediate/advanced/elite), training frequency enum (rarely/1_2_per_week/3_4_per_week/5_plus_per_week). Invalid values rejected with 422 and clear error messages.
  - Test Method: Unit + API negative
  - Evidence: Validation test results, error message samples

- **US-1.1-AC03**: Immutable fields (date_of_birth, gender) cannot be modified; attempts return 403 Forbidden with error code E.USER.IMMUTABLE_FIELD.
  - Test Method: API negative
  - Evidence: HTTP traces, error responses

- **US-1.1-AC04**: Weight is stored internally as kg (weight_kg) regardless of user's preferred unit; UI converts for display based on user's weight_unit preference.
  - Test Method: Integration
  - Evidence: DB records, UI conversion tests

- **US-1.1-AC05**: Profile changes are audit-logged with who/when/what; state history records created for each field change.
  - Test Method: Integration
  - Evidence: Audit log excerpts, state history records

---

### US-1.2: Upload and Manage Avatar

**As a** user
**I want** to upload and manage my profile avatar
**So that** I can personalize my profile with my photo

**Activities:**

- E1-A4: Avatar Upload Backend
- E1-A5: Avatar Preview Generation
- E1-A7: Avatar Upload Frontend

**Story Points**: 5
**Priority**: Medium
**Dependencies**: US-1.1, NFR-001

**Acceptance Criteria:**

- **US-1.2-AC01**: Users can upload avatar images via POST /api/v1/users/me/avatar; accepted formats: JPEG, PNG, WebP; max size 5MB; rejected with 422 if invalid.
  - Test Method: Integration
  - Evidence: Upload logs, error responses for invalid files

- **US-1.2-AC02**: Uploaded avatars are scanned for malware using antivirus service; infected files rejected with E.UPLOAD.MALWARE_DETECTED and audit logged.
  - Test Method: Integration
  - Evidence: AV scan logs, EICAR test file rejection

- **US-1.2-AC03**: System generates 128×128 pixel preview image from uploaded avatar within ≤2s; preview stored and served at /users/avatar/:id endpoint.
  - Test Method: Integration
  - Evidence: Preview images, performance metrics, storage verification

- **US-1.2-AC04**: Users without avatars see a default placeholder image; placeholder is accessible and properly sized.
  - Test Method: E2E
  - Evidence: UI screenshots showing placeholder

- **US-1.2-AC05**: Avatar upload is idempotent via Idempotency-Key header; duplicate uploads return same result with Idempotent-Replayed header.
  - Test Method: Integration
  - Evidence: Idempotency test results, HTTP headers

---

### US-1.3: Profile Testing

**As a** developer
**I want** comprehensive tests for profile features
**So that** I can ensure profile functionality works correctly

**Activities:**

- E1-A8: Profile Tests

**Story Points**: 2
**Priority**: Medium
**Dependencies**: US-1.1, US-1.2

**Acceptance Criteria:**

- **US-1.3-AC01**: Unit tests cover profile field validation, immutable field protection, and weight unit conversion with ≥90% code coverage.
  - Test Method: Unit
  - Evidence: Test coverage reports

- **US-1.3-AC02**: Integration tests verify profile update API, avatar upload flow, and error handling scenarios.
  - Test Method: Integration
  - Evidence: Integration test results

- **US-1.3-AC03**: E2E tests verify complete profile editing workflow including form validation, submission, and persistence.
  - Test Method: E2E
  - Evidence: E2E test results, UI screenshots

---

## Epic 2: Exercise Library (FR-010)

### US-2.1: Create and Manage Personal Exercises

**As a** user
**I want** to create and manage my personal exercises
**So that** I can track custom exercises not in the global library

**Activities:**

- E2-A1: Exercise CRUD API
- E2-A2: Exercise Archival
- E2-A3: Exercise Visibility Model
- E2-A7: Exercise Library Frontend

**Story Points**: 8
**Priority**: Medium
**Dependencies**: FR-001, FR-002, FR-008

**Acceptance Criteria:**

- **US-2.1-AC01**: Users can create exercises via POST /api/v1/exercises with required fields (name, type_code) and optional fields (muscle_group, equipment, tags, description); exercise saved within ≤500ms.
  - Test Method: Integration + E2E
  - Evidence: DB snapshot, UI screenshots, API response times

- **US-2.1-AC02**: Users can update their own exercises via PATCH /api/v1/exercises/:id; edits preserve historical accuracy; unauthorized edits return 403.
  - Test Method: Integration + E2E
  - Evidence: Update tests, access control verification

- **US-2.1-AC03**: Exercises can be archived (soft delete) via DELETE /api/v1/exercises/:id; archived exercises have archived_at timestamp set; they are hidden from selectors but retained in database.
  - Test Method: Integration + E2E
  - Evidence: DB records, UI showing archived exercises not in selectors

- **US-2.1-AC04**: Exercise visibility model: private (default, owner_id = user_id) or public (is_public = true); private exercises only visible to creator.
  - Test Method: Integration + E2E
  - Evidence: Access control tests, UI screenshots

- **US-2.1-AC05**: Exercise name uniqueness enforced per owner: (owner_id, normalized_name) unique constraint; duplicate names rejected with 409 CONFLICT.
  - Test Method: Unit + API negative
  - Evidence: Uniqueness test results, error responses

---

### US-2.2: Discover Public Exercises

**As a** user
**I want** to search and discover public exercises
**So that** I can find exercises created by other users

**Activities:**

- E2-A4: Exercise Search & Discovery

**Story Points**: 3
**Priority**: Medium
**Dependencies**: US-2.1

**Acceptance Criteria:**

- **US-2.2-AC01**: Users can search public exercises via GET /api/v1/exercises?is_public=true&q=searchterm with pagination (default 20, max 100).
  - Test Method: E2E
  - Evidence: Search results, API response times

- **US-2.2-AC02**: Exercise search supports filtering by category (type_code), muscle_group, equipment, and tags; filters can be combined.
  - Test Method: E2E
  - Evidence: Filter UI screenshots, filtered search results

- **US-2.2-AC03**: Search results are sorted by relevance (name match) or date; empty results return empty array with 200 status.
  - Test Method: E2E
  - Evidence: Search result ordering, empty result handling

---

### US-2.3: Exercise History Preservation

**As a** user
**I want** exercise names to be preserved in historical sessions
**So that** my past workout records remain accurate even if exercises are modified

**Activities:**

- E2-A5: Exercise Snapshot on Session Use

**Story Points**: 2
**Priority**: Medium
**Dependencies**: US-2.1, FR-004

**Acceptance Criteria:**

- **US-2.3-AC01**: When an exercise is used in a session, exercise name is stored as snapshot in session_exercises.exercise_name field; snapshot persists even if exercise is later modified or archived.
  - Test Method: Integration
  - Evidence: DB records showing snapshot preservation, exercise modification tests

- **US-2.3-AC02**: Historical sessions display exercise name from snapshot, not current exercise name; exercise changes do not affect past session records.
  - Test Method: Integration + E2E
  - Evidence: Historical session display tests, exercise modification verification

---

### US-2.4: Admin Global Exercise Management

**As an** administrator
**I want** to create and manage global exercises
**So that** all users have access to a standard exercise library

**Activities:**

- E2-A6: Global Exercise Management

**Story Points**: 2
**Priority**: Medium
**Dependencies**: US-2.1, FR-008

**Acceptance Criteria:**

- **US-2.4-AC01**: Administrators can create global exercises (owner_id = null) via POST /api/v1/exercises with admin role; global exercises are accessible to all users.
  - Test Method: Integration + E2E
  - Evidence: Admin UI screenshots, access control tests

- **US-2.4-AC02**: Administrators can edit and archive global exercises; non-admin users cannot modify global exercises (403 Forbidden).
  - Test Method: Integration + E2E
  - Evidence: Admin edit tests, non-admin access denial

---

### US-2.5: Exercise Selector Integration

**As a** user
**I want** to select exercises from the library when planning or logging sessions
**So that** I can easily add exercises to my workouts

**Activities:**

- E2-A8: Exercise Selector Integration

**Story Points**: 3
**Priority**: Medium
**Dependencies**: US-2.1, FR-004, FR-005

**Acceptance Criteria:**

- **US-2.5-AC01**: Exercise selector in Planner and Logger displays user's personal exercises, global exercises, and public exercises; archived exercises are excluded.
  - Test Method: E2E
  - Evidence: Exercise selector UI screenshots, exercise list verification

- **US-2.5-AC02**: Exercise selector supports search and filtering; selected exercise is added to session with proper reference.
  - Test Method: E2E
  - Evidence: Selector search tests, exercise addition verification

---

### US-2.6: Exercise Library Testing

**As a** developer
**I want** comprehensive tests for exercise library features
**So that** I can ensure exercise management works correctly

**Activities:**

- E2-A9: Exercise Tests

**Story Points**: 2
**Priority**: Medium
**Dependencies**: US-2.1, US-2.7

**Acceptance Criteria:**

- **US-2.6-AC01**: Unit tests cover exercise CRUD operations, archival, visibility model, and uniqueness constraints with ≥90% code coverage.
  - Test Method: Unit
  - Evidence: Test coverage reports

- **US-2.6-AC02**: Integration tests verify exercise creation, editing, archival, search, and access control scenarios.
  - Test Method: Integration
  - Evidence: Integration test results

- **US-2.6-AC03**: E2E tests verify complete exercise management workflow including creation, search, selection, and archival.
  - Test Method: E2E
  - Evidence: E2E test results, UI screenshots

---

## Epic 3: Sharing & Community (FR-011)

### US-3.1: Public Feed

**As a** user
**I want** to browse a public feed of shared training sessions
**So that** I can discover workouts and get inspiration from the community

**Activities:**

- E3-A1: Public Feed API
- E3-A9: Feed Frontend

**Story Points**: 7
**Priority**: Medium
**Dependencies**: FR-001, FR-002, FR-004

**Acceptance Criteria:**

- **US-3.1-AC01**: Authenticated users can access public feed via GET /api/v1/feed?scope=public with pagination (default 20 items per page, max 100); feed returns public sessions only.
  - Test Method: Integration + E2E
  - Evidence: Feed API responses, pagination tests, UI screenshots

- **US-3.1-AC02**: Feed supports search via ?q=keyword parameter; search matches session titles, exercise names, and user aliases.
  - Test Method: E2E
  - Evidence: Search functionality tests, search result screenshots

- **US-3.1-AC03**: Feed supports sorting by date (default), popularity (likes), and relevance; sort parameter ?sort=date|popularity|relevance.
  - Test Method: E2E
  - Evidence: Sort functionality tests, sorted feed screenshots

- **US-3.1-AC04**: Feed response time p95 ≤400ms per PRD performance targets; feed is cached for 30s via NGINX edge caching.
  - Test Method: Performance
  - Evidence: Performance metrics, cache hit ratio

---

### US-3.2: Share Sessions

**As a** user
**I want** to make my sessions public or private
**So that** I can control who sees my workouts

**Activities:**

- E3-A2: Session Visibility Toggle

**Story Points**: 2
**Priority**: Medium
**Dependencies**: FR-004, NFR-002

**Acceptance Criteria:**

- **US-3.2-AC01**: Users can toggle session visibility (private/public) via PATCH /api/v1/sessions/:id with visibility field; default is private.
  - Test Method: Integration + E2E
  - Evidence: Visibility toggle tests, API responses

- **US-3.2-AC02**: Switching session from private to public makes it visible in feed within ≤2s; switching from public to private removes it from feed immediately; past private data never leaked.
  - Test Method: Integration + Security
  - Evidence: Privacy tests, data leakage verification, feed update timing

---

### US-3.3: Like and Bookmark Sessions

**As a** user
**I want** to like and bookmark public sessions
**So that** I can save interesting workouts for later

**Activities:**

- E3-A3: Like/Unlike API
- E3-A4: Bookmark API
- E3-A10: Social Interactions Frontend (partial)

**Story Points**: 4
**Priority**: Medium
**Dependencies**: US-3.1

**Acceptance Criteria:**

- **US-3.3-AC01**: Users can like/unlike public sessions via POST /api/v1/feed/item/:feedItemId/like and DELETE /api/v1/feed/item/:feedItemId/like; like action is idempotent.
  - Test Method: Integration + E2E
  - Evidence: Like button tests, API responses, idempotency verification

- **US-3.3-AC02**: Like counts update in real-time within ≤500ms; like count displayed on feed items and session details.
  - Test Method: Integration + E2E
  - Evidence: Count update tests, UI screenshots, API response times

- **US-3.3-AC03**: Users can bookmark/unbookmark sessions via POST /api/v1/sessions/:id/bookmark and DELETE /api/v1/sessions/:id/bookmark; bookmarks are idempotent.
  - Test Method: E2E
  - Evidence: Bookmark UI screenshots, bookmark functionality tests

- **US-3.3-AC04**: Users can view their bookmarked sessions via GET /api/v1/users/me/bookmarks with pagination.
  - Test Method: E2E
  - Evidence: Bookmark collection view tests, UI screenshots

---

### US-3.4: Comment on Sessions

**As a** user
**I want** to comment on public sessions
**So that** I can engage with the community and provide feedback

**Activities:**

- E3-A5: Comments API
- E3-A10: Social Interactions Frontend (partial)

**Story Points**: 4
**Priority**: Medium
**Dependencies**: US-3.1

**Acceptance Criteria:**

- **US-3.4-AC01**: Users can comment on public sessions via POST /api/v1/feed/item/:feedItemId/comments with body (plain text, max 500 chars); comments are idempotent.
  - Test Method: E2E
  - Evidence: Comment UI screenshots, comment creation tests

- **US-3.4-AC02**: Comments are displayed with author info, timestamp, and proper formatting; comments list paginated (default 20 per page).
  - Test Method: E2E
  - Evidence: Comment display tests, comment list screenshots

- **US-3.4-AC03**: Comment owners and session owners can delete comments via DELETE /api/v1/comments/:commentId; deleted comments are soft-deleted (deleted_at set).
  - Test Method: E2E
  - Evidence: Comment deletion tests, access control verification

- **US-3.4-AC04**: Comment rate limiting: 20 comments per hour per user; exceeding limit returns 429 with Retry-After header.
  - Test Method: Integration
  - Evidence: Rate limit tests, HTTP headers

---

### US-3.5: Follow Users

**As a** user
**I want** to follow other users
**So that** I can see their workouts in my feed

**Activities:**

- E3-A6: Follow/Unfollow API
- E3-A10: Social Interactions Frontend (partial)

**Story Points**: 3
**Priority**: Medium
**Dependencies**: FR-009

**Acceptance Criteria:**

- **US-3.5-AC01**: Users can follow/unfollow other users via POST /api/v1/users/:alias/follow and DELETE /api/v1/users/:alias/follow; users cannot follow themselves (422 error).
  - Test Method: Integration + E2E
  - Evidence: Follow button tests, follower count tests, self-follow prevention

- **US-3.5-AC02**: Follower and following counts update correctly; counts displayed on user profiles; GET /api/v1/users/:alias/followers and /following return paginated lists.
  - Test Method: Integration + E2E
  - Evidence: Follower count tests, UI screenshots, API responses

- **US-3.5-AC03**: Follow rate limiting: 50 follows per day per user; exceeding limit returns 429.
  - Test Method: Integration
  - Evidence: Rate limit tests

---

### US-3.6: Clone Sessions

**As a** user
**I want** to clone public sessions into my planner
**So that** I can use workouts created by others

**Activities:**

- E3-A7: Session Cloning
- E3-A11: Session Cloning Frontend

**Story Points**: 4
**Priority**: Medium
**Dependencies**: FR-004, US-3.1

**Acceptance Criteria:**

- **US-3.6-AC01**: Users can clone public sessions via POST /api/v1/sessions/:id/clone or POST /api/v1/feed/session/:sessionId/clone; cloned session created as planned session for current user.
  - Test Method: Integration + E2E
  - Evidence: Clone functionality tests, cloned session verification

- **US-3.6-AC02**: Cloned sessions preserve attribution: source_session_id or metadata field contains original session ID and creator info; attribution visible in UI.
  - Test Method: Integration + E2E
  - Evidence: Attribution verification, UI screenshots showing attribution

- **US-3.6-AC03**: Users can modify cloned sessions (title, date, exercises, sets); modifications do not affect original session.
  - Test Method: E2E
  - Evidence: Modification tests, original session preservation

---

### US-3.7: Report Content

**As a** user
**I want** to report inappropriate content
**So that** administrators can moderate the community

**Activities:**

- E3-A8: Content Reporting

**Story Points**: 3
**Priority**: Medium
**Dependencies**: US-3.1, FR-008

**Acceptance Criteria:**

- **US-3.7-AC01**: Users can report inappropriate content (sessions or comments) via POST /api/v1/feed/report with reason and details; reports are idempotent.
  - Test Method: Integration + E2E
  - Evidence: Report UI screenshots, report creation tests

- **US-3.7-AC02**: Reports appear in admin moderation queue; admins can view reports via GET /api/v1/admin/reports with filtering and pagination.
  - Test Method: Integration + E2E
  - Evidence: Admin queue tests, report list screenshots

- **US-3.7-AC03**: Report rate limiting: 10 reports per day per user; exceeding limit returns 429.
  - Test Method: Integration
  - Evidence: Rate limit tests

---

### US-3.8: Social Features Testing

**As a** developer
**I want** comprehensive tests for social features
**So that** I can ensure community features work correctly

**Activities:**

- E3-A12: Social Features Tests

**Story Points**: 3
**Priority**: Medium
**Dependencies**: US-3.1, US-3.3, US-3.4, US-3.5

**Acceptance Criteria:**

- **US-3.8-AC01**: Unit tests cover like, bookmark, comment, follow, and clone operations with ≥90% code coverage.
  - Test Method: Unit
  - Evidence: Test coverage reports

- **US-3.8-AC02**: Integration tests verify feed access, social interactions, cloning, and reporting scenarios.
  - Test Method: Integration
  - Evidence: Integration test results

- **US-3.8-AC03**: E2E tests verify complete social workflow including feed browsing, liking, commenting, following, and cloning.
  - Test Method: E2E
  - Evidence: E2E test results, UI screenshots

---

## Epic 4: Planner Completion (FR-004)

### US-4.1: Plan Management

**As a** user
**I want** to create, edit, and delete training plans
**So that** I can organize my workouts over time

**Activities:**

- E4-A1: Plan CRUD API

**Story Points**: 2
**Priority**: Medium
**Dependencies**: FR-001, FR-002

**Acceptance Criteria:**

- **US-4.1-AC01**: Users can create training plans via POST /api/v1/plans with name, start_date, end_date; plan saved within ≤500ms.
  - Test Method: Integration
  - Evidence: DB snapshot, API response times

- **US-4.1-AC02**: Users can update plans via PATCH /api/v1/plans/:id; updates persist and visible after reload.
  - Test Method: Integration
  - Evidence: Update tests, persistence verification

- **US-4.1-AC03**: Users can delete plans via DELETE /api/v1/plans/:id; deletion is soft-delete (archived_at set); associated sessions are not deleted.
  - Test Method: Integration
  - Evidence: Deletion tests, session preservation verification

- **US-4.1-AC04**: Plan concurrency: last-writer-wins with ETag support; stale ETag returns 412 Precondition Failed with conflict banner.
  - Test Method: Integration
  - Evidence: ETag headers, concurrency test results

---

### US-4.2: Activate Plans and Generate Sessions

**As a** user
**I want** to activate a plan and have sessions automatically generated
**So that** I can follow a structured training program

**Activities:**

- E4-A2: Plan Activation & Session Generation
- E4-A3: Plan Progress Tracking

**Story Points**: 7
**Priority**: Medium
**Dependencies**: US-4.1, FR-004

**Acceptance Criteria:**

- **US-4.2-AC01**: Users can activate a plan via POST /api/v1/plans/:id/activate; activation generates scheduled sessions based on plan template and recurrence rules.
  - Test Method: Integration
  - Evidence: Activation tests, generated sessions verification

- **US-4.2-AC02**: Plan progress tracking: progress_percent calculated as (completed_count / session_count) \* 100; progress updates when sessions are completed.
  - Test Method: Integration
  - Evidence: Progress calculation tests, progress update verification

- **US-4.2-AC03**: Plan duration validation: duration_weeks ∈ [1..52]; target_frequency ∈ [1..7] sessions per week; invalid values rejected with 422.
  - Test Method: Unit + API negative
  - Evidence: Validation test results, error responses

---

### US-4.3: Drag-and-Drop Calendar Scheduling

**As a** user
**I want** to schedule sessions using drag-and-drop on a calendar
**So that** I can easily plan my workouts visually

**Activities:**

- E4-A4: Drag-and-Drop Calendar
- E4-A5: Conflict Detection
- E4-A6: Planner Frontend

**Story Points**: 8
**Priority**: Medium
**Dependencies**: US-4.1, FR-004

**Acceptance Criteria:**

- **US-4.3-AC01**: Drag-and-drop scheduling updates session planned_at without full page reload; calendar re-renders within ≤150ms on modern desktop.
  - Test Method: E2E
  - Evidence: Performance traces, drag-and-drop functionality tests

- **US-4.3-AC02**: Overlapping sessions detected client-side before save with actionable error message and visual highlight of conflicts.
  - Test Method: Unit + E2E
  - Evidence: Conflict detection tests, UI screenshots

- **US-4.3-AC03**: Server re-validates session overlaps; rejects with 422 and returns conflicting session IDs in error response.
  - Test Method: API negative
  - Evidence: HTTP traces, error responses with conflict details

- **US-4.3-AC04**: Calendar view displays sessions with proper time slots, colors, and labels; supports month/week/day views.
  - Test Method: E2E
  - Evidence: Calendar UI screenshots, view switching tests

---

### US-4.4: Mobile Calendar Support

**As a** mobile user
**I want** to use touch gestures to schedule sessions
**So that** I can plan workouts on my phone

**Activities:**

- E4-A7: Mobile Touch Gestures

**Story Points**: 3
**Priority**: Medium
**Dependencies**: US-4.3

**Acceptance Criteria:**

- **US-4.4-AC01**: Mobile drag/resize works via touch gestures (touchstart, touchmove, touchend); no scroll-jank with long tasks >50ms.
  - Test Method: E2E mobile emu
  - Evidence: Performance traces, touch gesture tests

- **US-4.4-AC02**: Touch gestures are responsive and provide visual feedback; calendar is usable on mobile devices (screen width ≥320px).
  - Test Method: E2E mobile emu
  - Evidence: Mobile UI screenshots, usability tests

---

### US-4.5: Planner Testing

**As a** developer
**I want** comprehensive tests for planner features
**So that** I can ensure planning functionality works correctly

**Activities:**

- E4-A8: Planner Tests

**Story Points**: 3
**Priority**: Medium
**Dependencies**: US-4.3

**Acceptance Criteria:**

- **US-4.5-AC01**: Unit tests cover plan CRUD, activation, session generation, and progress tracking with ≥90% code coverage.
  - Test Method: Unit
  - Evidence: Test coverage reports

- **US-4.5-AC02**: Integration tests verify plan management, activation flow, conflict detection, and progress calculation.
  - Test Method: Integration
  - Evidence: Integration test results

- **US-4.5-AC03**: E2E tests verify complete planner workflow including drag-and-drop, conflict detection, and mobile touch gestures.
  - Test Method: E2E
  - Evidence: E2E test results, UI screenshots

---

## Epic 5: Logging & Import (FR-005)

### US-5.1: Manual Session Logging

**As a** user
**I want** to manually log my workout sessions with metrics
**So that** I can track my performance

**Activities:**

- E5-A1: Session Logging API
- E5-A7: Logger Frontend

**Story Points**: 5
**Priority**: Medium
**Dependencies**: FR-004

**Acceptance Criteria:**

- **US-5.1-AC01**: Users can log session metrics (duration, distance, heart rate, sets, reps, weight) via PATCH /api/v1/sessions/:id with status='completed'; metrics saved within ≤500ms.
  - Test Method: Integration + E2E
  - Evidence: Logging tests, DB records, API response times

- **US-5.1-AC02**: Session edits are audit-logged with who/when/what; audit records include field changes and timestamps.
  - Test Method: Unit + Integration
  - Evidence: Audit log excerpts, edit history verification

- **US-5.1-AC03**: Logger frontend allows manual entry of all metrics with proper validation and unit conversion.
  - Test Method: E2E
  - Evidence: Logger UI screenshots, form validation tests

---

### US-5.2: Import GPX Files

**As a** user
**I want** to import GPX files from my fitness devices
**So that** I can automatically log outdoor activities

**Activities:**

- E5-A2: GPX Parser
- E5-A4: File Import API

**Story Points**: 5
**Priority**: Medium
**Dependencies**: US-5.1

**Acceptance Criteria:**

- **US-5.2-AC01**: Users can import GPX files via POST /api/v1/sessions/import with file upload; GPX parser extracts track points, elevation, and timestamps.
  - Test Method: Fuzz + fixtures
  - Evidence: GPX parser test results, import success/failure logs

- **US-5.2-AC02**: GPX parser handles ≥99% valid GPX samples; malformed GPX files produce user-facing error (422) without application crash.
  - Test Method: Fuzz + fixtures
  - Evidence: Corpus results, error handling tests

- **US-5.2-AC03**: Imported GPX data creates session with proper metrics (distance, duration, elevation gain/loss); timezone normalization applied.
  - Test Method: Unit
  - Evidence: Parser snapshots, imported session verification

---

### US-5.3: Import FIT Files

**As a** user
**I want** to import FIT files with GPS and heart rate data
**So that** I can log detailed workout data from my devices

**Activities:**

- E5-A3: FIT Parser
- E5-A4: File Import API (shared)

**Story Points**: 6
**Priority**: Medium
**Dependencies**: US-5.1

**Acceptance Criteria:**

- **US-5.3-AC01**: Users can import FIT files via POST /api/v1/sessions/import; FIT parser extracts GPS, heart rate, power, and other device metrics.
  - Test Method: Fuzz + fixtures
  - Evidence: FIT parser test results, import success/failure logs

- **US-5.3-AC02**: FIT parser handles ≥99% valid FIT samples; malformed FIT files produce user-facing error (422) without crash.
  - Test Method: Fuzz + fixtures
  - Evidence: Corpus results, error handling tests

- **US-5.3-AC03**: FIT file metadata (GPS coordinates, heart rate zones, timezone) respected; timezone normalization applied correctly.
  - Test Method: Unit
  - Evidence: Parser snapshots, metadata extraction verification

---

### US-5.4: Metric Recalculation

**As a** user
**I want** derived metrics (pace, elevation) to be automatically calculated
**So that** I can see accurate performance data

**Activities:**

- E5-A5: Metric Recalculation

**Story Points**: 3
**Priority**: Medium
**Dependencies**: US-5.1

**Acceptance Criteria:**

- **US-5.4-AC01**: Editing pace or elevation triggers automatic recalculation of derived metrics (average pace, elevation gain/loss, normalized power) within ≤200ms.
  - Test Method: Integration
  - Evidence: Recalculation logs, metric update verification

- **US-5.4-AC02**: Metric recalculation is idempotent: same inputs produce same outputs; snapshot tests remain stable across runs.
  - Test Method: Unit
  - Evidence: Snapshot tests, idempotency verification

---

### US-5.5: Offline Logging

**As a** user
**I want** to log workouts offline and sync when I reconnect
**So that** I can track workouts even without internet

**Activities:**

- E5-A6: Offline Logging Support

**Story Points**: 4
**Priority**: Medium
**Dependencies**: US-5.1

**Acceptance Criteria:**

- **US-5.5-AC01**: Offline logging buffers session events in local storage (IndexedDB); events sync to server within ≤5s after network reconnect.
  - Test Method: E2E (PWA offline)
  - Evidence: Network traces, sync verification, offline storage tests

- **US-5.5-AC02**: Service worker enables offline functionality; sync queue handles failed syncs with retry logic (exponential backoff).
  - Test Method: E2E (PWA offline)
  - Evidence: Service worker tests, sync queue verification

---

### US-5.6: Import Testing

**As a** developer
**I want** comprehensive tests for file import functionality
**So that** I can ensure parsers handle various file formats correctly

**Activities:**

- E5-A8: Import Tests

**Story Points**: 3
**Priority**: Medium
**Dependencies**: US-5.2, US-5.3

**Acceptance Criteria:**

- **US-5.6-AC01**: Fuzz tests cover GPX and FIT parsers with diverse file samples; parser handles edge cases (empty files, malformed XML/binary, missing fields).
  - Test Method: Fuzz + fixtures
  - Evidence: Fuzz test results, corpus coverage

- **US-5.6-AC02**: Import tests verify file validation, parsing accuracy, error handling, and metric calculation correctness.
  - Test Method: Unit + Integration
  - Evidence: Import test results, accuracy verification

---

## Epic 6: Privacy & GDPR (NFR-002)

### US-6.1: Data Export

**As a** user
**I want** to export my data in JSON format
**So that** I can access my information per GDPR requirements

**Activities:**

- E6-A1: Data Export API

**Story Points**: 2
**Priority**: High
**Dependencies**: FR-001

**Acceptance Criteria:**

- **US-6.1-AC01**: Users can request data export via GET /api/v1/users/me/export; export generates JSON bundle with user, profile, sessions, exercises, points, badges within ≤24h.
  - Test Method: E2E DSR
  - Evidence: Export job logs, JSON bundle samples

- **US-6.1-AC02**: Export link valid for 24h; download available via secure link; export includes all user data per GDPR requirements.
  - Test Method: E2E DSR
  - Evidence: Export link tests, data completeness verification

---

### US-6.2: Data Deletion

**As a** user
**I want** to delete my account and all associated data
**So that** I can exercise my right to be forgotten per GDPR

**Activities:**

- E6-A2: Data Deletion API

**Story Points**: 3
**Priority**: High
**Dependencies**: FR-001, US-6.1

**Acceptance Criteria:**

- **US-6.2-AC01**: Users can delete account via DELETE /api/v1/users/me; deletion marks account as pending_deletion; hard deletion occurs within 30 days.
  - Test Method: E2E DSR
  - Evidence: Deletion tests, account status verification

- **US-6.2-AC02**: Account deletion propagates to backups within ≤14 days (configurable); deletion receipt issued in audit log.
  - Test Method: Ops review
  - Evidence: Deletion pipeline logs, backup verification

- **US-6.2-AC03**: Deletion invalidates all active sessions; user cannot login after deletion; data anonymized where required for referential integrity.
  - Test Method: Integration
  - Evidence: Session invalidation tests, anonymization verification

---

### US-6.3: Consent Management

**As a** user
**I want** to manage my consent preferences
**So that** I can control how my data is used

**Activities:**

- E6-A3: Consent Management

**Story Points**: 3
**Priority**: High
**Dependencies**: FR-001

**Acceptance Criteria:**

- **US-6.3-AC01**: Users can manage consent preferences via UI; consent stored in database with timestamp and version; opt-out respected within ≤5m across services.
  - Test Method: E2E
  - Evidence: Consent UI screenshots, consent storage verification

- **US-6.3-AC02**: Consent banner gates optional analytics; consent changes trigger immediate effect; consent history maintained for audit.
  - Test Method: E2E
  - Evidence: Consent banner tests, analytics gating verification

---

### US-6.4: Privacy Settings

**As a** user
**I want** to configure privacy settings for my profile and content
**So that** I can control who sees my information

**Activities:**

- E6-A4: Privacy Settings UI

**Story Points**: 2
**Priority**: High
**Dependencies**: FR-009, US-3.2

**Acceptance Criteria:**

- **US-6.4-AC01**: Users can configure privacy settings for profile (hide age/weight) and content (default visibility) via privacy settings UI.
  - Test Method: E2E
  - Evidence: Privacy settings UI screenshots, settings persistence tests

- **US-6.4-AC02**: Privacy settings take effect immediately; past data visibility not retroactively changed; settings persisted in user profile.
  - Test Method: Integration + Security
  - Evidence: Privacy tests, settings application verification

---

### US-6.5: GDPR Audit Logging

**As a** system
**I want** to log all GDPR-related events
**So that** I can demonstrate compliance

**Activities:**

- E6-A5: Audit Logging

**Story Points**: 2
**Priority**: High
**Dependencies**: FR-008

**Acceptance Criteria:**

- **US-6.5-AC01**: All GDPR-related events (export requests, deletion requests, consent changes) are audit-logged with timestamp, user ID, and action details.
  - Test Method: Integration
  - Evidence: Audit log excerpts, GDPR event verification

- **US-6.5-AC02**: Audit logs are retained per retention policy; logs are searchable and exportable for compliance demonstrations.
  - Test Method: Ops review
  - Evidence: Audit log retention verification, search functionality

---

### US-6.6: Privacy Testing

**As a** developer
**I want** comprehensive tests for GDPR flows
**So that** I can ensure compliance requirements are met

**Activities:**

- E6-A6: Privacy Tests

**Story Points**: 2
**Priority**: High
**Dependencies**: US-6.1, US-6.2

**Acceptance Criteria:**

- **US-6.6-AC01**: Integration tests verify data export flow, deletion flow, consent management, and privacy settings with GDPR compliance checks.
  - Test Method: Integration
  - Evidence: GDPR flow test results

- **US-6.6-AC02**: E2E tests verify complete GDPR user journeys including export request, download, account deletion, and consent management.
  - Test Method: E2E DSR
  - Evidence: E2E test results, GDPR journey screenshots

---

## Epic 7: Performance Optimization (NFR-003)

### US-7.1: API Performance Optimization

**As a** user
**I want** API responses to be fast
**So that** I have a responsive experience

**Activities:**

- E7-A1: API Latency Optimization

**Story Points**: 3
**Priority**: High
**Dependencies**: All modules

**Acceptance Criteria:**

- **US-7.1-AC01**: API latency p95 ≤300ms for all endpoints per PRD targets; slow endpoints identified and optimized.
  - Test Method: Performance
  - Evidence: Performance metrics, latency histograms

- **US-7.1-AC02**: Per-endpoint budgets met: Auth ≤200ms, CRUD ≤300ms, Analytics ≤600ms, Feed ≤400ms p95.
  - Test Method: Performance
  - Evidence: Endpoint latency metrics, budget compliance

---

### US-7.2: Database Performance

**As a** system
**I want** database queries to be optimized
**So that** the application performs well under load

**Activities:**

- E7-A2: Database Query Optimization

**Story Points**: 4
**Priority**: High
**Dependencies**: All modules

**Acceptance Criteria:**

- **US-7.2-AC01**: Database queries optimized with proper indexes; slow query threshold 200ms; queries exceeding threshold logged and optimized.
  - Test Method: Performance
  - Evidence: Query performance metrics, index usage reports

- **US-7.2-AC02**: Large tables (sessions, user_points) partitioned by month; partitions automatically pruned; connection pooling p95 wait <5ms.
  - Test Method: Performance
  - Evidence: Partitioning verification, pool metrics

---

### US-7.3: Frontend Bundle Optimization

**As a** user
**I want** the application to load quickly
**So that** I can start using it without long waits

**Activities:**

- E7-A3: Frontend Bundle Optimization

**Story Points**: 3
**Priority**: High
**Dependencies**: Frontend

**Acceptance Criteria:**

- **US-7.3-AC01**: Frontend JS bundle size ≤300KB gzipped; Lighthouse CI budget enforced; bundle size regression >10% blocks merge.
  - Test Method: Performance
  - Evidence: Bundle size reports, Lighthouse CI results

- **US-7.3-AC02**: Code splitting implemented for non-critical routes; lazy loading mandatory; critical CSS inlined.
  - Test Method: Performance
  - Evidence: Bundle analysis, code splitting verification

---

### US-7.4: Frontend Performance Metrics

**As a** user
**I want** smooth page interactions
**So that** I have a good user experience

**Activities:**

- E7-A4: Frontend Performance

**Story Points**: 4
**Priority**: High
**Dependencies**: Frontend

**Acceptance Criteria:**

- **US-7.4-AC01**: Frontend performance metrics meet targets: LCP ≤2.5s, CLS ≤0.1, TTI ≤3.0s on mid-tier device, 4G connection.
  - Test Method: Performance
  - Evidence: Lighthouse reports, Web Vitals metrics

- **US-7.4-AC02**: Performance regression >10% from baseline blocks release; Lighthouse CI runs per PR with budget enforcement.
  - Test Method: Performance
  - Evidence: Lighthouse CI results, regression reports

---

### US-7.5: Caching Strategy

**As a** system
**I want** to cache frequently accessed data
**So that** I can serve requests faster

**Activities:**

- E7-A5: Caching Strategy

**Story Points**: 3
**Priority**: High
**Dependencies**: US-3.1, FR-007

**Acceptance Criteria:**

- **US-7.5-AC01**: Read-through caching implemented for heavy queries (feed, progress); cache TTL 60s default with explicit invalidation on data changes.
  - Test Method: Integration
  - Evidence: Cache hit ratio metrics, invalidation tests

- **US-7.5-AC02**: Cache strategy documented; cache keys follow naming convention; cache warming for frequently accessed data.
  - Test Method: Documentation review
  - Evidence: Cache documentation, cache key patterns

---

### US-7.6: Analytics Materialized Views

**As a** system
**I want** to use materialized views for analytics
**So that** complex queries run faster

**Activities:**

- E7-A6: Materialized Views

**Story Points**: 3
**Priority**: High
**Dependencies**: FR-007

**Acceptance Criteria:**

- **US-7.6-AC01**: Materialized views created for analytics (session_summary, exercise_prs, weekly_aggregates); views refreshed asynchronously (REFRESH CONCURRENTLY).
  - Test Method: Integration
  - Evidence: Materialized view definitions, refresh job logs

- **US-7.6-AC02**: Materialized views refresh on session completion or nightly; refresh is non-blocking; view consistency verified.
  - Test Method: Integration
  - Evidence: Refresh job logs, consistency tests

---

### US-7.7: Performance Testing

**As a** developer
**I want** automated performance tests
**So that** I can catch performance regressions

**Activities:**

- E7-A7: Performance Tests

**Story Points**: 3
**Priority**: High
**Dependencies**: All modules

**Acceptance Criteria:**

- **US-7.7-AC01**: k6 load tests configured and run in CI; tests validate throughput ≥500 req/s sustained, 1000 req/s burst.
  - Test Method: Performance
  - Evidence: k6 test results, throughput metrics

- **US-7.7-AC02**: Performance regression >10% from baseline blocks release; baseline dataset ≥10k sessions for realistic query costs.
  - Test Method: Performance
  - Evidence: Performance test results, regression reports

---

### US-7.8: Performance Monitoring

**As a** developer
**I want** performance metrics and dashboards
**So that** I can monitor system performance

**Activities:**

- E7-A8: Performance Monitoring

**Story Points**: 2
**Priority**: High
**Dependencies**: NFR-007

**Acceptance Criteria:**

- **US-7.8-AC01**: Performance metrics exposed via Prometheus: http_request_duration_ms, db_query_duration_ms, frontend_lcp_ms; metrics available in Grafana dashboards.
  - Test Method: Integration
  - Evidence: Prometheus metrics, Grafana dashboard screenshots

- **US-7.8-AC02**: Performance alerts configured: p95 latency >400ms for 10min (warning), error rate >0.5% for 5min (critical).
  - Test Method: Ops review
  - Evidence: Alert configuration, alert test results

---

## Epic 8: Accessibility (NFR-004)

### US-8.1: ARIA Labels and Semantic HTML

**As a** screen reader user
**I want** proper ARIA labels on all interactive elements
**So that** I can navigate the application effectively

**Activities:**

- E8-A1: ARIA Labels Audit

**Story Points**: 2
**Priority**: High
**Dependencies**: All frontend

**Acceptance Criteria:**

- **US-8.1-AC01**: All interactive elements have proper ARIA labels (aria-label, aria-labelledby, aria-describedby); semantic HTML used (button, nav, main, etc.).
  - Test Method: Accessibility audit
  - Evidence: ARIA audit results, HTML semantic verification

- **US-8.1-AC02**: Form inputs have associated labels; form errors announced to screen readers; form structure is logical.
  - Test Method: Accessibility audit
  - Evidence: Form accessibility tests, label association verification

---

### US-8.2: Keyboard Navigation

**As a** keyboard user
**I want** to navigate all features using only the keyboard
**So that** I can use the application without a mouse

**Activities:**

- E8-A2: Keyboard Navigation

**Story Points**: 3
**Priority**: High
**Dependencies**: All frontend

**Acceptance Criteria:**

- **US-8.2-AC01**: All features navigable using only keyboard (Tab, Enter, Space, Arrow keys); focus indicators visible (2px outline, sufficient contrast).
  - Test Method: Accessibility audit
  - Evidence: Keyboard navigation tests, focus indicator screenshots

- **US-8.2-AC02**: No keyboard traps; skip links available for main content; tab order is logical and predictable.
  - Test Method: Accessibility audit
  - Evidence: Keyboard trap tests, skip link verification

---

### US-8.3: Color Contrast Compliance

**As a** user with visual impairments
**I want** sufficient color contrast throughout the application
**So that** I can read all text clearly

**Activities:**

- E8-A3: Color Contrast

**Story Points**: 2
**Priority**: High
**Dependencies**: Frontend

**Acceptance Criteria:**

- **US-8.3-AC01**: Color contrast meets WCAG 2.1 AA standards: text 4.5:1 for normal text, 3:1 for large text; UI components 3:1.
  - Test Method: Accessibility audit
  - Evidence: Color contrast audit results, contrast ratio measurements

- **US-8.3-AC02**: Color is not the only means of conveying information; icons, labels, or patterns supplement color coding.
  - Test Method: Accessibility audit
  - Evidence: Color dependency audit, alternative indicator verification

---

### US-8.4: Screen Reader Compatibility

**As a** screen reader user
**I want** the application to work with my screen reader
**So that** I can access all features

**Activities:**

- E8-A4: Screen Reader Testing

**Story Points**: 3
**Priority**: High
**Dependencies**: All frontend

**Acceptance Criteria:**

- **US-8.4-AC01**: Application tested with screen readers (NVDA, JAWS, VoiceOver); all features accessible and functional.
  - Test Method: Screen reader testing
  - Evidence: Screen reader test results, accessibility test reports

- **US-8.4-AC02**: Dynamic content changes announced to screen readers; live regions (aria-live) used appropriately; page structure is logical.
  - Test Method: Screen reader testing
  - Evidence: Screen reader announcements, live region tests

---

### US-8.5: Focus Management

**As a** keyboard user
**I want** proper focus management in modals and dynamic content
**So that** I can navigate efficiently

**Activities:**

- E8-A5: Focus Management

**Story Points**: 2
**Priority**: High
**Dependencies**: All frontend

**Acceptance Criteria:**

- **US-8.5-AC01**: Focus management in modals: focus trapped within modal, focus returns to trigger on close, initial focus on first interactive element.
  - Test Method: Accessibility audit
  - Evidence: Modal focus tests, focus management verification

- **US-8.5-AC02**: Dynamic content (dropdowns, tooltips, notifications) manages focus appropriately; focus not lost unexpectedly.
  - Test Method: Accessibility audit
  - Evidence: Dynamic content focus tests

---

### US-8.6: Automated Accessibility Testing

**As a** developer
**I want** automated accessibility tests in CI
**So that** I can catch accessibility issues early

**Activities:**

- E8-A6: Accessibility Tests

**Story Points**: 2
**Priority**: High
**Dependencies**: All frontend

**Acceptance Criteria:**

- **US-8.6-AC01**: Automated accessibility tests (axe-core) run in CI; tests cover all pages and components; violations block merge.
  - Test Method: Automated testing
  - Evidence: CI test results, axe violation reports

- **US-8.6-AC02**: Accessibility test coverage ≥80% of interactive elements; critical violations (level 1) must be zero.
  - Test Method: Automated testing
  - Evidence: Test coverage reports, violation counts

---

### US-8.7: Lighthouse Accessibility Score

**As a** developer
**I want** a perfect Lighthouse accessibility score
**So that** I can ensure WCAG 2.1 AA compliance

**Activities:**

- E8-A7: Lighthouse A11y Audit

**Story Points**: 2
**Priority**: High
**Dependencies**: All frontend

**Acceptance Criteria:**

- **US-8.7-AC01**: Lighthouse accessibility score = 100; all accessibility audits pass; score maintained across releases.
  - Test Method: Lighthouse CI
  - Evidence: Lighthouse reports, accessibility score history

- **US-8.7-AC02**: Lighthouse CI runs per PR; accessibility score regression blocks merge; budget enforced.
  - Test Method: Lighthouse CI
  - Evidence: Lighthouse CI results, budget compliance

---

## Epic 9: Observability (NFR-007)

### US-9.1: Structured Logging

**As a** developer
**I want** structured JSON logs with correlation IDs
**So that** I can debug issues effectively

**Activities:**

- E9-A1: Structured Logging

**Story Points**: 2
**Priority**: Medium
**Dependencies**: All modules

**Acceptance Criteria:**

- **US-9.1-AC01**: All logs are structured JSON with required fields: ts, level, request_id, user_id (if authenticated), route, status, lat_ms; no PII in logs.
  - Test Method: Integration
  - Evidence: Log samples, PII scan results

- **US-9.1-AC02**: Correlation IDs (request_id) propagated across services; request tracing possible via correlation ID search.
  - Test Method: Integration
  - Evidence: Correlation ID propagation tests, trace verification

---

### US-9.2: Prometheus Metrics

**As a** developer
**I want** Prometheus metrics for all endpoints
**So that** I can monitor system health

**Activities:**

- E9-A2: Prometheus Metrics

**Story Points**: 3
**Priority**: Medium
**Dependencies**: All modules

**Acceptance Criteria:**

- **US-9.2-AC01**: Prometheus metrics exposed for all endpoints: http_request_duration_seconds (histogram), http_requests_total (counter) with method, route, status labels.
  - Test Method: Integration
  - Evidence: Prometheus metrics, metric definitions

- **US-9.2-AC02**: Database metrics: db_query_duration_seconds (histogram) with op, table labels; background job metrics: background_job_duration_seconds.
  - Test Method: Integration
  - Evidence: DB metrics, job metrics

- **US-9.2-AC03**: Metric cardinality bounded: route labels normalized, user IDs excluded, label sets limited to prevent cardinality explosion.
  - Test Method: Integration
  - Evidence: Cardinality analysis, metric samples

---

### US-9.3: Distributed Tracing

**As a** developer
**I want** OpenTelemetry tracing
**So that** I can trace requests across services

**Activities:**

- E9-A3: OpenTelemetry Tracing

**Story Points**: 3
**Priority**: Medium
**Dependencies**: All modules

**Acceptance Criteria:**

- **US-9.3-AC01**: OpenTelemetry tracing implemented with traceparent propagation; sampling rate 10% prod, 100% staging; spans include timing only (no PII).
  - Test Method: Integration
  - Evidence: Tracing configuration, trace samples

- **US-9.3-AC02**: Traces cover full request lifecycle: HTTP → service → database; trace IDs searchable in observability platform.
  - Test Method: Integration
  - Evidence: Trace samples, trace completeness verification

---

### US-9.4: Monitoring Dashboards

**As a** developer
**I want** Grafana dashboards for key metrics
**So that** I can visualize system performance

**Activities:**

- E9-A4: Grafana Dashboards

**Story Points**: 2
**Priority**: Medium
**Dependencies**: US-9.2

**Acceptance Criteria:**

- **US-9.4-AC01**: Grafana dashboards created for: API latency (p95), error rate, DB health, job queues, uploads AV, performance budgets.
  - Test Method: Ops review
  - Evidence: Grafana dashboard screenshots, dashboard definitions

- **US-9.4-AC02**: Dashboards refresh automatically; data retention configured; dashboards accessible to ops team.
  - Test Method: Ops review
  - Evidence: Dashboard configuration, access verification

---

### US-9.5: Alerting

**As a** developer
**I want** alerts for critical metrics
**So that** I can respond to issues quickly

**Activities:**

- E9-A5: Alerting Rules

**Story Points**: 2
**Priority**: Medium
**Dependencies**: US-9.2, US-9.4

**Acceptance Criteria:**

- **US-9.5-AC01**: Alerting rules configured for: 5xx rate spikes (>0.5% for 5min), p95 latency breaches (>400ms for 10min), DB pool saturation, auth lockout anomalies.
  - Test Method: Ops review
  - Evidence: Alert rule definitions, alert test results

- **US-9.5-AC02**: Alerts sent to appropriate channels (PagerDuty, Slack, email); alert routing based on severity; alert fatigue prevented.
  - Test Method: Ops review
  - Evidence: Alert configuration, notification channel tests

---

### US-9.6: Log Aggregation

**As a** developer
**I want** centralized log aggregation
**So that** I can search and analyze logs efficiently

**Activities:**

- E9-A6: Log Aggregation

**Story Points**: 3
**Priority**: Medium
**Dependencies**: US-9.1

**Acceptance Criteria:**

- **US-9.6-AC01**: Log aggregation pipeline configured (Loki or compatible); logs ingested from all services; logs searchable by correlation ID, user ID, timestamp.
  - Test Method: Ops review
  - Evidence: Log aggregation configuration, search functionality

- **US-9.6-AC02**: Log retention policy configured (default 30 days, configurable); log storage optimized; log queries performant (<2s for typical searches).
  - Test Method: Ops review
  - Evidence: Retention policy, query performance metrics

---

## Epic 10: Availability & Backups (NFR-005)

### US-10.1: Automated Backups

**As a** system administrator
**I want** automated daily encrypted backups
**So that** I can recover from data loss

**Activities:**

- E10-A1: Backup Automation

**Story Points**: 3
**Priority**: High
**Dependencies**: Infrastructure

**Acceptance Criteria:**

- **US-10.1-AC01**: Automated daily encrypted backups of all critical data (users, sessions, exercises, points); backups stored in secure location.
  - Test Method: Ops review
  - Evidence: Backup job logs, backup storage verification

- **US-10.1-AC02**: Backup encryption verified; backup integrity checksums validated; backup rotation policy (retain 30 days daily, 12 months monthly).
  - Test Method: Ops review
  - Evidence: Encryption verification, rotation policy

---

### US-10.2: Backup Testing

**As a** system administrator
**I want** quarterly backup restore tests
**So that** I can verify backup integrity

**Activities:**

- E10-A2: Backup Testing

**Story Points**: 2
**Priority**: High
**Dependencies**: US-10.1

**Acceptance Criteria:**

- **US-10.2-AC01**: Quarterly backup restore tests performed; restore procedure documented; restore RTO ≤4h, RPO ≤24h verified.
  - Test Method: Ops review
  - Evidence: Restore test logs, RTO/RPO verification

- **US-10.2-AC02**: Restore tests include data integrity verification; restored data matches source; restore procedure tested end-to-end.
  - Test Method: Ops review
  - Evidence: Restore test results, integrity verification

---

### US-10.3: Disaster Recovery

**As a** system administrator
**I want** documented and tested DR procedures
**So that** I can recover from disasters

**Activities:**

- E10-A3: DR Procedures

**Story Points**: 3
**Priority**: High
**Dependencies**: US-10.1

**Acceptance Criteria:**

- **US-10.3-AC01**: Disaster recovery procedures documented in runbook; DR scenarios tested (regional failover, data center outage); RTO ≤4h, RPO ≤24h.
  - Test Method: Ops review
  - Evidence: DR runbook, DR test results

- **US-10.3-AC02**: DR procedures include communication plan, escalation paths, and rollback procedures; procedures reviewed quarterly.
  - Test Method: Ops review
  - Evidence: DR documentation, review records

---

### US-10.4: Enhanced Health Checks

**As a** system
**I want** comprehensive health check endpoints
**So that** monitoring systems can detect issues

**Activities:**

- E10-A4: Health Check Enhancement

**Story Points**: 2
**Priority**: High
**Dependencies**: Infrastructure

**Acceptance Criteria:**

- **US-10.4-AC01**: Health check endpoint GET /api/v1/health returns 200 with service status (database, storage, external services); health checks used by load balancer.
  - Test Method: Integration
  - Evidence: Health check responses, load balancer configuration

- **US-10.4-AC02**: Health check includes readiness and liveness probes; unhealthy services removed from load balancer; health status monitored.
  - Test Method: Integration
  - Evidence: Health check implementation, monitoring verification

---

### US-10.5: Read-Only Mode

**As a** system administrator
**I want** a read-only mode for maintenance
**So that** I can perform maintenance without data corruption

**Activities:**

- E10-A5: Read-Only Mode

**Story Points**: 2
**Priority**: High
**Dependencies**: System module

**Acceptance Criteria:**

- **US-10.5-AC01**: Read-only mode implemented via system configuration; read-only mode prevents all write operations (POST, PATCH, DELETE return 503).
  - Test Method: Integration
  - Evidence: Read-only mode tests, maintenance mode verification

- **US-10.5-AC02**: Read-only mode can be toggled via admin endpoint or environment variable; mode change takes effect within ≤10s.
  - Test Method: Integration
  - Evidence: Mode toggle tests, activation timing

---

## Epic 12: Coach Training Unit Assignment (FR-012)

### US-12.1: Manage Coach-Athlete Relationships

**As a** coach
**I want** to establish and manage relationships with athletes
**So that** I can assign training units to them

**Activities:**

- E12-A1: Coach-Athlete Relationship API
- E12-A11: Coach-Athlete Management Frontend
- E12-A14: Coach-Athlete Relationship Tests

**Story Points**: 5
**Priority**: High
**Dependencies**: FR-001, FR-002, FR-008

**Acceptance Criteria:**

- **US-12.1-AC01**: Coaches can create consent-based relationships with athletes via POST /api/v1/coaches/athletes; relationships require athlete consent before activation.
  - Test Method: Integration + E2E
  - Evidence: Relationship creation tests, consent flow verification

- **US-12.1-AC02**: Coaches can list their athletes via GET /api/v1/coaches/athletes with pagination; athletes can list their coaches via GET /api/v1/athletes/coaches.
  - Test Method: Integration + E2E
  - Evidence: List endpoints tests, UI screenshots

- **US-12.1-AC03**: Either party can revoke the relationship via DELETE /api/v1/coaches/athletes/:id; revocation takes effect immediately and prevents further assignments.
  - Test Method: Integration + E2E
  - Evidence: Revocation tests, access control verification

- **US-12.1-AC04**: Frontend UI allows coaches to manage athlete relationships with search, filter, and relationship status display.
  - Test Method: E2E
  - Evidence: UI screenshots, relationship management workflow

- **US-12.1-AC05**: Access control tests verify coaches can only manage their own relationships; athletes can only see their assigned coaches.
  - Test Method: Integration + Security
  - Evidence: Access control test results, security audit

---

### US-12.2: Create and Manage Training Units

**As a** coach
**I want** to create and manage training units with exercises and repeat counts
**So that** I can build a library of training programs

**Activities:**

- E12-A2: Training Unit Data Model
- E12-A3: Training Unit CRUD API
- E12-A8: Training Unit Library Frontend
- E12-A9: Training Unit Creation Frontend

**Story Points**: 8
**Priority**: High
**Dependencies**: FR-010

**Acceptance Criteria:**

- **US-12.2-AC01**: Training units data model created with training_units table including fields: id, coach_id, name, description, exercises (JSONB), repeat_count, metadata, created_at, updated_at, archived_at.
  - Test Method: Integration
  - Evidence: Migration file, schema verification, DB snapshot

- **US-12.2-AC02**: Coaches can create training units via POST /api/v1/training-units with exercises array and repeat count; training unit saved within ≤500ms.
  - Test Method: Integration + E2E
  - Evidence: Creation tests, API response times, DB records

- **US-12.2-AC03**: Coaches can read, update, and archive their training units via GET/PATCH/DELETE /api/v1/training-units/:id; archived units are soft-deleted.
  - Test Method: Integration + E2E
  - Evidence: CRUD operation tests, archival verification

- **US-12.2-AC04**: Training unit library frontend displays all coach's training units with search, filter, and list views; supports pagination.
  - Test Method: E2E
  - Evidence: Library UI screenshots, search functionality tests

- **US-12.2-AC05**: Training unit creation/editing UI allows adding exercises, setting repeat counts, and managing metadata with proper validation.
  - Test Method: E2E
  - Evidence: Creation UI screenshots, form validation tests

---

### US-12.3: Assign Training Units to Athletes

**As a** coach
**I want** to assign training units to athletes with date selection and exercise modifications
**So that** I can provide personalized training programs

**Activities:**

- E12-A4: Exercise Repeat/Rounds Logic
- E12-A5: Training Unit Assignment API
- E12-A6: Exercise Modification API
- E12-A7: Bulk Assignment API
- E12-A10: Assignment Frontend
- E12-A12: Assignment History Frontend

**Story Points**: 10
**Priority**: High
**Dependencies**: US-12.1, US-12.2, FR-004

**Acceptance Criteria:**

- **US-12.3-AC01**: Exercise repeat/rounds logic duplicates exercises based on repeat_count when creating sessions; logic handles nested repeats correctly.
  - Test Method: Integration
  - Evidence: Repeat logic tests, session generation verification

- **US-12.3-AC02**: Coaches can assign training units to athletes via POST /api/v1/training-units/:id/assign with athlete_id and planned_at date; assignment creates planned sessions.
  - Test Method: Integration + E2E
  - Evidence: Assignment tests, session creation verification

- **US-12.3-AC03**: Coaches can modify exercise parameters (weight, substitution, intensity) during assignment via assignment API with exercise_modifications array.
  - Test Method: Integration + E2E
  - Evidence: Modification tests, parameter override verification

- **US-12.3-AC04**: Bulk assignment endpoint POST /api/v1/training-units/:id/assign-bulk allows assigning to multiple athletes efficiently; supports up to 50 athletes per request.
  - Test Method: Integration
  - Evidence: Bulk assignment tests, performance metrics

- **US-12.3-AC05**: Assignment frontend UI provides athlete selection, date picker, exercise modification interface, and assignment confirmation.
  - Test Method: E2E
  - Evidence: Assignment UI screenshots, workflow tests

- **US-12.3-AC06**: Assignment history frontend displays all assignments with filtering by athlete, date range, and completion status; supports pagination.
  - Test Method: E2E
  - Evidence: History UI screenshots, filter functionality tests

---

### US-12.4: Training Unit Testing

**As a** developer
**I want** comprehensive tests for training unit functionality
**So that** I can ensure coach-athlete features work correctly

**Activities:**

- E12-A13: Training Unit Tests

**Story Points**: 3
**Priority**: High
**Dependencies**: US-12.2, US-12.3

**Acceptance Criteria:**

- **US-12.4-AC01**: Integration tests cover training unit CRUD operations, assignment flow, repeat logic, and exercise modifications with ≥90% code coverage.
  - Test Method: Integration
  - Evidence: Test coverage reports, integration test results

- **US-12.4-AC02**: E2E tests verify complete training unit workflow including creation, assignment, modification, and history viewing.
  - Test Method: E2E
  - Evidence: E2E test results, workflow verification

---

## Epic 13: WCAG 2.2 Compliance Update (NFR-004 Enhancement)

### US-13.1: Update Accessibility Documentation

**As a** developer
**I want** all accessibility documentation updated to reference WCAG 2.2 AA
**So that** the project reflects current accessibility standards

**Activities:**

- E13-A1: Update Visual Design System
- E13-A2: Update ADR-020
- E13-A3: Update NFR-004

**Story Points**: 2
**Priority**: High
**Dependencies**: Documentation

**Acceptance Criteria:**

- **US-13.1-AC01**: Visual Design System updated to reference WCAG 2.2 AA instead of 2.1 AA; status messages pattern documented.
  - Test Method: Documentation review
  - Evidence: VDS updates, status messages pattern documentation

- **US-13.1-AC02**: ADR-020 updated to reference WCAG 2.2 instead of 2.1; all accessibility decisions reflect 2.2 standards.
  - Test Method: Documentation review
  - Evidence: ADR-020 updates, decision log

- **US-13.1-AC03**: NFR-004 requirement document updated to reference WCAG 2.2; all acceptance criteria reflect 2.2 success criteria.
  - Test Method: Documentation review
  - Evidence: NFR-004 updates, requirement verification

---

### US-13.2: Focus Not Obscured (2.4.11)

**As a** keyboard user
**I want** focus indicators to always be visible
**So that** I can navigate the application effectively

**Activities:**

- E13-A4: Focus Visibility Audit

**Story Points**: 2
**Priority**: High
**Dependencies**: US-8.5, All frontend

**Acceptance Criteria:**

- **US-13.2-AC01**: All focus indicators are visible and not hidden by sticky headers, modals, or overlays; minimum 2px visibility requirement met.
  - Test Method: Accessibility audit
  - Evidence: Focus visibility audit results, z-index guidelines

- **US-13.2-AC02**: Z-index guidelines documented for focusable elements; automated tests verify focus visibility across all pages.
  - Test Method: Accessibility audit + Automated testing
  - Evidence: Z-index documentation, focus visibility test results

---

### US-13.3: Keyboard Alternatives for Dragging (2.5.7)

**As a** keyboard user
**I want** keyboard alternatives for all drag-and-drop operations
**So that** I can use the planner without a mouse

**Activities:**

- E13-A5: Keyboard Alternatives for Dragging

**Story Points**: 3
**Priority**: High
**Dependencies**: US-4.3, US-8.2

**Acceptance Criteria:**

- **US-13.3-AC01**: All drag-and-drop operations in Planner have keyboard alternatives; arrow keys and Enter/Space activate drag operations.
  - Test Method: E2E + Accessibility audit
  - Evidence: Keyboard navigation tests, drag alternative verification

- **US-13.3-AC02**: Keyboard navigation documented for all draggable elements; documentation includes key bindings and usage patterns.
  - Test Method: Documentation review
  - Evidence: Keyboard navigation documentation, key binding reference

- **US-13.3-AC03**: E2E tests verify keyboard alternatives work for all drag operations; tests cover month/week/day calendar views.
  - Test Method: E2E
  - Evidence: E2E test results, keyboard workflow verification

---

### US-13.4: Target Size Compliance (2.5.8)

**As a** user with motor impairments
**I want** all interactive elements to meet minimum target size requirements
**So that** I can easily click or tap on controls

**Activities:**

- E13-A6: Target Size Verification

**Story Points**: 2
**Priority**: High
**Dependencies**: US-8.3, Frontend

**Acceptance Criteria:**

- **US-13.4-AC01**: All pointer targets meet minimum 24×24 CSS pixels; design system explicitly documents 24×24 minimum (current 44×44 exceeds requirement).
  - Test Method: Accessibility audit
  - Evidence: Target size audit results, design system updates

- **US-13.4-AC02**: Exceptions documented (inline links, essential targets) with justification; automated tests verify target sizes.
  - Test Method: Accessibility audit + Automated testing
  - Evidence: Exception documentation, target size test results

---

### US-13.5: Consistent Help Mechanisms (3.2.6)

**As a** user
**I want** help mechanisms to appear in consistent locations
**So that** I can easily find assistance when needed

**Activities:**

- E13-A7: Help Mechanism Consistency

**Story Points**: 2
**Priority**: High
**Dependencies**: All frontend

**Acceptance Criteria:**

- **US-13.5-AC01**: Help mechanisms (help links, contact forms) appear in consistent location across all pages; help placement pattern documented in design system.
  - Test Method: Manual audit
  - Evidence: Help mechanism audit results, design system documentation

- **US-13.5-AC02**: Manual audit confirms consistency across pages; help mechanisms are accessible and functional.
  - Test Method: Manual audit
  - Evidence: Consistency audit report, help mechanism verification

---

### US-13.6: Form Data Persistence (3.3.7)

**As a** user
**I want** form data to persist when validation errors occur
**So that** I don't have to re-enter information

**Activities:**

- E13-A8: Form Data Persistence

**Story Points**: 2
**Priority**: High
**Dependencies**: All frontend

**Acceptance Criteria:**

- **US-13.6-AC01**: Form data persists on validation errors; multi-step forms preserve entered data across steps.
  - Test Method: E2E
  - Evidence: Form persistence tests, data preservation verification

- **US-13.6-AC02**: Auto-population patterns documented; forms use consistent patterns for data persistence.
  - Test Method: Documentation review
  - Evidence: Auto-population documentation, pattern examples

- **US-13.6-AC03**: E2E tests verify data persistence across all forms; tests cover validation error scenarios.
  - Test Method: E2E
  - Evidence: E2E test results, persistence verification

---

### US-13.7: Accessible Authentication (3.3.8)

**As a** user
**I want** authentication without cognitive function tests
**So that** I can access the application easily

**Activities:**

- E13-A9: Authentication Pattern Review

**Story Points**: 2
**Priority**: High
**Dependencies**: Auth module

**Acceptance Criteria:**

- **US-13.7-AC01**: No cognitive function tests (CAPTCHA, puzzles) in authentication flows; authentication patterns documented.
  - Test Method: Manual audit
  - Evidence: Authentication audit results, pattern documentation

- **US-13.7-AC02**: If CAPTCHA is added in future, alternative authentication must be available; manual audit confirms compliance.
  - Test Method: Manual audit
  - Evidence: Compliance verification, alternative authentication documentation

---

### US-13.8: Status Messages Implementation (4.1.3)

**As a** screen reader user
**I want** status messages to be properly announced
**So that** I am aware of application state changes

**Activities:**

- E13-A10: Status Messages Implementation

**Story Points**: 2
**Priority**: High
**Dependencies**: All frontend

**Acceptance Criteria:**

- **US-13.8-AC01**: All status messages use appropriate ARIA roles (role="status" for polite, role="alert" for assertive); status message patterns documented in design system.
  - Test Method: Accessibility audit
  - Evidence: ARIA role audit results, design system documentation

- **US-13.8-AC02**: Polite vs. assertive updates properly implemented; automated tests verify ARIA roles.
  - Test Method: Automated testing
  - Evidence: ARIA role test results, status message verification

---

### US-13.9: WCAG 2.2 Testing and Validation

**As a** developer
**I want** accessibility tests updated for WCAG 2.2
**So that** I can verify compliance with new standards

**Activities:**

- E13-A11: Update Accessibility Tests
- E13-A12: WCAG 2.2 Compliance Validation

**Story Points**: 3
**Priority**: High
**Dependencies**: US-8.6, All WCAG 2.2 stories

**Acceptance Criteria:**

- **US-13.9-AC01**: Accessibility tests updated to include WCAG 2.2 tags; axe-core tests include all 9 new success criteria.
  - Test Method: Automated testing
  - Evidence: Test updates, WCAG 2.2 tag verification

- **US-13.9-AC02**: All new criteria verified with automated tests; manual testing checklist updated for WCAG 2.2.
  - Test Method: Automated testing + Manual audit
  - Evidence: Test results, updated checklist

- **US-13.9-AC03**: Full accessibility audit run; Lighthouse and axe-core report 0 WCAG 2.2 violations; all 9 new criteria pass.
  - Test Method: Accessibility audit
  - Evidence: Audit report, Lighthouse scores, axe-core results

---

## Epic 11: Technical Debt & Code Quality

### US-11.1: Fix 2FA Route Conflict

**As a** developer
**I want** to remove duplicate 2FA routes and dead code
**So that** the codebase is cleaner and easier to maintain

**Activities:**

- E11-A1: Fix 2FA Route Conflict

**Story Points**: 1
**Priority**: Medium
**Dependencies**: Auth module

**Acceptance Criteria:**

- **US-11.1-AC01**: Duplicate 2FA routes removed from auth.routes.ts (lines 99-128); twofa.controller.ts and twofa.service.ts deleted if unused.
  - Test Method: Code review
  - Evidence: Code diff, route conflict resolution

- **US-11.1-AC02**: Only two-factor.controller.ts and two-factor.routes.ts remain; all 2FA functionality uses single implementation; tests updated.
  - Test Method: Code review
  - Evidence: Code verification, test updates

---

### US-11.2: Review Skipped Tests

**As a** developer
**I want** to review and fix or document skipped tests
**So that** test coverage is complete

**Activities:**

- E11-A2: Review Skipped Tests

**Story Points**: 2
**Priority**: Medium
**Dependencies**: Test suite

**Acceptance Criteria:**

- **US-11.2-AC01**: All 62 skipped tests reviewed; tests either fixed, documented (with reason), or removed; test coverage maintained or improved.
  - Test Method: Code review
  - Evidence: Skipped test review log, test fixes

- **US-11.2-AC02**: Skipped test reasons documented in test files or test plan; intentional skips justified; no tests skipped without reason.
  - Test Method: Code review
  - Evidence: Test documentation, skip reason verification

---

### US-11.3: Standardize Test Patterns

**As a** developer
**I want** standardized timer cleanup patterns in tests
**So that** tests are consistent and maintainable

**Activities:**

- E11-A3: Standardize Timer Cleanup

**Story Points**: 1
**Priority**: Medium
**Dependencies**: Test suite

**Acceptance Criteria:**

- **US-11.3-AC01**: Timer cleanup standardized: tests using jest.useFakeTimers() restore in afterEach; no global timer clearing; pattern documented.
  - Test Method: Code review
  - Evidence: Timer cleanup pattern, test updates

---

### US-11.4: Improve Test Cleanup

**As a** developer
**I want** improved database connection cleanup in tests
**So that** tests run reliably

**Activities:**

- E11-A4: Database Connection Cleanup

**Story Points**: 2
**Priority**: Medium
**Dependencies**: Test suite

**Acceptance Criteria:**

- **US-11.4-AC01**: Database connection cleanup verified: all tests that create connections close them in afterEach/afterAll; no open handles detected.
  - Test Method: Integration
  - Evidence: Connection cleanup tests, open handle verification

---

### US-11.5: Code Documentation

**As a** developer
**I want** comprehensive code documentation
**So that** the codebase is easier to understand and maintain

**Activities:**

- E11-A5: Code Documentation

**Story Points**: 2
**Priority**: Medium
**Dependencies**: All modules

**Acceptance Criteria:**

- **US-11.5-AC01**: All public APIs have JSDoc comments with parameter descriptions, return types, and examples; documentation coverage ≥80%.
  - Test Method: Code review
  - Evidence: JSDoc coverage report, documentation samples

- **US-11.5-AC02**: Complex business logic has inline comments explaining rationale; code is self-documenting where possible; README files updated.
  - Test Method: Code review
  - Evidence: Code documentation review, README updates

---

## Summary

### Total User Stories: 78

### By Epic

- Epic 1: 3 stories (12 SP)
- Epic 2: 6 stories (20 SP)
- Epic 3: 8 stories (30 SP)
- Epic 4: 5 stories (23 SP)
- Epic 5: 6 stories (26 SP)
- Epic 6: 6 stories (14 SP)
- Epic 7: 8 stories (25 SP)
- Epic 8: 7 stories (16 SP)
- Epic 9: 6 stories (15 SP)
- Epic 10: 5 stories (12 SP)
- Epic 11: 5 stories (8 SP)
- Epic 12: 4 stories (26 SP)
- Epic 13: 9 stories (20 SP)

### Total Story Points: 267 SP

### By Priority

- **High**: 45 stories (141 SP)
- **Medium**: 33 stories (126 SP)

---

**Last Updated**: 2025-01-23
**Next Review**: 2025-02-01
