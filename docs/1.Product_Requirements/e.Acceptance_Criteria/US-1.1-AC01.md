# US-1.1-AC01: Profile Editing API

---

**AC ID**: US-1.1-AC01  
**Story ID**: [US-1.1](../d.User_stories/US-1.1-profile-editing.md)  
**Status**: Proposed  
**Priority**: Medium  
**Test Method**: Integration + E2E  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Users can edit alias, weight, fitness level, and training frequency via API endpoint PATCH /api/v1/users/me within ≤500ms response time.

**SMART Criteria Checklist**:

- **Specific**: Clear API endpoint and editable fields
- **Measurable**: Response time ≤500ms
- **Achievable**: Realistic performance target
- **Relevant**: Core functionality for profile management
- **Time-bound**: Response time constraint specified

## Test Method

Integration tests verify API functionality and E2E tests verify complete workflow.

## Evidence Required

- API response times from performance tests
- DB snapshot showing updated profile
- UI screenshots showing updated profile

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-1.1](../d.User_stories/US-1.1-profile-editing.md)
- **Epic**: [E1](../b.Epics/E1-profile-and-settings.md)
- **Requirement**: [FR-009](../a.Requirements/FR-009-profile-and-settings.md)
- **PRD Reference**: PRD §Profile & Settings
- **TDD Reference**: TDD §Profile & Settings

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
