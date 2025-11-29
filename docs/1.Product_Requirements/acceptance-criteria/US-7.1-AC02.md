# US-7.1-AC02: Per-Endpoint Budgets

---

**AC ID**: US-7.1-AC02  
**Story ID**: [US-7.1](../user-stories/US-7.1-api-performance.md)  
**Status**: Proposed  
**Priority**: High  
**Test Method**: Performance  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Per-endpoint budgets met: Auth ≤200ms, CRUD ≤300ms, Analytics ≤600ms, Feed ≤400ms p95.

**SMART Criteria Checklist**:

- **Specific**: Clear per-endpoint latency budgets
- **Measurable**: Each endpoint meets its budget
- **Achievable**: Realistic performance targets
- **Relevant**: User experience and performance
- **Time-bound**: Per-endpoint latency budgets

## Test Method

Performance tests verify each endpoint meets its budget.

## Evidence Required

- Endpoint latency metrics
- Budget compliance

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-7.1](../user-stories/US-7.1-api-performance.md)
- **Epic**: [E7](../epics/E7-performance-optimization.md)
- **Requirement**: [NFR-003](../requirements/NFR-003-performance.md)
- **PRD Reference**: PRD §Performance
- **TDD Reference**: TDD §Performance

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
