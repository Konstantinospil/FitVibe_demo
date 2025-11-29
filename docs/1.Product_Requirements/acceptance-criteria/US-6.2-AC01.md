# US-6.2-AC01: Account Deletion Flow

---

**AC ID**: US-6.2-AC01  
**Story ID**: [US-6.2](../user-stories/US-6.2-account-deletion.md)  
**Status**: Proposed  
**Priority**: High  
**Test Method**: E2E DSR  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## Criterion

Users can delete account via DELETE /api/v1/users/me; deletion marks account as pending_deletion; hard deletion occurs within 30 days.

**SMART Criteria Checklist**:

- **Specific**: Clear API endpoint and deletion flow
- **Measurable**: Account marked as pending_deletion, hard deletion within 30 days
- **Achievable**: Standard deletion pattern with grace period
- **Relevant**: GDPR right to erasure
- **Time-bound**: 30-day grace period

## Test Method

E2E tests for complete deletion workflow including status verification.

## Evidence Required

- Deletion tests
- Account status verification

## Verification

- [ ] Criterion is specific and measurable
- [ ] Test method is appropriate
- [ ] Evidence requirements are clear

## Related Artifacts

- **Story**: [US-6.2](../user-stories/US-6.2-account-deletion.md)
- **Epic**: [E6](../epics/E6-privacy-and-gdpr.md)
- **Requirement**: [NFR-002](../requirements/NFR-002-privacy.md)
- **PRD Reference**: PRD §Privacy
- **TDD Reference**: TDD §Privacy

---

**Last Updated**: 2025-01-21  
**Verified By**: {Name/Team}  
**Verified Date**: {YYYY-MM-DD}
