# US-3.7: Content Reporting

---

**Story ID**: US-3.7  
**Epic ID**: [E3](../b.Epics/E3-sharing-and-community.md)  
**Title**: Content Reporting  
**Status**: Proposed  
**Story Points**: 3  
**Priority**: Medium  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** authenticated user  
**I want** to report inappropriate content  
**So that** I can help maintain a safe community environment

## Description

Users need the ability to report inappropriate sessions or comments. Reports appear in an admin moderation queue with rate limiting (10 reports per day).

## Related Acceptance Criteria

- [US-3.7-AC01](../e.Acceptance_Criteria/US-3.7-AC01.md): Content reporting
- [US-3.7-AC02](../e.Acceptance_Criteria/US-3.7-AC02.md): Admin moderation queue
- [US-3.7-AC03](../e.Acceptance_Criteria/US-3.7-AC03.md): Report rate limiting

## Dependencies

### Feature Dependencies

- [FR-008: Admin & RBAC](../a.Requirements/FR-008-admin-and-rbac.md): Admin role required

## Technical Notes

- Reports are idempotent
- Rate limiting: 10 reports per day
- Admin queue with filtering and pagination

## Test Strategy

- Integration tests for reporting operations
- E2E tests for complete workflow

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code implemented and reviewed
- [ ] Tests written and passing (≥80% coverage)
- [ ] Documentation updated
- [ ] Evidence collected for all ACs

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
