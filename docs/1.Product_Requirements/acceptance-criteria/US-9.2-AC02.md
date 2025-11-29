# US-9.2-AC02: Database and Job Metrics

---

**AC ID**: US-9.2-AC02
**Story ID**: [US-9.2](../user-stories/US-9.2-prometheus-metrics.md)
**Status**: Proposed
**Priority**: Medium
**Test Method**: Integration
**Created**: 2025-01-21
**Updated**: 2025-01-21

---

## Criterion

Database metrics: db_query_duration_seconds (histogram) with op, table labels; background job metrics: background_job_duration_seconds.

**SMART Criteria Checklist**:

- **Specific**: Clear database and job metric requirements
- **Measurable**: Metrics exposed, labels present
- **Achievable**: Standard metrics approach
- **Relevant**: Database and job monitoring
- **Time-bound**: N/A

## Test Method

Integration tests verify database and job metrics.

## Evidence Required

- DB metrics
- Job metrics

## Related Tests

{Note: Test files will be created and linked here}

## Related Evidence

{Note: Evidence files will be created and linked here}

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear
- [ ] Related tests are identified

## Related Artifacts

- **Story**: [US-9.2](../user-stories/US-9.2-prometheus-metrics.md)
- **Epic**: [E9](../epics/E9-observability.md)
- **Requirement**: [NFR-007](../requirements/NFR-007-observability.md)
- **PRD Reference**: PRD §Observability
- **TDD Reference**: TDD §Observability

---

**Last Updated**: 2025-01-21
**Verified By**: {Name/Team}
**Verified Date**: {YYYY-MM-DD}
