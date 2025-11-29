# FR-005 — Logging & Import

---

**Requirement ID**: FR-005  
**Type**: Functional Requirement  
**Title**: Logging & Import  
**Status**: Progressing  
**Priority**: Medium  
**Gate**: SILVER  
**Owner**: ENG  
**Created**: 2025-11-21  
**Updated**: 2025-01-21

---

## Executive Summary

This functional requirement specifies logging & import capabilities that the system must provide.

Enable users to log workouts manually or import from external sources (GPX/FIT files).

## Business Context

- **Business Objective**: Enable users to log workouts manually or import from external sources (GPX/FIT files).
- **Success Criteria**: Users can log workouts, import files, and edit logged data with accurate metric calculations.
- **Target Users**: Authenticated users logging workouts

## Traceability

- **PRD Reference**: PRD §Logging
- **TDD Reference**: TDD §Importers

## Functional Requirements

### Manual Logging

The system shall provide manual workout logging with the following capabilities:

- **Session Metrics**: Log duration, distance, heart rate, sets, reps, weight
- **Status Management**: Mark sessions as completed via API
- **Audit Logging**: All edits are audit-logged with who/when/what
- **Frontend Interface**: Manual entry with validation and unit conversion

### File Import

- **GPX Import**: Import GPX files with track points, elevation, and timestamps
- **FIT Import**: Import FIT files with GPS, heart rate, power, and device metrics
- **Parser Robustness**: Handle ≥99% valid samples, graceful error handling for malformed files
- **Timezone Normalization**: Proper timezone handling for imported data

### Metric Calculation

- **Derived Metrics**: Automatic recalculation of pace, elevation gain/loss, normalized power
- **Idempotent Calculation**: Same inputs produce same outputs
- **Recalculation Triggers**: Editing pace or elevation triggers automatic recalculation

### Offline Support

- **Offline Logging**: Buffer session events in local storage (IndexedDB)
- **Sync on Reconnect**: Events sync to server within ≤5s after network reconnect
- **Service Worker**: Enable offline functionality with sync queue and retry logic

## Related Epics

- [E5: Logging & Import](../epics/E5-logging-and-import.md)

## Dependencies

### Technical Dependencies

- GPX parser library
- FIT parser library
- File upload handling
- IndexedDB for offline storage
- Service worker support

### Feature Dependencies

- [FR-001: User Registration](./FR-001-user-registration.md) - User accounts
- [FR-002: Login & Session](./FR-002-login-and-session.md) - Authentication
- [FR-004: Planner](./FR-004-planner.md) - Session planning

## Constraints

### Technical Constraints

- Session logging ≤500ms
- Metric recalculation ≤200ms
- Offline sync ≤5s after reconnect
- Parser handles ≥99% valid samples

### Business Constraints

- Historical accuracy must be preserved
- Imported data must be editable

## Assumptions

- Users have access to GPX/FIT files from fitness devices
- File formats are standard-compliant
- Network connectivity is generally available

## Risks & Issues

- **Risk**: Malformed files may cause parser errors
- **Risk**: Large file imports may impact performance
- **Risk**: Offline sync conflicts may cause data loss

## Open Questions

- Should there be file size limits for imports?
- What is the maximum number of sessions that can be imported at once?

## Related Requirements

- [FR-004: Planner](./FR-004-planner.md) - Session planning
- [FR-010: Exercise Library](./FR-010-exercise-library.md) - Exercise selection
- [NFR-003: Performance](./NFR-003-performance.md) - Performance requirements

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
