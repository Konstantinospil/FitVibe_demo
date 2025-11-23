#!/usr/bin/env python3
"""
Generate comprehensive acceptance criteria for all user stories.
"""

import re
from pathlib import Path
from typing import Dict, List

# Acceptance criteria templates based on story type and PRD/TDD requirements
AC_TEMPLATES = {
    # Epic 1: Profile & Settings
    "US-1.1": [
        {
            "id": "US-1.1-AC01",
            "criterion": "Users can edit alias, weight, fitness level, and training frequency via API endpoint PATCH /api/v1/users/me within ≤500ms response time.",
            "test_method": "Integration + E2E",
            "evidence": "API response times, DB snapshot, UI screenshots"
        },
        {
            "id": "US-1.1-AC02",
            "criterion": "Profile field validation: alias max 32 chars, weight range 20-400 kg (or equivalent in lbs), fitness level enum (beginner/intermediate/advanced/elite), training frequency enum (rarely/1_2_per_week/3_4_per_week/5_plus_per_week). Invalid values rejected with 422 and clear error messages.",
            "test_method": "Unit + API negative",
            "evidence": "Validation test results, error message samples"
        },
        {
            "id": "US-1.1-AC03",
            "criterion": "Immutable fields (date_of_birth, gender) cannot be modified; attempts return 403 Forbidden with error code E.USER.IMMUTABLE_FIELD.",
            "test_method": "API negative",
            "evidence": "HTTP traces, error responses"
        },
        {
            "id": "US-1.1-AC04",
            "criterion": "Weight is stored internally as kg (weight_kg) regardless of user's preferred unit; UI converts for display based on user's weight_unit preference.",
            "test_method": "Integration",
            "evidence": "DB records, UI conversion tests"
        },
        {
            "id": "US-1.1-AC05",
            "criterion": "Profile changes are audit-logged with who/when/what; state history records created for each field change.",
            "test_method": "Integration",
            "evidence": "Audit log excerpts, state history records"
        }
    ],
    "US-1.2": [
        {
            "id": "US-1.2-AC01",
            "criterion": "Users can upload avatar images via POST /api/v1/users/me/avatar; accepted formats: JPEG, PNG, WebP; max size 5MB; rejected with 422 if invalid.",
            "test_method": "Integration",
            "evidence": "Upload logs, error responses for invalid files"
        },
        {
            "id": "US-1.2-AC02",
            "criterion": "Uploaded avatars are scanned for malware using antivirus service; infected files rejected with E.UPLOAD.MALWARE_DETECTED and audit logged.",
            "test_method": "Integration",
            "evidence": "AV scan logs, EICAR test file rejection"
        },
        {
            "id": "US-1.2-AC03",
            "criterion": "System generates 128×128 pixel preview image from uploaded avatar within ≤2s; preview stored and served at /users/avatar/:id endpoint.",
            "test_method": "Integration",
            "evidence": "Preview images, performance metrics, storage verification"
        },
        {
            "id": "US-1.2-AC04",
            "criterion": "Users without avatars see a default placeholder image; placeholder is accessible and properly sized.",
            "test_method": "E2E",
            "evidence": "UI screenshots showing placeholder"
        },
        {
            "id": "US-1.2-AC05",
            "criterion": "Avatar upload is idempotent via Idempotency-Key header; duplicate uploads return same result with Idempotent-Replayed header.",
            "test_method": "Integration",
            "evidence": "Idempotency test results, HTTP headers"
        }
    ],
    "US-1.3": [
        {
            "id": "US-1.3-AC01",
            "criterion": "Unit tests cover profile field validation, immutable field protection, and weight unit conversion with ≥90% code coverage.",
            "test_method": "Unit",
            "evidence": "Test coverage reports"
        },
        {
            "id": "US-1.3-AC02",
            "criterion": "Integration tests verify profile update API, avatar upload flow, and error handling scenarios.",
            "test_method": "Integration",
            "evidence": "Integration test results"
        },
        {
            "id": "US-1.3-AC03",
            "criterion": "E2E tests verify complete profile editing workflow including form validation, submission, and persistence.",
            "test_method": "E2E",
            "evidence": "E2E test results, UI screenshots"
        }
    ],
    # Epic 2: Exercise Library
    "US-2.1": [
        {
            "id": "US-2.1-AC01",
            "criterion": "Users can create exercises via POST /api/v1/exercises with required fields (name, type_code) and optional fields (muscle_group, equipment, tags, description); exercise saved within ≤500ms.",
            "test_method": "Integration + E2E",
            "evidence": "DB snapshot, UI screenshots, API response times"
        },
        {
            "id": "US-2.1-AC02",
            "criterion": "Users can update their own exercises via PATCH /api/v1/exercises/:id; edits preserve historical accuracy; unauthorized edits return 403.",
            "test_method": "Integration + E2E",
            "evidence": "Update tests, access control verification"
        },
        {
            "id": "US-2.1-AC03",
            "criterion": "Exercises can be archived (soft delete) via DELETE /api/v1/exercises/:id; archived exercises have archived_at timestamp set; they are hidden from selectors but retained in database.",
            "test_method": "Integration + E2E",
            "evidence": "DB records, UI showing archived exercises not in selectors"
        },
        {
            "id": "US-2.1-AC04",
            "criterion": "Exercise visibility model: private (default, owner_id = user_id) or public (is_public = true); private exercises only visible to creator.",
            "test_method": "Integration + E2E",
            "evidence": "Access control tests, UI screenshots"
        },
        {
            "id": "US-2.1-AC05",
            "criterion": "Exercise name uniqueness enforced per owner: (owner_id, normalized_name) unique constraint; duplicate names rejected with 409 CONFLICT.",
            "test_method": "Unit + API negative",
            "evidence": "Uniqueness test results, error responses"
        }
    ],
    "US-2.2": [
        {
            "id": "US-2.2-AC01",
            "criterion": "Users can search public exercises via GET /api/v1/exercises?is_public=true&q=searchterm with pagination (default 20, max 100).",
            "test_method": "E2E",
            "evidence": "Search results, API response times"
        },
        {
            "id": "US-2.2-AC02",
            "criterion": "Exercise search supports filtering by category (type_code), muscle_group, equipment, and tags; filters can be combined.",
            "test_method": "E2E",
            "evidence": "Filter UI screenshots, filtered search results"
        },
        {
            "id": "US-2.2-AC03",
            "criterion": "Search results are sorted by relevance (name match) or date; empty results return empty array with 200 status.",
            "test_method": "E2E",
            "evidence": "Search result ordering, empty result handling"
        }
    ],
    "US-2.3": [
        {
            "id": "US-2.3-AC01",
            "criterion": "When an exercise is used in a session, exercise name is stored as snapshot in session_exercises.exercise_name field; snapshot persists even if exercise is later modified or archived.",
            "test_method": "Integration",
            "evidence": "DB records showing snapshot preservation, exercise modification tests"
        },
        {
            "id": "US-2.3-AC02",
            "criterion": "Historical sessions display exercise name from snapshot, not current exercise name; exercise changes do not affect past session records.",
            "test_method": "Integration + E2E",
            "evidence": "Historical session display tests, exercise modification verification"
        }
    ],
    "US-2.4": [
        {
            "id": "US-2.4-AC01",
            "criterion": "Administrators can create global exercises (owner_id = null) via POST /api/v1/exercises with admin role; global exercises are accessible to all users.",
            "test_method": "Integration + E2E",
            "evidence": "Admin UI screenshots, access control tests"
        },
        {
            "id": "US-2.4-AC02",
            "criterion": "Administrators can edit and archive global exercises; non-admin users cannot modify global exercises (403 Forbidden).",
            "test_method": "Integration + E2E",
            "evidence": "Admin edit tests, non-admin access denial"
        }
    ],
    "US-2.5": [
        {
            "id": "US-2.5-AC01",
            "criterion": "Exercise selector in Planner and Logger displays user's personal exercises, global exercises, and public exercises; archived exercises are excluded.",
            "test_method": "E2E",
            "evidence": "Exercise selector UI screenshots, exercise list verification"
        },
        {
            "id": "US-2.5-AC02",
            "criterion": "Exercise selector supports search and filtering; selected exercise is added to session with proper reference.",
            "test_method": "E2E",
            "evidence": "Selector search tests, exercise addition verification"
        }
    ],
    "US-2.6": [
        {
            "id": "US-2.6-AC01",
            "criterion": "Unit tests cover exercise CRUD operations, archival, visibility model, and uniqueness constraints with ≥90% code coverage.",
            "test_method": "Unit",
            "evidence": "Test coverage reports"
        },
        {
            "id": "US-2.6-AC02",
            "criterion": "Integration tests verify exercise creation, editing, archival, search, and access control scenarios.",
            "test_method": "Integration",
            "evidence": "Integration test results"
        },
        {
            "id": "US-2.6-AC03",
            "criterion": "E2E tests verify complete exercise management workflow including creation, search, selection, and archival.",
            "test_method": "E2E",
            "evidence": "E2E test results, UI screenshots"
        }
    ],
    # Epic 3: Sharing & Community
    "US-3.1": [
        {
            "id": "US-3.1-AC01",
            "criterion": "Authenticated users can access public feed via GET /api/v1/feed?scope=public with pagination (default 20 items per page, max 100); feed returns public sessions only.",
            "test_method": "Integration + E2E",
            "evidence": "Feed API responses, pagination tests, UI screenshots"
        },
        {
            "id": "US-3.1-AC02",
            "criterion": "Feed supports search via ?q=keyword parameter; search matches session titles, exercise names, and user aliases.",
            "test_method": "E2E",
            "evidence": "Search functionality tests, search result screenshots"
        },
        {
            "id": "US-3.1-AC03",
            "criterion": "Feed supports sorting by date (default), popularity (likes), and relevance; sort parameter ?sort=date|popularity|relevance.",
            "test_method": "E2E",
            "evidence": "Sort functionality tests, sorted feed screenshots"
        },
        {
            "id": "US-3.1-AC04",
            "criterion": "Feed response time p95 ≤400ms per PRD performance targets; feed is cached for 30s via NGINX edge caching.",
            "test_method": "Performance",
            "evidence": "Performance metrics, cache hit ratio"
        }
    ],
    "US-3.2": [
        {
            "id": "US-3.2-AC01",
            "criterion": "Users can toggle session visibility (private/public) via PATCH /api/v1/sessions/:id with visibility field; default is private.",
            "test_method": "Integration + E2E",
            "evidence": "Visibility toggle tests, API responses"
        },
        {
            "id": "US-3.2-AC02",
            "criterion": "Switching session from private to public makes it visible in feed within ≤2s; switching from public to private removes it from feed immediately; past private data never leaked.",
            "test_method": "Integration + Security",
            "evidence": "Privacy tests, data leakage verification, feed update timing"
        }
    ],
    "US-3.3": [
        {
            "id": "US-3.3-AC01",
            "criterion": "Users can like/unlike public sessions via POST /api/v1/feed/item/:feedItemId/like and DELETE /api/v1/feed/item/:feedItemId/like; like action is idempotent.",
            "test_method": "Integration + E2E",
            "evidence": "Like button tests, API responses, idempotency verification"
        },
        {
            "id": "US-3.3-AC02",
            "criterion": "Like counts update in real-time within ≤500ms; like count displayed on feed items and session details.",
            "test_method": "Integration + E2E",
            "evidence": "Count update tests, UI screenshots, API response times"
        },
        {
            "id": "US-3.3-AC03",
            "criterion": "Users can bookmark/unbookmark sessions via POST /api/v1/sessions/:id/bookmark and DELETE /api/v1/sessions/:id/bookmark; bookmarks are idempotent.",
            "test_method": "E2E",
            "evidence": "Bookmark UI screenshots, bookmark functionality tests"
        },
        {
            "id": "US-3.3-AC04",
            "criterion": "Users can view their bookmarked sessions via GET /api/v1/users/me/bookmarks with pagination.",
            "test_method": "E2E",
            "evidence": "Bookmark collection view tests, UI screenshots"
        }
    ],
    "US-3.4": [
        {
            "id": "US-3.4-AC01",
            "criterion": "Users can comment on public sessions via POST /api/v1/feed/item/:feedItemId/comments with body (plain text, max 500 chars); comments are idempotent.",
            "test_method": "E2E",
            "evidence": "Comment UI screenshots, comment creation tests"
        },
        {
            "id": "US-3.4-AC02",
            "criterion": "Comments are displayed with author info, timestamp, and proper formatting; comments list paginated (default 20 per page).",
            "test_method": "E2E",
            "evidence": "Comment display tests, comment list screenshots"
        },
        {
            "id": "US-3.4-AC03",
            "criterion": "Comment owners and session owners can delete comments via DELETE /api/v1/comments/:commentId; deleted comments are soft-deleted (deleted_at set).",
            "test_method": "E2E",
            "evidence": "Comment deletion tests, access control verification"
        },
        {
            "id": "US-3.4-AC04",
            "criterion": "Comment rate limiting: 20 comments per hour per user; exceeding limit returns 429 with Retry-After header.",
            "test_method": "Integration",
            "evidence": "Rate limit tests, HTTP headers"
        }
    ],
    "US-3.5": [
        {
            "id": "US-3.5-AC01",
            "criterion": "Users can follow/unfollow other users via POST /api/v1/users/:alias/follow and DELETE /api/v1/users/:alias/follow; users cannot follow themselves (422 error).",
            "test_method": "Integration + E2E",
            "evidence": "Follow button tests, follower count tests, self-follow prevention"
        },
        {
            "id": "US-3.5-AC02",
            "criterion": "Follower and following counts update correctly; counts displayed on user profiles; GET /api/v1/users/:alias/followers and /following return paginated lists.",
            "test_method": "Integration + E2E",
            "evidence": "Follower count tests, UI screenshots, API responses"
        },
        {
            "id": "US-3.5-AC03",
            "criterion": "Follow rate limiting: 50 follows per day per user; exceeding limit returns 429.",
            "test_method": "Integration",
            "evidence": "Rate limit tests"
        }
    ],
    "US-3.6": [
        {
            "id": "US-3.6-AC01",
            "criterion": "Users can clone public sessions via POST /api/v1/sessions/:id/clone or POST /api/v1/feed/session/:sessionId/clone; cloned session created as planned session for current user.",
            "test_method": "Integration + E2E",
            "evidence": "Clone functionality tests, cloned session verification"
        },
        {
            "id": "US-3.6-AC02",
            "criterion": "Cloned sessions preserve attribution: source_session_id or metadata field contains original session ID and creator info; attribution visible in UI.",
            "test_method": "Integration + E2E",
            "evidence": "Attribution verification, UI screenshots showing attribution"
        },
        {
            "id": "US-3.6-AC03",
            "criterion": "Users can modify cloned sessions (title, date, exercises, sets); modifications do not affect original session.",
            "test_method": "E2E",
            "evidence": "Modification tests, original session preservation"
        }
    ],
    "US-3.7": [
        {
            "id": "US-3.7-AC01",
            "criterion": "Users can report inappropriate content (sessions or comments) via POST /api/v1/feed/report with reason and details; reports are idempotent.",
            "test_method": "Integration + E2E",
            "evidence": "Report UI screenshots, report creation tests"
        },
        {
            "id": "US-3.7-AC02",
            "criterion": "Reports appear in admin moderation queue; admins can view reports via GET /api/v1/admin/reports with filtering and pagination.",
            "test_method": "Integration + E2E",
            "evidence": "Admin queue tests, report list screenshots"
        },
        {
            "id": "US-3.7-AC03",
            "criterion": "Report rate limiting: 10 reports per day per user; exceeding limit returns 429.",
            "test_method": "Integration",
            "evidence": "Rate limit tests"
        }
    ],
    "US-3.8": [
        {
            "id": "US-3.8-AC01",
            "criterion": "Unit tests cover like, bookmark, comment, follow, and clone operations with ≥90% code coverage.",
            "test_method": "Unit",
            "evidence": "Test coverage reports"
        },
        {
            "id": "US-3.8-AC02",
            "criterion": "Integration tests verify feed access, social interactions, cloning, and reporting scenarios.",
            "test_method": "Integration",
            "evidence": "Integration test results"
        },
        {
            "id": "US-3.8-AC03",
            "criterion": "E2E tests verify complete social workflow including feed browsing, liking, commenting, following, and cloning.",
            "test_method": "E2E",
            "evidence": "E2E test results, UI screenshots"
        }
    ],
    # Epic 4: Planner
    "US-4.1": [
        {
            "id": "US-4.1-AC01",
            "criterion": "Users can create training plans via POST /api/v1/plans with name, start_date, end_date; plan saved within ≤500ms.",
            "test_method": "Integration",
            "evidence": "DB snapshot, API response times"
        },
        {
            "id": "US-4.1-AC02",
            "criterion": "Users can update plans via PATCH /api/v1/plans/:id; updates persist and visible after reload.",
            "test_method": "Integration",
            "evidence": "Update tests, persistence verification"
        },
        {
            "id": "US-4.1-AC03",
            "criterion": "Users can delete plans via DELETE /api/v1/plans/:id; deletion is soft-delete (archived_at set); associated sessions are not deleted.",
            "test_method": "Integration",
            "evidence": "Deletion tests, session preservation verification"
        },
        {
            "id": "US-4.1-AC04",
            "criterion": "Plan concurrency: last-writer-wins with ETag support; stale ETag returns 412 Precondition Failed with conflict banner.",
            "test_method": "Integration",
            "evidence": "ETag headers, concurrency test results"
        }
    ],
    "US-4.2": [
        {
            "id": "US-4.2-AC01",
            "criterion": "Users can activate a plan via POST /api/v1/plans/:id/activate; activation generates scheduled sessions based on plan template and recurrence rules.",
            "test_method": "Integration",
            "evidence": "Activation tests, generated sessions verification"
        },
        {
            "id": "US-4.2-AC02",
            "criterion": "Plan progress tracking: progress_percent calculated as (completed_count / session_count) * 100; progress updates when sessions are completed.",
            "test_method": "Integration",
            "evidence": "Progress calculation tests, progress update verification"
        },
        {
            "id": "US-4.2-AC03",
            "criterion": "Plan duration validation: duration_weeks ∈ [1..52]; target_frequency ∈ [1..7] sessions per week; invalid values rejected with 422.",
            "test_method": "Unit + API negative",
            "evidence": "Validation test results, error responses"
        }
    ],
    "US-4.3": [
        {
            "id": "US-4.3-AC01",
            "criterion": "Drag-and-drop scheduling updates session planned_at without full page reload; calendar re-renders within ≤150ms on modern desktop.",
            "test_method": "E2E",
            "evidence": "Performance traces, drag-and-drop functionality tests"
        },
        {
            "id": "US-4.3-AC02",
            "criterion": "Overlapping sessions detected client-side before save with actionable error message and visual highlight of conflicts.",
            "test_method": "Unit + E2E",
            "evidence": "Conflict detection tests, UI screenshots"
        },
        {
            "id": "US-4.3-AC03",
            "criterion": "Server re-validates session overlaps; rejects with 422 and returns conflicting session IDs in error response.",
            "test_method": "API negative",
            "evidence": "HTTP traces, error responses with conflict details"
        },
        {
            "id": "US-4.3-AC04",
            "criterion": "Calendar view displays sessions with proper time slots, colors, and labels; supports month/week/day views.",
            "test_method": "E2E",
            "evidence": "Calendar UI screenshots, view switching tests"
        }
    ],
    "US-4.4": [
        {
            "id": "US-4.4-AC01",
            "criterion": "Mobile drag/resize works via touch gestures (touchstart, touchmove, touchend); no scroll-jank with long tasks >50ms.",
            "test_method": "E2E mobile emu",
            "evidence": "Performance traces, touch gesture tests"
        },
        {
            "id": "US-4.4-AC02",
            "criterion": "Touch gestures are responsive and provide visual feedback; calendar is usable on mobile devices (screen width ≥320px).",
            "test_method": "E2E mobile emu",
            "evidence": "Mobile UI screenshots, usability tests"
        }
    ],
    "US-4.5": [
        {
            "id": "US-4.5-AC01",
            "criterion": "Unit tests cover plan CRUD, activation, session generation, and progress tracking with ≥90% code coverage.",
            "test_method": "Unit",
            "evidence": "Test coverage reports"
        },
        {
            "id": "US-4.5-AC02",
            "criterion": "Integration tests verify plan management, activation flow, conflict detection, and progress calculation.",
            "test_method": "Integration",
            "evidence": "Integration test results"
        },
        {
            "id": "US-4.5-AC03",
            "criterion": "E2E tests verify complete planner workflow including drag-and-drop, conflict detection, and mobile touch gestures.",
            "test_method": "E2E",
            "evidence": "E2E test results, UI screenshots"
        }
    ],
    # Epic 5: Logging & Import
    "US-5.1": [
        {
            "id": "US-5.1-AC01",
            "criterion": "Users can log session metrics (duration, distance, heart rate, sets, reps, weight) via PATCH /api/v1/sessions/:id with status='completed'; metrics saved within ≤500ms.",
            "test_method": "Integration + E2E",
            "evidence": "Logging tests, DB records, API response times"
        },
        {
            "id": "US-5.1-AC02",
            "criterion": "Session edits are audit-logged with who/when/what; audit records include field changes and timestamps.",
            "test_method": "Unit + Integration",
            "evidence": "Audit log excerpts, edit history verification"
        },
        {
            "id": "US-5.1-AC03",
            "criterion": "Logger frontend allows manual entry of all metrics with proper validation and unit conversion.",
            "test_method": "E2E",
            "evidence": "Logger UI screenshots, form validation tests"
        }
    ],
    "US-5.2": [
        {
            "id": "US-5.2-AC01",
            "criterion": "Users can import GPX files via POST /api/v1/sessions/import with file upload; GPX parser extracts track points, elevation, and timestamps.",
            "test_method": "Fuzz + fixtures",
            "evidence": "GPX parser test results, import success/failure logs"
        },
        {
            "id": "US-5.2-AC02",
            "criterion": "GPX parser handles ≥99% valid GPX samples; malformed GPX files produce user-facing error (422) without application crash.",
            "test_method": "Fuzz + fixtures",
            "evidence": "Corpus results, error handling tests"
        },
        {
            "id": "US-5.2-AC03",
            "criterion": "Imported GPX data creates session with proper metrics (distance, duration, elevation gain/loss); timezone normalization applied.",
            "test_method": "Unit",
            "evidence": "Parser snapshots, imported session verification"
        }
    ],
    "US-5.3": [
        {
            "id": "US-5.3-AC01",
            "criterion": "Users can import FIT files via POST /api/v1/sessions/import; FIT parser extracts GPS, heart rate, power, and other device metrics.",
            "test_method": "Fuzz + fixtures",
            "evidence": "FIT parser test results, import success/failure logs"
        },
        {
            "id": "US-5.3-AC02",
            "criterion": "FIT parser handles ≥99% valid FIT samples; malformed FIT files produce user-facing error (422) without crash.",
            "test_method": "Fuzz + fixtures",
            "evidence": "Corpus results, error handling tests"
        },
        {
            "id": "US-5.3-AC03",
            "criterion": "FIT file metadata (GPS coordinates, heart rate zones, timezone) respected; timezone normalization applied correctly.",
            "test_method": "Unit",
            "evidence": "Parser snapshots, metadata extraction verification"
        }
    ],
    "US-5.4": [
        {
            "id": "US-5.4-AC01",
            "criterion": "Editing pace or elevation triggers automatic recalculation of derived metrics (average pace, elevation gain/loss, normalized power) within ≤200ms.",
            "test_method": "Integration",
            "evidence": "Recalculation logs, metric update verification"
        },
        {
            "id": "US-5.4-AC02",
            "criterion": "Metric recalculation is idempotent: same inputs produce same outputs; snapshot tests remain stable across runs.",
            "test_method": "Unit",
            "evidence": "Snapshot tests, idempotency verification"
        }
    ],
    "US-5.5": [
        {
            "id": "US-5.5-AC01",
            "criterion": "Offline logging buffers session events in local storage (IndexedDB); events sync to server within ≤5s after network reconnect.",
            "test_method": "E2E (PWA offline)",
            "evidence": "Network traces, sync verification, offline storage tests"
        },
        {
            "id": "US-5.5-AC02",
            "criterion": "Service worker enables offline functionality; sync queue handles failed syncs with retry logic (exponential backoff).",
            "test_method": "E2E (PWA offline)",
            "evidence": "Service worker tests, sync queue verification"
        }
    ],
    "US-5.6": [
        {
            "id": "US-5.6-AC01",
            "criterion": "Fuzz tests cover GPX and FIT parsers with diverse file samples; parser handles edge cases (empty files, malformed XML/binary, missing fields).",
            "test_method": "Fuzz + fixtures",
            "evidence": "Fuzz test results, corpus coverage"
        },
        {
            "id": "US-5.6-AC02",
            "criterion": "Import tests verify file validation, parsing accuracy, error handling, and metric calculation correctness.",
            "test_method": "Unit + Integration",
            "evidence": "Import test results, accuracy verification"
        }
    ],
    # Epic 6: Privacy & GDPR
    "US-6.1": [
        {
            "id": "US-6.1-AC01",
            "criterion": "Users can request data export via GET /api/v1/users/me/export; export generates JSON bundle with user, profile, sessions, exercises, points, badges within ≤24h.",
            "test_method": "E2E DSR",
            "evidence": "Export job logs, JSON bundle samples"
        },
        {
            "id": "US-6.1-AC02",
            "criterion": "Export link valid for 24h; download available via secure link; export includes all user data per GDPR requirements.",
            "test_method": "E2E DSR",
            "evidence": "Export link tests, data completeness verification"
        }
    ],
    "US-6.2": [
        {
            "id": "US-6.2-AC01",
            "criterion": "Users can delete account via DELETE /api/v1/users/me; deletion marks account as pending_deletion; hard deletion occurs within 30 days.",
            "test_method": "E2E DSR",
            "evidence": "Deletion tests, account status verification"
        },
        {
            "id": "US-6.2-AC02",
            "criterion": "Account deletion propagates to backups within ≤14 days (configurable); deletion receipt issued in audit log.",
            "test_method": "Ops review",
            "evidence": "Deletion pipeline logs, backup verification"
        },
        {
            "id": "US-6.2-AC03",
            "criterion": "Deletion invalidates all active sessions; user cannot login after deletion; data anonymized where required for referential integrity.",
            "test_method": "Integration",
            "evidence": "Session invalidation tests, anonymization verification"
        }
    ],
    "US-6.3": [
        {
            "id": "US-6.3-AC01",
            "criterion": "Users can manage consent preferences via UI; consent stored in database with timestamp and version; opt-out respected within ≤5m across services.",
            "test_method": "E2E",
            "evidence": "Consent UI screenshots, consent storage verification"
        },
        {
            "id": "US-6.3-AC02",
            "criterion": "Consent banner gates optional analytics; consent changes trigger immediate effect; consent history maintained for audit.",
            "test_method": "E2E",
            "evidence": "Consent banner tests, analytics gating verification"
        }
    ],
    "US-6.4": [
        {
            "id": "US-6.4-AC01",
            "criterion": "Users can configure privacy settings for profile (hide age/weight) and content (default visibility) via privacy settings UI.",
            "test_method": "E2E",
            "evidence": "Privacy settings UI screenshots, settings persistence tests"
        },
        {
            "id": "US-6.4-AC02",
            "criterion": "Privacy settings take effect immediately; past data visibility not retroactively changed; settings persisted in user profile.",
            "test_method": "Integration + Security",
            "evidence": "Privacy tests, settings application verification"
        }
    ],
    "US-6.5": [
        {
            "id": "US-6.5-AC01",
            "criterion": "All GDPR-related events (export requests, deletion requests, consent changes) are audit-logged with timestamp, user ID, and action details.",
            "test_method": "Integration",
            "evidence": "Audit log excerpts, GDPR event verification"
        },
        {
            "id": "US-6.5-AC02",
            "criterion": "Audit logs are retained per retention policy; logs are searchable and exportable for compliance demonstrations.",
            "test_method": "Ops review",
            "evidence": "Audit log retention verification, search functionality"
        }
    ],
    "US-6.6": [
        {
            "id": "US-6.6-AC01",
            "criterion": "Integration tests verify data export flow, deletion flow, consent management, and privacy settings with GDPR compliance checks.",
            "test_method": "Integration",
            "evidence": "GDPR flow test results"
        },
        {
            "id": "US-6.6-AC02",
            "criterion": "E2E tests verify complete GDPR user journeys including export request, download, account deletion, and consent management.",
            "test_method": "E2E DSR",
            "evidence": "E2E test results, GDPR journey screenshots"
        }
    ],
    # Epic 7: Performance
    "US-7.1": [
        {
            "id": "US-7.1-AC01",
            "criterion": "API latency p95 ≤300ms for all endpoints per PRD targets; slow endpoints identified and optimized.",
            "test_method": "Performance",
            "evidence": "Performance metrics, latency histograms"
        },
        {
            "id": "US-7.1-AC02",
            "criterion": "Per-endpoint budgets met: Auth ≤200ms, CRUD ≤300ms, Analytics ≤600ms, Feed ≤400ms p95.",
            "test_method": "Performance",
            "evidence": "Endpoint latency metrics, budget compliance"
        }
    ],
    "US-7.2": [
        {
            "id": "US-7.2-AC01",
            "criterion": "Database queries optimized with proper indexes; slow query threshold 200ms; queries exceeding threshold logged and optimized.",
            "test_method": "Performance",
            "evidence": "Query performance metrics, index usage reports"
        },
        {
            "id": "US-7.2-AC02",
            "criterion": "Large tables (sessions, user_points) partitioned by month; partitions automatically pruned; connection pooling p95 wait <5ms.",
            "test_method": "Performance",
            "evidence": "Partitioning verification, pool metrics"
        }
    ],
    "US-7.3": [
        {
            "id": "US-7.3-AC01",
            "criterion": "Frontend JS bundle size ≤300KB gzipped; Lighthouse CI budget enforced; bundle size regression >10% blocks merge.",
            "test_method": "Performance",
            "evidence": "Bundle size reports, Lighthouse CI results"
        },
        {
            "id": "US-7.3-AC02",
            "criterion": "Code splitting implemented for non-critical routes; lazy loading mandatory; critical CSS inlined.",
            "test_method": "Performance",
            "evidence": "Bundle analysis, code splitting verification"
        }
    ],
    "US-7.4": [
        {
            "id": "US-7.4-AC01",
            "criterion": "Frontend performance metrics meet targets: LCP ≤2.5s, CLS ≤0.1, TTI ≤3.0s on mid-tier device, 4G connection.",
            "test_method": "Performance",
            "evidence": "Lighthouse reports, Web Vitals metrics"
        },
        {
            "id": "US-7.4-AC02",
            "criterion": "Performance regression >10% from baseline blocks release; Lighthouse CI runs per PR with budget enforcement.",
            "test_method": "Performance",
            "evidence": "Lighthouse CI results, regression reports"
        }
    ],
    "US-7.5": [
        {
            "id": "US-7.5-AC01",
            "criterion": "Read-through caching implemented for heavy queries (feed, progress); cache TTL 60s default with explicit invalidation on data changes.",
            "test_method": "Integration",
            "evidence": "Cache hit ratio metrics, invalidation tests"
        },
        {
            "id": "US-7.5-AC02",
            "criterion": "Cache strategy documented; cache keys follow naming convention; cache warming for frequently accessed data.",
            "test_method": "Documentation review",
            "evidence": "Cache documentation, cache key patterns"
        }
    ],
    "US-7.6": [
        {
            "id": "US-7.6-AC01",
            "criterion": "Materialized views created for analytics (session_summary, exercise_prs, weekly_aggregates); views refreshed asynchronously (REFRESH CONCURRENTLY).",
            "test_method": "Integration",
            "evidence": "Materialized view definitions, refresh job logs"
        },
        {
            "id": "US-7.6-AC02",
            "criterion": "Materialized views refresh on session completion or nightly; refresh is non-blocking; view consistency verified.",
            "test_method": "Integration",
            "evidence": "Refresh job logs, consistency tests"
        }
    ],
    "US-7.7": [
        {
            "id": "US-7.7-AC01",
            "criterion": "k6 load tests configured and run in CI; tests validate throughput ≥500 req/s sustained, 1000 req/s burst.",
            "test_method": "Performance",
            "evidence": "k6 test results, throughput metrics"
        },
        {
            "id": "US-7.7-AC02",
            "criterion": "Performance regression >10% from baseline blocks release; baseline dataset ≥10k sessions for realistic query costs.",
            "test_method": "Performance",
            "evidence": "Performance test results, regression reports"
        }
    ],
    "US-7.8": [
        {
            "id": "US-7.8-AC01",
            "criterion": "Performance metrics exposed via Prometheus: http_request_duration_ms, db_query_duration_ms, frontend_lcp_ms; metrics available in Grafana dashboards.",
            "test_method": "Integration",
            "evidence": "Prometheus metrics, Grafana dashboard screenshots"
        },
        {
            "id": "US-7.8-AC02",
            "criterion": "Performance alerts configured: p95 latency >400ms for 10min (warning), error rate >0.5% for 5min (critical).",
            "test_method": "Ops review",
            "evidence": "Alert configuration, alert test results"
        }
    ],
    # Epic 8: Accessibility
    "US-8.1": [
        {
            "id": "US-8.1-AC01",
            "criterion": "All interactive elements have proper ARIA labels (aria-label, aria-labelledby, aria-describedby); semantic HTML used (button, nav, main, etc.).",
            "test_method": "Accessibility audit",
            "evidence": "ARIA audit results, HTML semantic verification"
        },
        {
            "id": "US-8.1-AC02",
            "criterion": "Form inputs have associated labels; form errors announced to screen readers; form structure is logical.",
            "test_method": "Accessibility audit",
            "evidence": "Form accessibility tests, label association verification"
        }
    ],
    "US-8.2": [
        {
            "id": "US-8.2-AC01",
            "criterion": "All features navigable using only keyboard (Tab, Enter, Space, Arrow keys); focus indicators visible (2px outline, sufficient contrast).",
            "test_method": "Accessibility audit",
            "evidence": "Keyboard navigation tests, focus indicator screenshots"
        },
        {
            "id": "US-8.2-AC02",
            "criterion": "No keyboard traps; skip links available for main content; tab order is logical and predictable.",
            "test_method": "Accessibility audit",
            "evidence": "Keyboard trap tests, skip link verification"
        }
    ],
    "US-8.3": [
        {
            "id": "US-8.3-AC01",
            "criterion": "Color contrast meets WCAG 2.1 AA standards: text 4.5:1 for normal text, 3:1 for large text; UI components 3:1.",
            "test_method": "Accessibility audit",
            "evidence": "Color contrast audit results, contrast ratio measurements"
        },
        {
            "id": "US-8.3-AC02",
            "criterion": "Color is not the only means of conveying information; icons, labels, or patterns supplement color coding.",
            "test_method": "Accessibility audit",
            "evidence": "Color dependency audit, alternative indicator verification"
        }
    ],
    "US-8.4": [
        {
            "id": "US-8.4-AC01",
            "criterion": "Application tested with screen readers (NVDA, JAWS, VoiceOver); all features accessible and functional.",
            "test_method": "Screen reader testing",
            "evidence": "Screen reader test results, accessibility test reports"
        },
        {
            "id": "US-8.4-AC02",
            "criterion": "Dynamic content changes announced to screen readers; live regions (aria-live) used appropriately; page structure is logical.",
            "test_method": "Screen reader testing",
            "evidence": "Screen reader announcements, live region tests"
        }
    ],
    "US-8.5": [
        {
            "id": "US-8.5-AC01",
            "criterion": "Focus management in modals: focus trapped within modal, focus returns to trigger on close, initial focus on first interactive element.",
            "test_method": "Accessibility audit",
            "evidence": "Modal focus tests, focus management verification"
        },
        {
            "id": "US-8.5-AC02",
            "criterion": "Dynamic content (dropdowns, tooltips, notifications) manages focus appropriately; focus not lost unexpectedly.",
            "test_method": "Accessibility audit",
            "evidence": "Dynamic content focus tests"
        }
    ],
    "US-8.6": [
        {
            "id": "US-8.6-AC01",
            "criterion": "Automated accessibility tests (axe-core) run in CI; tests cover all pages and components; violations block merge.",
            "test_method": "Automated testing",
            "evidence": "CI test results, axe violation reports"
        },
        {
            "id": "US-8.6-AC02",
            "criterion": "Accessibility test coverage ≥80% of interactive elements; critical violations (level 1) must be zero.",
            "test_method": "Automated testing",
            "evidence": "Test coverage reports, violation counts"
        }
    ],
    "US-8.7": [
        {
            "id": "US-8.7-AC01",
            "criterion": "Lighthouse accessibility score = 100; all accessibility audits pass; score maintained across releases.",
            "test_method": "Lighthouse CI",
            "evidence": "Lighthouse reports, accessibility score history"
        },
        {
            "id": "US-8.7-AC02",
            "criterion": "Lighthouse CI runs per PR; accessibility score regression blocks merge; budget enforced.",
            "test_method": "Lighthouse CI",
            "evidence": "Lighthouse CI results, budget compliance"
        }
    ],
    # Epic 9: Observability
    "US-9.1": [
        {
            "id": "US-9.1-AC01",
            "criterion": "All logs are structured JSON with required fields: ts, level, request_id, user_id (if authenticated), route, status, lat_ms; no PII in logs.",
            "test_method": "Integration",
            "evidence": "Log samples, PII scan results"
        },
        {
            "id": "US-9.1-AC02",
            "criterion": "Correlation IDs (request_id) propagated across services; request tracing possible via correlation ID search.",
            "test_method": "Integration",
            "evidence": "Correlation ID propagation tests, trace verification"
        }
    ],
    "US-9.2": [
        {
            "id": "US-9.2-AC01",
            "criterion": "Prometheus metrics exposed for all endpoints: http_request_duration_seconds (histogram), http_requests_total (counter) with method, route, status labels.",
            "test_method": "Integration",
            "evidence": "Prometheus metrics, metric definitions"
        },
        {
            "id": "US-9.2-AC02",
            "criterion": "Database metrics: db_query_duration_seconds (histogram) with op, table labels; background job metrics: background_job_duration_seconds.",
            "test_method": "Integration",
            "evidence": "DB metrics, job metrics"
        },
        {
            "id": "US-9.2-AC03",
            "criterion": "Metric cardinality bounded: route labels normalized, user IDs excluded, label sets limited to prevent cardinality explosion.",
            "test_method": "Integration",
            "evidence": "Cardinality analysis, metric samples"
        }
    ],
    "US-9.3": [
        {
            "id": "US-9.3-AC01",
            "criterion": "OpenTelemetry tracing implemented with traceparent propagation; sampling rate 10% prod, 100% staging; spans include timing only (no PII).",
            "test_method": "Integration",
            "evidence": "Tracing configuration, trace samples"
        },
        {
            "id": "US-9.3-AC02",
            "criterion": "Traces cover full request lifecycle: HTTP → service → database; trace IDs searchable in observability platform.",
            "test_method": "Integration",
            "evidence": "Trace samples, trace completeness verification"
        }
    ],
    "US-9.4": [
        {
            "id": "US-9.4-AC01",
            "criterion": "Grafana dashboards created for: API latency (p95), error rate, DB health, job queues, uploads AV, performance budgets.",
            "test_method": "Ops review",
            "evidence": "Grafana dashboard screenshots, dashboard definitions"
        },
        {
            "id": "US-9.4-AC02",
            "criterion": "Dashboards refresh automatically; data retention configured; dashboards accessible to ops team.",
            "test_method": "Ops review",
            "evidence": "Dashboard configuration, access verification"
        }
    ],
    "US-9.5": [
        {
            "id": "US-9.5-AC01",
            "criterion": "Alerting rules configured for: 5xx rate spikes (>0.5% for 5min), p95 latency breaches (>400ms for 10min), DB pool saturation, auth lockout anomalies.",
            "test_method": "Ops review",
            "evidence": "Alert rule definitions, alert test results"
        },
        {
            "id": "US-9.5-AC02",
            "criterion": "Alerts sent to appropriate channels (PagerDuty, Slack, email); alert routing based on severity; alert fatigue prevented.",
            "test_method": "Ops review",
            "evidence": "Alert configuration, notification channel tests"
        }
    ],
    "US-9.6": [
        {
            "id": "US-9.6-AC01",
            "criterion": "Log aggregation pipeline configured (Loki or compatible); logs ingested from all services; logs searchable by correlation ID, user ID, timestamp.",
            "test_method": "Ops review",
            "evidence": "Log aggregation configuration, search functionality"
        },
        {
            "id": "US-9.6-AC02",
            "criterion": "Log retention policy configured (default 30 days, configurable); log storage optimized; log queries performant (<2s for typical searches).",
            "test_method": "Ops review",
            "evidence": "Retention policy, query performance metrics"
        }
    ],
    # Epic 10: Availability & Backups
    "US-10.1": [
        {
            "id": "US-10.1-AC01",
            "criterion": "Automated daily encrypted backups of all critical data (users, sessions, exercises, points); backups stored in secure location.",
            "test_method": "Ops review",
            "evidence": "Backup job logs, backup storage verification"
        },
        {
            "id": "US-10.1-AC02",
            "criterion": "Backup encryption verified; backup integrity checksums validated; backup rotation policy (retain 30 days daily, 12 months monthly).",
            "test_method": "Ops review",
            "evidence": "Encryption verification, rotation policy"
        }
    ],
    "US-10.2": [
        {
            "id": "US-10.2-AC01",
            "criterion": "Quarterly backup restore tests performed; restore procedure documented; restore RTO ≤4h, RPO ≤24h verified.",
            "test_method": "Ops review",
            "evidence": "Restore test logs, RTO/RPO verification"
        },
        {
            "id": "US-10.2-AC02",
            "criterion": "Restore tests include data integrity verification; restored data matches source; restore procedure tested end-to-end.",
            "test_method": "Ops review",
            "evidence": "Restore test results, integrity verification"
        }
    ],
    "US-10.3": [
        {
            "id": "US-10.3-AC01",
            "criterion": "Disaster recovery procedures documented in runbook; DR scenarios tested (regional failover, data center outage); RTO ≤4h, RPO ≤24h.",
            "test_method": "Ops review",
            "evidence": "DR runbook, DR test results"
        },
        {
            "id": "US-10.3-AC02",
            "criterion": "DR procedures include communication plan, escalation paths, and rollback procedures; procedures reviewed quarterly.",
            "test_method": "Ops review",
            "evidence": "DR documentation, review records"
        }
    ],
    "US-10.4": [
        {
            "id": "US-10.4-AC01",
            "criterion": "Health check endpoint GET /api/v1/health returns 200 with service status (database, storage, external services); health checks used by load balancer.",
            "test_method": "Integration",
            "evidence": "Health check responses, load balancer configuration"
        },
        {
            "id": "US-10.4-AC02",
            "criterion": "Health check includes readiness and liveness probes; unhealthy services removed from load balancer; health status monitored.",
            "test_method": "Integration",
            "evidence": "Health check implementation, monitoring verification"
        }
    ],
    "US-10.5": [
        {
            "id": "US-10.5-AC01",
            "criterion": "Read-only mode implemented via system configuration; read-only mode prevents all write operations (POST, PATCH, DELETE return 503).",
            "test_method": "Integration",
            "evidence": "Read-only mode tests, maintenance mode verification"
        },
        {
            "id": "US-10.5-AC02",
            "criterion": "Read-only mode can be toggled via admin endpoint or environment variable; mode change takes effect within ≤10s.",
            "test_method": "Integration",
            "evidence": "Mode toggle tests, activation timing"
        }
    ],
    # Epic 11: Technical Debt
    "US-11.1": [
        {
            "id": "US-11.1-AC01",
            "criterion": "Duplicate 2FA routes removed from auth.routes.ts (lines 99-128); twofa.controller.ts and twofa.service.ts deleted if unused.",
            "test_method": "Code review",
            "evidence": "Code diff, route conflict resolution"
        },
        {
            "id": "US-11.1-AC02",
            "criterion": "Only two-factor.controller.ts and two-factor.routes.ts remain; all 2FA functionality uses single implementation; tests updated.",
            "test_method": "Code review",
            "evidence": "Code verification, test updates"
        }
    ],
    "US-11.2": [
        {
            "id": "US-11.2-AC01",
            "criterion": "All 62 skipped tests reviewed; tests either fixed, documented (with reason), or removed; test coverage maintained or improved.",
            "test_method": "Code review",
            "evidence": "Skipped test review log, test fixes"
        },
        {
            "id": "US-11.2-AC02",
            "criterion": "Skipped test reasons documented in test files or test plan; intentional skips justified; no tests skipped without reason.",
            "test_method": "Code review",
            "evidence": "Test documentation, skip reason verification"
        }
    ],
    "US-11.3": [
        {
            "id": "US-11.3-AC01",
            "criterion": "Timer cleanup standardized: tests using jest.useFakeTimers() restore in afterEach; no global timer clearing; pattern documented.",
            "test_method": "Code review",
            "evidence": "Timer cleanup pattern, test updates"
        }
    ],
    "US-11.4": [
        {
            "id": "US-11.4-AC01",
            "criterion": "Database connection cleanup verified: all tests that create connections close them in afterEach/afterAll; no open handles detected.",
            "test_method": "Integration",
            "evidence": "Connection cleanup tests, open handle verification"
        }
    ],
    "US-11.5": [
        {
            "id": "US-11.5-AC01",
            "criterion": "All public APIs have JSDoc comments with parameter descriptions, return types, and examples; documentation coverage ≥80%.",
            "test_method": "Code review",
            "evidence": "JSDoc coverage report, documentation samples"
        },
        {
            "id": "US-11.5-AC02",
            "criterion": "Complex business logic has inline comments explaining rationale; code is self-documenting where possible; README files updated.",
            "test_method": "Code review",
            "evidence": "Code documentation review, README updates"
        }
    ]
}

def generate_ac_for_story(story_id: str) -> List[Dict]:
    """Generate acceptance criteria for a story."""
    return AC_TEMPLATES.get(story_id, [])

def main():
    """Generate acceptance criteria document."""
    root_dir = Path(__file__).parent.parent
    stories_file = root_dir / "USER_STORIES.md"
    
    # Read stories
    with open(stories_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Extract story IDs
    story_ids = re.findall(r"### (US-\d+\.\d+)", content)
    
    # Generate AC document
    ac_doc = ["# Acceptance Criteria for All User Stories", "", "**Generated**: 2025-01-21", "", "---", ""]
    
    for story_id in sorted(story_ids):
        acs = generate_ac_for_story(story_id)
        if acs:
            ac_doc.append(f"## {story_id}")
            ac_doc.append("")
            for ac in acs:
                ac_doc.append(f"### {ac['id']}")
                ac_doc.append("")
                ac_doc.append(f"**Criterion**: {ac['criterion']}")
                ac_doc.append("")
                ac_doc.append(f"- **Test Method**: {ac['test_method']}")
                ac_doc.append(f"- **Evidence Required**: {ac['evidence']}")
                ac_doc.append("")
            ac_doc.append("---")
            ac_doc.append("")
    
    # Save document
    output_file = root_dir / "AC_ALL_STORIES.md"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(ac_doc))
    
    print(f"Generated acceptance criteria for {len([s for s in story_ids if generate_ac_for_story(s)])} stories")
    print(f"Saved to: {output_file}")
    
    return 0

if __name__ == "__main__":
    exit(main())

