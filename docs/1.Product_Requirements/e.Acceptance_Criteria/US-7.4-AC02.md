# US-7.4-AC02: Performance Regression Prevention

---

**AC ID**: US-7.4-AC02  
**Story ID**: [US-7.4](../d.User_stories/US-7.4-core-web-vitals.md)  
**Status**: Proposed  
**Priority**: High  
**Test Method**: Performance  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Performance regression >10% from baseline blocks release; Lighthouse CI runs per PR with budget enforcement.

**SMART Criteria Checklist**:

- **Specific**: Clear regression threshold and CI enforcement
- **Measurable**: Regression >10% blocks release, CI runs per PR
- **Achievable**: Standard CI/CD performance testing
- **Relevant**: Performance maintenance
- **Time-bound**: Per PR

## Test Method

Lighthouse CI runs per PR and enforces performance budgets.

## Evidence Required

- Lighthouse CI results
- Regression reports

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-7.4](../d.User_stories/US-7.4-core-web-vitals.md)
- **Epic**: [E7](../b.Epics/E7-performance-optimization.md)
- **Requirement**: [NFR-003](../a.Requirements/NFR-003-performance.md)
- **PRD Reference**: PRD §Performance
- **TDD Reference**: TDD §Performance

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
