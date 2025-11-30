# US-7.2-AC02: Table Partitioning and Connection Pooling

---

**AC ID**: US-7.2-AC02  
**Story ID**: [US-7.2](../d.User_stories/US-7.2-database-optimization.md)  
**Status**: Proposed  
**Priority**: High  
**Test Method**: Performance  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Large tables (sessions, user_points) partitioned by month; partitions automatically pruned; connection pooling p95 wait <5ms.

**SMART Criteria Checklist**:

- **Specific**: Clear partitioning strategy and pooling requirement
- **Measurable**: Tables partitioned, pruning works, pool wait <5ms
- **Achievable**: Standard partitioning and pooling approach
- **Relevant**: Database performance and scalability
- **Time-bound**: <5ms pool wait

## Test Method

Performance tests verify partitioning and connection pool metrics.

## Evidence Required

- Partitioning verification
- Pool metrics

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-7.2](../d.User_stories/US-7.2-database-optimization.md)
- **Epic**: [E7](../b.Epics/E7-performance-optimization.md)
- **Requirement**: [NFR-003](../a.Requirements/NFR-003-performance.md)
- **PRD Reference**: PRD §Performance
- **TDD Reference**: TDD §Performance

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
