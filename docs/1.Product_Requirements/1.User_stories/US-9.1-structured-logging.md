# US-9.1: Structured Logging

---

**Story ID**: US-9.1  
**Epic ID**: [E9](../epics/E9-observability.md)  
**Title**: Structured Logging  
**Status**: Proposed  
**Story Points**: 3  
**Priority**: Medium  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** developer  
**I want** structured logs with correlation IDs  
**So that** I can trace requests across services and debug issues

## Description

All logs are structured JSON with required fields: ts, level, request_id, user_id (if authenticated), route, status, lat_ms. No PII in logs. Correlation IDs (request_id) are propagated across services; request tracing is possible via correlation ID search.

## Related Acceptance Criteria

- [US-9.1-AC01](../acceptance-criteria/US-9.1-AC01.md): Structured JSON logs
- [US-9.1-AC02](../acceptance-criteria/US-9.1-AC02.md): Correlation ID propagation

## Dependencies

### Story Dependencies

- [NFR-007: Observability](../requirements/NFR-007-observability.md): Parent requirement

## Technical Notes

- Structured JSON logging (Pino)
- Correlation ID propagation
- PII filtering

## Test Strategy

- Log format verification
- Correlation ID propagation tests
- PII scan tests

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code implemented and reviewed
- [ ] Tests written and passing (≥80% coverage)
- [ ] Documentation updated
- [ ] Evidence collected for all ACs

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
