# FR-004 — Planner

---

**Requirement ID**: FR-004
**Type**: Functional Requirement
**Title**: Planner
**Status**: Proposed
**Priority**: Medium
**Gate**: SILVER
**Owner**: ENG
**Generated**: 2025-11-21T20:33:59.189229

---

## Executive Summary

This functional requirement specifies planner capabilities that the system must provide.

Enable users to plan training sessions with drag-and-drop scheduling and conflict detection.

## Business Context

- **Business Objective**: Enable users to plan training sessions with drag-and-drop scheduling and conflict detection.
- **Success Criteria**: Users can create, edit, and schedule training plans with real-time conflict detection.
- **Priority**: Medium
- **Quality Gate**: SILVER
- **Owner**: ENG
- **Status**: Proposed
- **Target Users**: Authenticated users planning workouts

## Traceability

- **PRD Reference**: PRD §Planner
- **TDD Reference**: TDD §Planner

## Acceptance Criteria

Each acceptance criterion must be met for this requirement to be considered complete.

### US-4.1-AC01

**Criterion**: Users can create training plans via POST /api/v1/plans with name, start_date, end_date; plan saved within ≤500ms.

- **Test Method**: Integration
- **Evidence Required**: DB snapshot, API response times
- **Related Story**: US-4.1

### US-4.1-AC02

**Criterion**: Users can update plans via PATCH /api/v1/plans/:id; updates persist and visible after reload.

- **Test Method**: Integration
- **Evidence Required**: Update tests, persistence verification
- **Related Story**: US-4.1

### US-4.1-AC03

**Criterion**: Users can delete plans via DELETE /api/v1/plans/:id; deletion is soft-delete (archived_at set); associated sessions are not deleted.

- **Test Method**: Integration
- **Evidence Required**: Deletion tests, session preservation verification
- **Related Story**: US-4.1

### US-4.1-AC04

**Criterion**: Plan concurrency: last-writer-wins with ETag support; stale ETag returns 412 Precondition Failed with conflict banner.

- **Test Method**: Integration
- **Evidence Required**: ETag headers, concurrency test results
- **Related Story**: US-4.1

### US-4.2-AC01

**Criterion**: Users can activate a plan via POST /api/v1/plans/:id/activate; activation generates scheduled sessions based on plan template and recurrence rules.

- **Test Method**: Integration
- **Evidence Required**: Activation tests, generated sessions verification
- **Related Story**: US-4.2

### US-4.2-AC02

**Criterion**: Plan progress tracking: progress_percent calculated as (completed_count / session_count) \* 100; progress updates when sessions are completed.

- **Test Method**: Integration
- **Evidence Required**: Progress calculation tests, progress update verification
- **Related Story**: US-4.2

### US-4.2-AC03

**Criterion**: Plan duration validation: duration_weeks ∈ [1..52]; target_frequency ∈ [1..7] sessions per week; invalid values rejected with 422.

- **Test Method**: Unit + API negative
- **Evidence Required**: Validation test results, error responses
- **Related Story**: US-4.2

### US-4.3-AC01

**Criterion**: Drag-and-drop scheduling updates session planned_at without full page reload; calendar re-renders within ≤150ms on modern desktop.

- **Test Method**: E2E
- **Evidence Required**: Performance traces, drag-and-drop functionality tests
- **Related Story**: US-4.3

### US-4.3-AC02

**Criterion**: Overlapping sessions detected client-side before save with actionable error message and visual highlight of conflicts.

- **Test Method**: Unit + E2E
- **Evidence Required**: Conflict detection tests, UI screenshots
- **Related Story**: US-4.3

### US-4.3-AC03

**Criterion**: Server re-validates session overlaps; rejects with 422 and returns conflicting session IDs in error response.

- **Test Method**: API negative
- **Evidence Required**: HTTP traces, error responses with conflict details
- **Related Story**: US-4.3

### US-4.3-AC04

**Criterion**: Calendar view displays sessions with proper time slots, colors, and labels; supports month/week/day views.

- **Test Method**: E2E
- **Evidence Required**: Calendar UI screenshots, view switching tests
- **Related Story**: US-4.3

### US-4.4-AC01

**Criterion**: Mobile drag/resize works via touch gestures (touchstart, touchmove, touchend); no scroll-jank with long tasks >50ms.

- **Test Method**: E2E mobile emu
- **Evidence Required**: Performance traces, touch gesture tests
- **Related Story**: US-4.4

### US-4.4-AC02

**Criterion**: Touch gestures are responsive and provide visual feedback; calendar is usable on mobile devices (screen width ≥320px).

- **Test Method**: E2E mobile emu
- **Evidence Required**: Mobile UI screenshots, usability tests
- **Related Story**: US-4.4

### US-4.5-AC01

**Criterion**: Unit tests cover plan CRUD, activation, session generation, and progress tracking with ≥90% code coverage.

- **Test Method**: Unit
- **Evidence Required**: Test coverage reports
- **Related Story**: US-4.5

### US-4.5-AC02

**Criterion**: Integration tests verify plan management, activation flow, conflict detection, and progress calculation.

- **Test Method**: Integration
- **Evidence Required**: Integration test results
- **Related Story**: US-4.5

### US-4.5-AC03

**Criterion**: E2E tests verify complete planner workflow including drag-and-drop, conflict detection, and mobile touch gestures.

- **Test Method**: E2E
- **Evidence Required**: E2E test results, UI screenshots
- **Related Story**: US-4.5

## Test Strategy

- API negative
- E2E
- E2E mobile emu
- Integration
- Unit + E2E

## Evidence Requirements

- DB diff + UI screenshots
- ETag headers
- HTTP traces
- Perf trace
- UI screenshots

## Use Cases

### Primary Use Cases

- User creates a training plan for a specific date/time
- User drags and drops sessions to reschedule
- User edits plan details and saves changes

### Edge Cases

- User attempts to schedule overlapping sessions
- Multiple users edit same plan simultaneously (concurrency)
- User schedules session in different timezone
- User attempts to schedule past-dated sessions

## Dependencies

### Technical Dependencies

- Calendar UI component
- Drag-and-drop library
- ETag support for concurrency

### Feature Dependencies

- FR-003 (Auth-Wall)

## Constraints

### Technical Constraints

- Plan persistence ≤500ms
- Calendar re-render ≤150ms
- Mobile touch gesture support

### Business Constraints

- Overlapping sessions must be prevented
- Last-writer-wins for concurrent edits

## Assumptions

- Users understand calendar interface
- Time zones are handled correctly
- Mobile devices support touch gestures

## Risks & Issues

- **Risk**: Performance degradation with many scheduled sessions
- **Risk**: Concurrency conflicts may frustrate users
- **Risk**: Mobile drag-and-drop may be difficult on small screens
