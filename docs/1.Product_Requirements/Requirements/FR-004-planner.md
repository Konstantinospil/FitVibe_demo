# FR-004 — Planner

---

**Requirement ID**: FR-004  
**Type**: Functional Requirement  
**Title**: Planner  
**Status**: Progressing  
**Priority**: Medium  
**Gate**: SILVER  
**Owner**: ENG  
**Created**: 2025-11-21  
**Updated**: 2025-01-21

---

## Executive Summary

This functional requirement specifies planner capabilities that the system must provide.

Enable users to plan training sessions with drag-and-drop scheduling and conflict detection.

## Business Context

- **Business Objective**: Enable users to plan training sessions with drag-and-drop scheduling and conflict detection.
- **Success Criteria**: Users can create, edit, and schedule training plans with real-time conflict detection.
- **Target Users**: Authenticated users planning workouts

## Traceability

- **PRD Reference**: PRD §Planner
- **TDD Reference**: TDD §Planner

## Functional Requirements

### Plan Management

The system shall provide training plan management with the following capabilities:

- **Plan CRUD**: Create, read, update, and delete (soft-delete) training plans
- **Plan Activation**: Activate plans to generate scheduled sessions based on recurrence rules
- **Progress Tracking**: Track plan completion progress (completed vs planned sessions)
- **Concurrency Control**: Last-writer-wins with ETag support for concurrent edits

### Scheduling

- **Drag-and-Drop**: Drag-and-drop scheduling in calendar view
- **Conflict Detection**: Client and server-side detection of overlapping sessions
- **Calendar Views**: Support month/week/day views with proper time slots
- **Mobile Support**: Touch gesture support for mobile devices (screen width ≥320px)

### Validation

- **Duration Validation**: Plan duration 1-52 weeks, target frequency 1-7 sessions per week
- **Overlap Prevention**: Prevent scheduling overlapping sessions
- **Timezone Handling**: Proper timezone handling for scheduled sessions

## Related Epics

- [E4: Planner Completion](../epics/E4-planner-completion.md)

## Dependencies

### Technical Dependencies

- Calendar UI component
- Drag-and-drop library
- ETag support for concurrency

### Feature Dependencies

- [FR-001: User Registration](./FR-001-user-registration.md) - User accounts
- [FR-002: Login & Session](./FR-002-login-and-session.md) - Authentication
- [FR-003: Auth-Wall](./FR-003-authwall.md) - Protected routes

## Constraints

### Technical Constraints

- Plan persistence ≤500ms
- Calendar re-render ≤150ms
- Mobile touch gesture support
- No scroll-jank with long tasks >50ms

### Business Constraints

- Overlapping sessions must be prevented
- Last-writer-wins for concurrent edits
- Historical sessions preserved when plans are archived

## Assumptions

- Users understand calendar interface
- Time zones are handled correctly
- Mobile devices support touch gestures

## Risks & Issues

- **Risk**: Performance degradation with many scheduled sessions
- **Risk**: Concurrency conflicts may frustrate users
- **Risk**: Mobile drag-and-drop may be difficult on small screens

## Open Questions

- None

## Related Requirements

- [FR-005: Logging & Import](./FR-005-logging-and-import.md) - Session logging
- [FR-010: Exercise Library](./FR-010-exercise-library.md) - Exercise selection
- [NFR-003: Performance](./NFR-003-performance.md) - Performance requirements

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
