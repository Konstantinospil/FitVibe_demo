# FR-005 — Logging & Import

---

**Requirement ID**: FR-005
**Type**: Functional Requirement
**Title**: Logging & Import
**Status**: Proposed
**Priority**: Medium
**Gate**: SILVER
**Owner**: ENG
**Generated**: 2025-11-21T20:33:59.190475

---

## Executive Summary

This functional requirement specifies logging & import capabilities that the system must provide.

Enable users to log workouts manually or import from external sources (GPX/FIT files).

## Business Context

- **Business Objective**: Enable users to log workouts manually or import from external sources (GPX/FIT files).
- **Success Criteria**: Users can log workouts, import files, and edit logged data with accurate metric calculations.
- **Priority**: Medium
- **Quality Gate**: SILVER
- **Owner**: ENG
- **Status**: Proposed
- **Target Users**: Authenticated users logging workouts

## Traceability

- **PRD Reference**: PRD §Logging
- **TDD Reference**: TDD §Importers

## Acceptance Criteria

Each acceptance criterion must be met for this requirement to be considered complete.

### US-5.1-AC01

**Criterion**: Users can log session metrics (duration, distance, heart rate, sets, reps, weight) via PATCH /api/v1/sessions/:id with status='completed'; metrics saved within ≤500ms.

- **Test Method**: Integration + E2E
- **Evidence Required**: Logging tests, DB records, API response times
- **Related Story**: US-5.1

### US-5.1-AC02

**Criterion**: Session edits are audit-logged with who/when/what; audit records include field changes and timestamps.

- **Test Method**: Unit + Integration
- **Evidence Required**: Audit log excerpts, edit history verification
- **Related Story**: US-5.1

### US-5.1-AC03

**Criterion**: Logger frontend allows manual entry of all metrics with proper validation and unit conversion.

- **Test Method**: E2E
- **Evidence Required**: Logger UI screenshots, form validation tests
- **Related Story**: US-5.1

### US-5.2-AC01

**Criterion**: Users can import GPX files via POST /api/v1/sessions/import with file upload; GPX parser extracts track points, elevation, and timestamps.

- **Test Method**: Fuzz + fixtures
- **Evidence Required**: GPX parser test results, import success/failure logs
- **Related Story**: US-5.2

### US-5.2-AC02

**Criterion**: GPX parser handles ≥99% valid GPX samples; malformed GPX files produce user-facing error (422) without application crash.

- **Test Method**: Fuzz + fixtures
- **Evidence Required**: Corpus results, error handling tests
- **Related Story**: US-5.2

### US-5.2-AC03

**Criterion**: Imported GPX data creates session with proper metrics (distance, duration, elevation gain/loss); timezone normalization applied.

- **Test Method**: Unit
- **Evidence Required**: Parser snapshots, imported session verification
- **Related Story**: US-5.2

### US-5.3-AC01

**Criterion**: Users can import FIT files via POST /api/v1/sessions/import; FIT parser extracts GPS, heart rate, power, and other device metrics.

- **Test Method**: Fuzz + fixtures
- **Evidence Required**: FIT parser test results, import success/failure logs
- **Related Story**: US-5.3

### US-5.3-AC02

**Criterion**: FIT parser handles ≥99% valid FIT samples; malformed FIT files produce user-facing error (422) without crash.

- **Test Method**: Fuzz + fixtures
- **Evidence Required**: Corpus results, error handling tests
- **Related Story**: US-5.3

### US-5.3-AC03

**Criterion**: FIT file metadata (GPS coordinates, heart rate zones, timezone) respected; timezone normalization applied correctly.

- **Test Method**: Unit
- **Evidence Required**: Parser snapshots, metadata extraction verification
- **Related Story**: US-5.3

### US-5.4-AC01

**Criterion**: Editing pace or elevation triggers automatic recalculation of derived metrics (average pace, elevation gain/loss, normalized power) within ≤200ms.

- **Test Method**: Integration
- **Evidence Required**: Recalculation logs, metric update verification
- **Related Story**: US-5.4

### US-5.4-AC02

**Criterion**: Metric recalculation is idempotent: same inputs produce same outputs; snapshot tests remain stable across runs.

- **Test Method**: Unit
- **Evidence Required**: Snapshot tests, idempotency verification
- **Related Story**: US-5.4

### US-5.5-AC01

**Criterion**: Offline logging buffers session events in local storage (IndexedDB); events sync to server within ≤5s after network reconnect.

- **Test Method**: E2E (PWA offline)
- **Evidence Required**: Network traces, sync verification, offline storage tests
- **Related Story**: US-5.5

### US-5.5-AC02

**Criterion**: Service worker enables offline functionality; sync queue handles failed syncs with retry logic (exponential backoff).

- **Test Method**: E2E (PWA offline)
- **Evidence Required**: Service worker tests, sync queue verification
- **Related Story**: US-5.5

### US-5.6-AC01

**Criterion**: Fuzz tests cover GPX and FIT parsers with diverse file samples; parser handles edge cases (empty files, malformed XML/binary, missing fields).

- **Test Method**: Fuzz + fixtures
- **Evidence Required**: Fuzz test results, corpus coverage
- **Related Story**: US-5.6

### US-5.6-AC02

**Criterion**: Import tests verify file validation, parsing accuracy, error handling, and metric calculation correctness.

- **Test Method**: Unit + Integration
- **Evidence Required**: Import test results, accuracy verification
- **Related Story**: US-5.6

## Test Strategy

- E2E (PWA offline)
- Fuzz + fixtures
- Integration
- Unit
- Unit + Integration

## Evidence Requirements

- Audit excerpts
- Corpus results
- Network trace
- Parser snapshots
- Recalc logs
- Snapshots

## Use Cases

### Primary Use Cases

- User starts a workout and logs duration, distance, HR
- User imports GPX file from running watch
- User edits logged workout data

### Edge Cases

- User logs workout while offline (sync on reconnect)
- User imports malformed GPX/FIT file
- User edits pace which triggers metric recalculation
- User imports file with missing timezone data

## Dependencies

### Technical Dependencies

- GPX/FIT parser libraries
- Offline storage (PWA)
- Metric calculation engine

### Feature Dependencies

- FR-004 (Planner)

## Constraints

### Technical Constraints

- Import parsing ≥99% valid samples
- Recalculation ≤200ms
- Offline sync ≤5s after reconnect

### Business Constraints

- All edits must be audit-logged

## Assumptions

- Users have GPX/FIT files from compatible devices
- Users understand metric relationships (pace, elevation, etc.)
- Network connectivity is available for sync

## Risks & Issues

- **Risk**: Malformed files may crash parser
  - **Mitigation**: Comprehensive error handling and validation
- **Risk**: Offline data loss if device fails before sync
  - **Mitigation**: Local persistence with sync queue and retry logic
- **Risk**: Metric calculation errors may confuse users
  - **Mitigation**: Comprehensive testing and validation of calculation formulas

## Open Questions

- What is the maximum file size for GPX/FIT imports?
- Should there be a limit on number of offline sessions before sync?
- What happens if timezone data is missing from imported files?
- Should users be able to import multiple files in batch?
- What is the strategy for handling duplicate imports?
