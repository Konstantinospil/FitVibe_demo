# US-3.1: Public Feed

---

**Story ID**: US-3.1  
**Epic ID**: [E3](../epics/E3-sharing-and-community.md)  
**Title**: Public Feed  
**Status**: Proposed  
**Story Points**: 5  
**Priority**: Medium  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** authenticated user  
**I want** to browse a public feed of shared training sessions  
**So that** I can discover content from other users

## Description

Users need access to a public feed displaying public sessions from all users. The feed must support search, sorting, pagination, and meet performance targets (p95 ≤400ms).

## Related Acceptance Criteria

- [US-3.1-AC01](../acceptance-criteria/US-3.1-AC01.md): Public feed access
- [US-3.1-AC02](../acceptance-criteria/US-3.1-AC02.md): Feed search
- [US-3.1-AC03](../acceptance-criteria/US-3.1-AC03.md): Feed sorting
- [US-3.1-AC04](../acceptance-criteria/US-3.1-AC04.md): Feed performance

## Dependencies

### Feature Dependencies

- [FR-001: User Registration](../requirements/FR-001-user-registration.md): User accounts required
- [FR-002: Login & Session](../requirements/FR-002-login-and-session.md): Authentication required
- [FR-004: Planner](../requirements/FR-004-planner.md): Sessions must exist

## Technical Notes

- Feed response time p95 ≤400ms
- Pagination: default 20, max 100
- Cached for 30s via NGINX edge caching

## Test Strategy

- Integration tests for API endpoints
- E2E tests for complete workflow
- Performance tests for response times

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code implemented and reviewed
- [ ] Tests written and passing (≥80% coverage)
- [ ] Documentation updated
- [ ] Evidence collected for all ACs

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
