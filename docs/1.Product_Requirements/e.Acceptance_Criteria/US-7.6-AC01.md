# US-7.6-AC01: Materialized View Creation

---

**AC ID**: US-7.6-AC01  
**Story ID**: [US-7.6](../d.User_stories/US-7.6-materialized-views.md)  
**Status**: Proposed  
**Priority**: High  
**Test Method**: Integration  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Materialized views created for analytics (session_summary, exercise_prs, weekly_aggregates); views refreshed asynchronously (REFRESH CONCURRENTLY).

**SMART Criteria Checklist**:

- **Specific**: Clear view names and refresh method
- **Measurable**: Views created, refresh is concurrent
- **Achievable**: Standard materialized view approach
- **Relevant**: Analytics performance
- **Time-bound**: N/A

## Test Method

Integration tests verify view creation and refresh method.

## Evidence Required

- Materialized view definitions
- Refresh job logs

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-7.6](../d.User_stories/US-7.6-materialized-views.md)
- **Epic**: [E7](../b.Epics/E7-performance-optimization.md)
- **Requirement**: [NFR-003](../a.Requirements/NFR-003-performance.md)
- **PRD Reference**: PRD §Performance
- **TDD Reference**: TDD §Performance

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
