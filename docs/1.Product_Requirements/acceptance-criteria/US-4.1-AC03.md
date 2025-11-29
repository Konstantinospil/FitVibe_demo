# US-4.1-AC03: Plan Deletion (Soft-Delete)

---

**AC ID**: US-4.1-AC03  
**Story ID**: [US-4.1](../user-stories/US-4.1-plan-crud.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Users can delete plans via DELETE /api/v1/plans/:id; deletion is soft-delete (archived_at set); associated sessions are not deleted.

**SMART Criteria Checklist**:

- **Specific**: Clear API endpoint and soft-delete mechanism
- **Measurable**: archived_at timestamp set, sessions preserved
- **Achievable**: Standard soft-delete pattern
- **Relevant**: Preserves data integrity and history
- **Time-bound**: N/A

## Test Method

Integration tests verify deletion functionality and session preservation.

## Evidence Required

- Deletion tests showing archived_at timestamp
- Session preservation verification

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-4.1](../user-stories/US-4.1-plan-crud.md)
- **Epic**: [E4](../epics/E4-planner-completion.md)
- **Requirement**: [FR-004](../requirements/FR-004-planner.md)
- **PRD Reference**: PRD §Planner
- **TDD Reference**: TDD §Planner

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
