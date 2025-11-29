# US-6.2: Account Deletion

---

**Story ID**: US-6.2  
**Epic ID**: [E6](../epics/E6-privacy-and-gdpr.md)  
**Title**: Account Deletion  
**Status**: Proposed  
**Story Points**: 8  
**Priority**: High  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** user  
**I want** to delete my account and all associated data  
**So that** I can exercise my GDPR right to erasure

## Description

Users can delete their account via DELETE /api/v1/users/me. Deletion marks account as pending_deletion; hard deletion occurs within 30 days. Deletion propagates to backups within ≤14 days. All active sessions are invalidated and data is anonymized where required for referential integrity.

## Related Acceptance Criteria

- [US-6.2-AC01](../acceptance-criteria/US-6.2-AC01.md): Account deletion flow
- [US-6.2-AC02](../acceptance-criteria/US-6.2-AC02.md): Backup deletion propagation
- [US-6.2-AC03](../acceptance-criteria/US-6.2-AC03.md): Session invalidation and anonymization

## Dependencies

### Story Dependencies

- [FR-001: User Registration](../requirements/FR-001-user-registration.md): User accounts
- [NFR-005: Availability & Backups](../requirements/NFR-005-ops.md): Backup deletion

## Technical Notes

- Soft delete with 30-day grace period
- Backup deletion propagation
- Data anonymization for referential integrity

## Test Strategy

- E2E tests for complete deletion workflow
- Integration tests for deletion propagation
- Anonymization verification tests

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code implemented and reviewed
- [ ] Tests written and passing (≥80% coverage)
- [ ] Documentation updated
- [ ] Evidence collected for all ACs

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
