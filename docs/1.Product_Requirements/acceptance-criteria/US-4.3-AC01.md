# US-4.3-AC01: Drag-and-Drop Performance

---

**AC ID**: US-4.3-AC01  
**Story ID**: [US-4.3](../user-stories/US-4.3-drag-and-drop-scheduling.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: E2E  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Drag-and-drop scheduling updates session planned_at without full page reload; calendar re-renders within ≤150ms on modern desktop.

**SMART Criteria Checklist**:

- **Specific**: Clear performance requirement for drag-and-drop
- **Measurable**: Re-render ≤150ms, no full page reload
- **Achievable**: Standard drag-and-drop optimization approach
- **Relevant**: User experience and performance
- **Time-bound**: ≤150ms re-render

## Test Method

E2E tests measure drag-and-drop performance and verify no page reload.

## Evidence Required

- Performance traces
- Drag-and-drop functionality tests

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-4.3](../user-stories/US-4.3-drag-and-drop-scheduling.md)
- **Epic**: [E4](../epics/E4-planner-completion.md)
- **Requirement**: [FR-004](../requirements/FR-004-planner.md)
- **PRD Reference**: PRD §Planner
- **TDD Reference**: TDD §Planner

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
