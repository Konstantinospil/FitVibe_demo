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
**Updated**: 2025-01-21

---

## Executive Summary

This functional requirement specifies exercise library management capabilities that the system must provide.

Enable users and administrators to create, manage, and discover exercises with proper categorization, visibility controls, and historical preservation.

## Business Context

- **Business Objective**: Provide a comprehensive exercise library that supports both personal and global exercise definitions with proper categorization and discovery.
- **Success Criteria**: Users can create personal exercises, discover public exercises, and exercises are properly archived (not deleted) to maintain historical accuracy.
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

## Related Epics

- [E2: Exercise Library](../epics/E2-exercise-library.md)

## Dependencies

### Technical Dependencies

- Database for exercise storage
- Search functionality
- Access control system

### Feature Dependencies

- [FR-001: User Registration](./FR-001-user-registration.md) - User accounts
- [FR-002: Login & Session](./FR-002-login-and-session.md) - Authentication
- [FR-004: Planner](./FR-004-planner.md) - Exercise selection in planner
- [FR-005: Logging & Import](./FR-005-logging-and-import.md) - Exercise selection in logger
- [FR-008: Admin & RBAC](./FR-008-admin-and-rbac.md) - Admin global exercise management

## Constraints

### Technical Constraints

- Exercise creation ≤500ms
- Search response time ≤400ms
- Name uniqueness per owner enforced

### Business Constraints

- Exercises must be archived, not deleted
- Historical accuracy must be preserved
- Global exercises accessible to all users

## Assumptions

- Users understand exercise categorization
- Administrators will curate global exercises
- Exercise names are meaningful and searchable

## Risks & Issues

- **Risk**: Large exercise libraries may impact search performance
- **Risk**: Duplicate exercise names may confuse users
- **Risk**: Exercise archival may complicate data management

## Open Questions

- Should there be exercise moderation/review?
- What is the maximum number of exercises per user?
- Should exercises support custom metrics?

## Related Requirements

- [FR-004: Planner](./FR-004-planner.md) - Exercise selection
- [FR-005: Logging & Import](./FR-005-logging-and-import.md) - Exercise selection
- [FR-008: Admin & RBAC](./FR-008-admin-and-rbac.md) - Global exercise management

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
