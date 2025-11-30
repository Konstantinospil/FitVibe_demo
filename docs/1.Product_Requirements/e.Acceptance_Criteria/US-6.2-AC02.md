# US-6.2-AC02: Backup Deletion Propagation

---

**AC ID**: US-6.2-AC02  
**Story ID**: [US-6.2](../d.User_stories/US-6.2-account-deletion.md)  
**Status**: Proposed  
**Priority**: High  
**Test Method**: Ops review  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Account deletion propagates to backups within ≤14 days (configurable); deletion receipt issued in audit log.

**SMART Criteria Checklist**:

- **Specific**: Clear backup deletion timing and audit requirement
- **Measurable**: Deletion propagates within ≤14 days, audit log entry created
- **Achievable**: Standard backup deletion pattern
- **Relevant**: GDPR compliance and data protection
- **Time-bound**: ≤14 days propagation

## Test Method

Ops review of deletion pipeline and backup verification.

## Evidence Required

- Deletion pipeline logs
- Backup verification

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-6.2](../d.User_stories/US-6.2-account-deletion.md)
- **Epic**: [E6](../b.Epics/E6-privacy-and-gdpr.md)
- **Requirement**: [NFR-002](../a.Requirements/NFR-002-privacy.md)
- **PRD Reference**: PRD §Privacy
- **TDD Reference**: TDD §Privacy

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
