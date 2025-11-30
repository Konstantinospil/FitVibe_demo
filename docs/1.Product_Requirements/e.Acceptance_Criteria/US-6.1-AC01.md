# US-6.1-AC01: Data Export Generation

---

**AC ID**: US-6.1-AC01  
**Story ID**: [US-6.1](../d.User_stories/US-6.1-data-export.md)  
**Status**: Proposed  
**Priority**: High  
**Test Method**: E2E DSR  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Users can request data export via GET /api/v1/users/me/export; export generates JSON bundle with user, profile, sessions, exercises, points, badges within ≤24h.

**SMART Criteria Checklist**:

- **Specific**: Clear API endpoint and data scope
- **Measurable**: Export generated, all data included, within ≤24h
- **Achievable**: Standard export job pattern
- **Relevant**: GDPR data portability requirement
- **Time-bound**: ≤24h generation time

## Test Method

E2E tests for complete export workflow including job creation and download.

## Evidence Required

- Export job logs
- JSON bundle samples

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-6.1](../d.User_stories/US-6.1-data-export.md)
- **Epic**: [E6](../b.Epics/E6-privacy-and-gdpr.md)
- **Requirement**: [NFR-002](../a.Requirements/NFR-002-privacy.md)
- **PRD Reference**: PRD §Privacy
- **TDD Reference**: TDD §Privacy

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
