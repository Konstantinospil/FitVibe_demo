# FR-007 — Analytics & Export

---

**Requirement ID**: FR-007
**Type**: Functional Requirement
**Title**: Analytics & Export
**Status**: Proposed
**Priority**: High
**Gate**: GOLD
**Owner**: ENG/QA
**Generated**: 2025-11-21T20:33:59.195446

---

## Executive Summary

This functional requirement specifies analytics & export capabilities that the system must provide.

Provide users with insights into their training progress and ability to export data.

## Business Context

- **Business Objective**: Provide users with insights into their training progress and ability to export data.
- **Success Criteria**: Users can view accurate analytics and export their data in CSV/JSON format within 24h.
- **Priority**: High
- **Quality Gate**: GOLD
- **Owner**: ENG/QA
- **Status**: Proposed
- **Target Users**: Authenticated users viewing progress

## Traceability

- **PRD Reference**: PRD §Analytics
- **TDD Reference**: TDD §Analytics

## Acceptance Criteria

Each acceptance criterion must be met for this requirement to be considered complete.

### FR-007-AC01-A

**Criterion**: Dashboard aggregates (weekly, monthly, custom range) match DB-level checks within **±0.5%**.

- **Test Method**: Integration
- **Evidence Required**: Query snapshots

### FR-007-AC01-B

**Criterion**: Personal bests and streaks compute correctly from seeds; break on skipped days as specified.

- **Test Method**: Unit + Integration
- **Evidence Required**: Seed fixtures

### FR-007-AC02-A

**Criterion**: Export CSV/JSON delivers correct schema (UTF-8, CRLF normalized), downloadable under **≤1s** for ≤10k rows.

- **Test Method**: API + E2E
- **Evidence Required**: File samples

### FR-007-AC02-B

**Criterion**: Export excludes private sessions by default; toggle explicitly includes them with warning modal.

- **Test Method**: E2E
- **Evidence Required**: UI/screens

## Test Strategy

- API + E2E
- E2E
- Integration
- Unit + Integration

## Evidence Requirements

- File samples
- Query snapshots
- Seed fixtures
- UI/screens

## Use Cases

### Primary Use Cases

- User views weekly/monthly training summaries
- User views personal bests and streaks
- User exports data in CSV/JSON format

### Edge Cases

- User exports data including/excluding private sessions
- User views analytics for custom date ranges
- User has no training data (empty state)

## Dependencies

### Technical Dependencies

- Analytics aggregation engine
- Materialized views
- CSV/JSON export generator

### Feature Dependencies

- FR-005 (Logging & Import)

## Constraints

### Technical Constraints

- Aggregates match DB within ±0.5%
- Export ≤1s for ≤10k rows
- UTF-8 encoding required

### Business Constraints

- Private sessions excluded by default
- Export link valid 24h

## Assumptions

- Users understand analytics metrics
- Users want to export their data
- Data volume is manageable (<10k rows typical)

## Risks & Issues

- **Risk**: Large exports may timeout
- **Risk**: Analytics calculation errors may mislead users
- **Risk**: Privacy concerns with data export
