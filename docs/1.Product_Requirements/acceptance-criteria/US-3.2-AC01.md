# US-3.2-AC01: Session Visibility Toggle

---

**AC ID**: US-3.2-AC01  
**Story ID**: [US-3.2](../user-stories/US-3.2-session-visibility.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration + E2E  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Users can toggle session visibility (private/public) via PATCH /api/v1/sessions/:id with visibility field; default is private.

**SMART Criteria Checklist**:

- **Specific**: Clear API endpoint and visibility options
- **Measurable**: Visibility toggled successfully, default is private
- **Achievable**: Standard toggle pattern
- **Relevant**: Core privacy functionality
- **Time-bound**: N/A

## Test Method

Integration tests verify API functionality and E2E tests verify complete workflow.

## Evidence Required

- Visibility toggle tests
- API responses

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-3.2](../user-stories/US-3.2-session-visibility.md)
- **Epic**: [E3](../epics/E3-sharing-and-community.md)
- **Requirement**: [FR-011](../requirements/FR-011-sharing-and-community.md)
- **PRD Reference**: PRD §Sharing & Community
- **TDD Reference**: TDD §Sharing & Community

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
