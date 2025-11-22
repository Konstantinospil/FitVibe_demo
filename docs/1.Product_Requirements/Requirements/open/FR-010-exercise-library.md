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

### FR-010-AC01: Exercise Creation

**Criterion**: Users can create exercises with all required attributes and the exercise is saved within **≤500ms**.

- **Test Method**: Integration + E2E
- **Evidence Required**: DB snapshot, UI screenshots, API response times

### FR-010-AC02: Exercise Validation

**Criterion**: Exercise creation/editing validates required fields (name, category) and rejects invalid data with clear error messages.

- **Test Method**: Unit + API negative
- **Evidence Required**: Validation test results, error message samples

### FR-010-AC03: Exercise Archival

**Criterion**: Archiving an exercise hides it from selectors but preserves it in historical sessions.

- **Test Method**: Integration + E2E
- **Evidence Required**: DB records, UI screenshots showing archived exercises not in selectors

### FR-010-AC04: Exercise Visibility

**Criterion**: Private exercises are only visible to their creator; public exercises are discoverable by all authenticated users.

- **Test Method**: Integration + E2E
- **Evidence Required**: Access control tests, UI screenshots

### FR-010-AC05: Exercise Discovery

**Criterion**: Users can search and filter public exercises by name, category, muscle group, and tags.

- **Test Method**: E2E
- **Evidence Required**: Search results, filter UI screenshots

### FR-010-AC06: Exercise Snapshot

**Criterion**: When an exercise is used in a session, a snapshot of the exercise name is stored in `session_exercises` and remains unchanged even if the exercise is later modified or archived.

- **Test Method**: Integration
- **Evidence Required**: DB records showing snapshot preservation

### FR-010-AC07: Global Exercise Management

**Criterion**: Administrators can create, edit, and archive global exercises that are accessible to all users.

- **Test Method**: Integration + E2E
- **Evidence Required**: Admin UI screenshots, access control tests

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
