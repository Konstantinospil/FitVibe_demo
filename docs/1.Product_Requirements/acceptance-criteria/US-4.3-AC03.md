# US-4.3-AC03: Server-Side Conflict Validation

---

**AC ID**: US-4.3-AC03  
**Story ID**: [US-4.3](../user-stories/US-4.3-drag-and-drop-scheduling.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: API negative  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Server re-validates session overlaps; rejects with 422 and returns conflicting session IDs in error response.

**SMART Criteria Checklist**:

- **Specific**: Clear server validation and error response requirements
- **Measurable**: Server validates, returns 422, includes conflicting session IDs
- **Achievable**: Standard server-side validation approach
- **Relevant**: Data integrity and security
- **Time-bound**: N/A

## Test Method

API negative tests verify server-side conflict validation and error responses.

## Evidence Required

- HTTP traces
- Error responses with conflict details

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
