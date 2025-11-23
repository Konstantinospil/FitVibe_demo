# FR-010 — Exercise Library

---

**Requirement ID**: FR-010  
**Type**: Functional Requirement  
**Title**: Exercise Library  
**Status**: Open  
**Priority**: Medium  
**Gate**: SILVER  
**Owner**: ENG/QA  
**Created**: 2025-01-20

---

## Executive Summary

This functional requirement specifies exercise library management capabilities that the system must provide.

Enable users and administrators to create, manage, and discover exercises with proper categorization, visibility controls, and historical preservation.

## Business Context

- **Business Objective**: Provide a comprehensive exercise library that supports both personal and global exercise definitions with proper categorization and discovery.
- **Success Criteria**: Users can create personal exercises, discover public exercises, and exercises are properly archived (not deleted) to maintain historical accuracy.
- **Priority**: Medium
- **Quality Gate**: SILVER
- **Owner**: ENG/QA
- **Status**: Open
- **Target Users**: All authenticated users (personal exercises), Administrators (global exercises)

## Traceability

- **PRD Reference**: PRD §4.3 (FR-3 Exercise Library)
- **TDD Reference**: TDD §Exercise Module

## Functional Requirements

### Exercise Management

#### Create Exercises

Users and administrators can create exercises with the following attributes:

- **Name**: Exercise name (required, text)
- **Category**: Exercise category (enum: cardio, strength, power-endurance)
- **Muscle Group**: Primary muscle group(s) targeted
- **Tags**: Searchable tags for discovery
- **Description**: Optional exercise description
- **Visibility**: Private (default) or Public

#### Edit Exercises

- Users can edit their own personal exercises
- Administrators can edit global/public exercises
- Edits preserve historical accuracy (see archival below)

#### Archive Exercises

- **Safe Delete = Archive**: Exercises are archived, not deleted
- **Hidden from Selectors**: Archived exercises do not appear in exercise selectors
- **Retained for History**: Archived exercises remain accessible in historical sessions

### Exercise Visibility

#### Default Visibility

- **Private by Default**: New exercises are private to the creator
- **Public Exercises**: Exercises can be marked as public (discoverable by all users)
- **Global Exercises**: Administrators can create system-wide exercises

#### Discovery

- **Public Exercise Discovery**: Users can search and discover public exercises
- **Personal Exercise Access**: Users can only see their own private exercises
- **Global Exercise Access**: All users can access global exercises created by administrators

### Exercise Reuse

#### Session Integration

- **Snapshot on Use**: When an exercise is used in a session, a snapshot of the exercise name is retained in `session_exercises`
- **Historical Accuracy**: Exercise changes do not affect historical session records
- **Version Preservation**: Historical sessions reflect the exercise name at the time of session creation

## Acceptance Criteria

Each acceptance criterion must be met for this requirement to be considered complete.

### US-2.1-AC01

**Criterion**: Users can create exercises via POST /api/v1/exercises with required fields (name, type_code) and optional fields (muscle_group, equipment, tags, description); exercise saved within ≤500ms.

- **Test Method**: Integration + E2E
- **Evidence Required**: DB snapshot, UI screenshots, API response times
- **Related Story**: US-2.1

### US-2.1-AC02

**Criterion**: Users can update their own exercises via PATCH /api/v1/exercises/:id; edits preserve historical accuracy; unauthorized edits return 403.

- **Test Method**: Integration + E2E
- **Evidence Required**: Update tests, access control verification
- **Related Story**: US-2.1

### US-2.1-AC03

**Criterion**: Exercises can be archived (soft delete) via DELETE /api/v1/exercises/:id; archived exercises have archived_at timestamp set; they are hidden from selectors but retained in database.

- **Test Method**: Integration + E2E
- **Evidence Required**: DB records, UI showing archived exercises not in selectors
- **Related Story**: US-2.1

### US-2.1-AC04

**Criterion**: Exercise visibility model: private (default, owner_id = user_id) or public (is_public = true); private exercises only visible to creator.

- **Test Method**: Integration + E2E
- **Evidence Required**: Access control tests, UI screenshots
- **Related Story**: US-2.1

### US-2.1-AC05

**Criterion**: Exercise name uniqueness enforced per owner: (owner_id, normalized_name) unique constraint; duplicate names rejected with 409 CONFLICT.

- **Test Method**: Unit + API negative
- **Evidence Required**: Uniqueness test results, error responses
- **Related Story**: US-2.1

### US-2.2-AC01

**Criterion**: Users can search public exercises via GET /api/v1/exercises?is_public=true&q=searchterm with pagination (default 20, max 100).

- **Test Method**: E2E
- **Evidence Required**: Search results, API response times
- **Related Story**: US-2.2

### US-2.2-AC02

**Criterion**: Exercise search supports filtering by category (type_code), muscle_group, equipment, and tags; filters can be combined.

- **Test Method**: E2E
- **Evidence Required**: Filter UI screenshots, filtered search results
- **Related Story**: US-2.2

### US-2.2-AC03

**Criterion**: Search results are sorted by relevance (name match) or date; empty results return empty array with 200 status.

- **Test Method**: E2E
- **Evidence Required**: Search result ordering, empty result handling
- **Related Story**: US-2.2

### US-2.3-AC01

**Criterion**: When an exercise is used in a session, exercise name is stored as snapshot in session_exercises.exercise_name field; snapshot persists even if exercise is later modified or archived.

- **Test Method**: Integration
- **Evidence Required**: DB records showing snapshot preservation, exercise modification tests
- **Related Story**: US-2.3

### US-2.3-AC02

**Criterion**: Historical sessions display exercise name from snapshot, not current exercise name; exercise changes do not affect past session records.

- **Test Method**: Integration + E2E
- **Evidence Required**: Historical session display tests, exercise modification verification
- **Related Story**: US-2.3

### US-2.4-AC01

**Criterion**: Administrators can create global exercises (owner_id = null) via POST /api/v1/exercises with admin role; global exercises are accessible to all users.

- **Test Method**: Integration + E2E
- **Evidence Required**: Admin UI screenshots, access control tests
- **Related Story**: US-2.4

### US-2.4-AC02

**Criterion**: Administrators can edit and archive global exercises; non-admin users cannot modify global exercises (403 Forbidden).

- **Test Method**: Integration + E2E
- **Evidence Required**: Admin edit tests, non-admin access denial
- **Related Story**: US-2.4

### US-2.5-AC01

**Criterion**: Exercise selector in Planner and Logger displays user's personal exercises, global exercises, and public exercises; archived exercises are excluded.

- **Test Method**: E2E
- **Evidence Required**: Exercise selector UI screenshots, exercise list verification
- **Related Story**: US-2.5

### US-2.5-AC02

**Criterion**: Exercise selector supports search and filtering; selected exercise is added to session with proper reference.

- **Test Method**: E2E
- **Evidence Required**: Selector search tests, exercise addition verification
- **Related Story**: US-2.5

### US-2.6-AC01

**Criterion**: Unit tests cover exercise CRUD operations, archival, visibility model, and uniqueness constraints with ≥90% code coverage.

- **Test Method**: Unit
- **Evidence Required**: Test coverage reports
- **Related Story**: US-2.6

### US-2.6-AC02

**Criterion**: Integration tests verify exercise creation, editing, archival, search, and access control scenarios.

- **Test Method**: Integration
- **Evidence Required**: Integration test results
- **Related Story**: US-2.6

### US-2.6-AC03

**Criterion**: E2E tests verify complete exercise management workflow including creation, search, selection, and archival.

- **Test Method**: E2E
- **Evidence Required**: E2E test results, UI screenshots
- **Related Story**: US-2.6

## Test Strategy

- API negative
- E2E
- Integration
- Integration + E2E
- Unit + API negative

## Evidence Requirements

- Access control tests
- Admin UI screenshots
- API response times
- DB records showing snapshot preservation
- DB records, UI screenshots showing archived exercises not in selectors
- DB snapshot, UI screenshots, API response times
- Error message samples
- Filter UI screenshots
- Search results
- UI screenshots
- Validation test results

## Use Cases

### Primary Use Cases

- User creates a personal exercise (e.g., "Custom Bench Press Variation")
- User marks their exercise as public for others to discover
- User searches for public exercises by category
- User uses an exercise in a session (snapshot created)
- Administrator creates a global exercise (e.g., "Standard Push-up")
- User archives an exercise they no longer use

### Edge Cases

- User attempts to create exercise with duplicate name
- User attempts to edit a global exercise (should fail unless admin)
- User attempts to delete an exercise (should archive instead)
- Exercise used in historical session is later modified (snapshot preserved)
- Exercise used in historical session is later archived (still visible in history)
- User searches for exercises with no results

## Dependencies

### Technical Dependencies

- Database for exercise storage
- Search/indexing for exercise discovery
- Validation framework

### Feature Dependencies

- FR-001 (User Registration) - User accounts required
- FR-002 (Login & Session) - Authentication required
- FR-004 (Planner) - Exercises used in session planning
- FR-005 (Logging & Import) - Exercises used in session logging
- FR-008 (Admin & RBAC) - Admin role for global exercises

## Constraints

### Technical Constraints

- Exercise creation/update: ≤500ms
- Exercise name snapshot stored in session_exercises
- Archived exercises hidden from selectors but retained in database

### Business Constraints

- Default visibility is private
- Safe delete = archive (no hard deletion)
- Historical accuracy must be preserved

## Assumptions

- Users understand the difference between private and public exercises
- Exercise categories and muscle groups are standardized
- Tag system supports effective discovery
- Historical session accuracy is more important than exercise consistency

## Risks & Issues

- **Risk**: Too many public exercises may clutter discovery
- **Risk**: Exercise name changes may confuse users viewing historical sessions
- **Risk**: Archive vs delete confusion may lead to data loss concerns
- **Risk**: Global exercise management may require moderation

## Open Questions

- What is the maximum number of exercises per user?
- Should there be exercise moderation/review for public exercises?
- Should exercises support images/videos?
- Should exercises support custom attributes/metrics?
- What are the standard muscle group categories?

## Related Requirements

- FR-001: User Registration (user accounts)
- FR-002: Login & Session (authentication)
- FR-004: Planner (exercise usage in planning)
- FR-005: Logging & Import (exercise usage in logging)
- FR-008: Admin & RBAC (global exercise management)
- NFR-002: Privacy (exercise visibility and privacy)
