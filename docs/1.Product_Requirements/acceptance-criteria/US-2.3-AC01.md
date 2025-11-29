# US-2.3-AC01: Exercise Snapshot on Use

---

**AC ID**: US-2.3-AC01  
**Story ID**: [US-2.3](../user-stories/US-2.3-exercise-snapshots.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

When an exercise is used in a session, exercise name is stored as snapshot in session_exercises.exercise_name field; snapshot persists even if exercise is later modified or archived.

**SMART Criteria Checklist**:

- **Specific**: Clear snapshot mechanism and persistence requirement
- **Measurable**: Snapshot stored in session_exercises.exercise_name
- **Achievable**: Standard snapshot pattern
- **Relevant**: Preserves historical accuracy
- **Time-bound**: N/A

## Test Method

Integration tests verify snapshot creation and persistence.

## Evidence Required

- DB records showing snapshot preservation
- Exercise modification tests showing snapshot unchanged

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-2.3](../user-stories/US-2.3-exercise-snapshots.md)
- **Epic**: [E2](../epics/E2-exercise-library.md)
- **Requirement**: [FR-010](../requirements/FR-010-exercise-library.md)
- **PRD Reference**: PRD §Exercise Library
- **TDD Reference**: TDD §Exercise Library

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
