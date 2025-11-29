# FR-007 — Analytics & Export

---

**Requirement ID**: FR-007  
**Type**: Functional Requirement  
**Title**: Analytics & Export  
**Status**: Done  
**Priority**: High  
**Gate**: GOLD  
**Owner**: ENG/QA  
**Created**: 2025-11-21  
**Updated**: 2025-01-21

---

## Executive Summary

This functional requirement specifies analytics & export capabilities that the system must provide.

Provide users with insights into their training progress and ability to export data.

## Business Context

- **Business Objective**: Provide users with insights into their training progress and ability to export data.
- **Success Criteria**: Users can view accurate analytics and export their data in CSV/JSON format within 24h.
- **Target Users**: Authenticated users viewing progress

## Traceability

- **PRD Reference**: PRD §Analytics
- **TDD Reference**: TDD §Analytics

## Functional Requirements

### Analytics

The system shall provide analytics with the following capabilities:

- **Aggregations**: Weekly, monthly, and custom range aggregations
- **Accuracy**: Aggregations match DB-level checks within ±0.5%
- **Personal Bests**: Calculate and display personal bests correctly
- **Streaks**: Compute streaks correctly, break on skipped days as specified

### Data Export

- **Export Formats**: Export data in CSV/JSON format
- **Schema Compliance**: Correct schema (UTF-8, CRLF normalized)
- **Performance**: Downloadable under ≤1s for ≤10k rows
- **Privacy Controls**: Exclude private sessions by default, toggle to include with warning

### Dashboard

- **Visualizations**: Display analytics in clear, accessible visualizations
- **Time Ranges**: Support multiple time range selections
- **Real-Time Updates**: Analytics update when new data is available

## Related Epics

{Note: FR-007 is implemented. No specific epic exists yet for enhancements.}

## Dependencies

### Technical Dependencies

- Analytics calculation engine
- Export generation system
- Visualization library

### Feature Dependencies

- [FR-004: Planner](./FR-004-planner.md) - Session planning data
- [FR-005: Logging & Import](./FR-005-logging-and-import.md) - Session data
- [NFR-002: Privacy](./NFR-002-privacy.md) - Privacy controls

## Constraints

### Technical Constraints

- Export generation ≤1s for ≤10k rows
- Aggregation accuracy ±0.5%
- UTF-8 encoding required

### Business Constraints

- Private sessions excluded by default
- Export must be GDPR compliant

## Assumptions

- Users want to track their progress
- Export functionality is important for data portability
- Analytics accuracy is critical

## Risks & Issues

- **Risk**: Large exports may impact performance
- **Risk**: Analytics calculations may be inaccurate
- **Risk**: Export may expose sensitive data

## Open Questions

- Should there be export size limits?
- What analytics are most valuable to users?

## Related Requirements

- [FR-004: Planner](./FR-004-planner.md) - Session data
- [FR-005: Logging & Import](./FR-005-logging-and-import.md) - Session data
- [NFR-002: Privacy](./NFR-002-privacy.md) - Privacy and GDPR

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
