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

### FR-005-AC01-A

**Criterion**: Start/stop records duration, distance, HR; edits audit‑logged (who/when/what).

- **Test Method**: Unit + Integration
- **Evidence Required**: Audit excerpts

### FR-005-AC01-B

**Criterion**: Offline logging buffers events and syncs within **≤5s** after reconnect.

- **Test Method**: E2E (PWA offline)
- **Evidence Required**: Network trace

### FR-005-AC02-A

**Criterion**: Import GPX/FIT parses **≥99%** valid samples; malformed inputs produce user-facing error without crash.

- **Test Method**: Fuzz + fixtures
- **Evidence Required**: Corpus results

### FR-005-AC02-B

**Criterion**: FIT file EXIF/metadata with GPS/HR respected; timezone normalization applied.

- **Test Method**: Unit
- **Evidence Required**: Parser snapshots

### FR-005-AC03-A

**Criterion**: Editing pace/elevation recomputes derived metrics consistently within **≤200 ms**.

- **Test Method**: Integration
- **Evidence Required**: Recalc logs

### FR-005-AC03-B

**Criterion**: Recalculation is idempotent for the same inputs; snapshot tests stable.

- **Test Method**: Unit
- **Evidence Required**: Snapshots

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
