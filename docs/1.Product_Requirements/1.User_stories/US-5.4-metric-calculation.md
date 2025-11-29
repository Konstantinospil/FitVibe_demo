# US-5.4: Metric Calculation

---

**Story ID**: US-5.4  
**Epic ID**: [E5](../epics/E5-logging-and-import.md)  
**Title**: Metric Calculation  
**Status**: Proposed  
**Story Points**: 3  
**Priority**: Medium  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** user  
**I want** derived metrics to be automatically calculated when I edit pace or elevation  
**So that** I can see accurate performance metrics without manual calculation

## Description

When users edit pace or elevation, the system automatically recalculates derived metrics (average pace, elevation gain/loss, normalized power) within ≤200ms. Recalculation must be idempotent.

## Related Acceptance Criteria

- [US-5.4-AC01](../acceptance-criteria/US-5.4-AC01.md): Automatic recalculation
- [US-5.4-AC02](../acceptance-criteria/US-5.4-AC02.md): Idempotent recalculation

## Dependencies

### Story Dependencies

- [US-5.1: Manual Logging](../user-stories/US-5.1-manual-logging.md): Session metrics

## Technical Notes

- Derived metrics calculated server-side
- Recalculation triggered on specific field changes
- Snapshot tests ensure idempotency

## Test Strategy

- Integration tests for recalculation triggers
- Unit tests for idempotency
- Snapshot tests for stability

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code implemented and reviewed
- [ ] Tests written and passing (≥80% coverage)
- [ ] Documentation updated
- [ ] Evidence collected for all ACs

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
