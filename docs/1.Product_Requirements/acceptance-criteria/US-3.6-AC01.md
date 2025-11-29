# US-3.6-AC01: Session Cloning

---

**AC ID**: US-3.6-AC01  
**Story ID**: [US-3.6](../user-stories/US-3.6-session-cloning.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration + E2E  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Users can clone public sessions via POST /api/v1/sessions/:id/clone or POST /api/v1/feed/session/:sessionId/clone; cloned session created as planned session for current user.

**SMART Criteria Checklist**:

- **Specific**: Clear API endpoints and clone behavior
- **Measurable**: Cloned session created as planned session
- **Achievable**: Standard clone pattern
- **Relevant**: Core functionality for content reuse
- **Time-bound**: N/A

## Test Method

Integration tests verify clone functionality and E2E tests verify complete workflow.

## Evidence Required

- Clone functionality tests
- Cloned session verification

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-3.6](../user-stories/US-3.6-session-cloning.md)
- **Epic**: [E3](../epics/E3-sharing-and-community.md)
- **Requirement**: [FR-011](../requirements/FR-011-sharing-and-community.md)
- **PRD Reference**: PRD §Sharing & Community
- **TDD Reference**: TDD §Sharing & Community

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
