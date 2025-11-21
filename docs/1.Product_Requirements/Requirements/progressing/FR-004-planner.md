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

### FR-004-AC01-A

**Criterion**: Create/edit/delete plans persist within **≤500 ms** and are visible after reload.

- **Test Method**: Integration
- **Evidence Required**: DB diff + UI screenshots

### FR-004-AC01-B

**Criterion**: Concurrency: last-writer-wins with conflict banner if stale ETag; user can retry.

- **Test Method**: Integration
- **Evidence Required**: ETag headers

### FR-004-AC02-A

**Criterion**: Drag‑and‑drop scheduling updates without full reload; calendar re-renders under **150 ms** on modern desktop.

- **Test Method**: E2E
- **Evidence Required**: Perf trace

### FR-004-AC02-B

**Criterion**: Mobile drag/resize works via touch gestures; no scroll-jank > 50ms long tasks.

- **Test Method**: E2E mobile emu
- **Evidence Required**: Perf trace

### FR-004-AC03-A

**Criterion**: Overlapping sessions detected client-side before save with actionable message and highlight.

- **Test Method**: Unit + E2E
- **Evidence Required**: UI screenshots

### FR-004-AC03-B

**Criterion**: Server re-validates overlaps; rejects with 422 and returns conflicting session IDs.

- **Test Method**: API negative
- **Evidence Required**: HTTP traces

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
