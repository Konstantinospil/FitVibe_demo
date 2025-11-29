# US-6.4: Privacy Settings

---

**Story ID**: US-6.4  
**Epic ID**: [E6](../epics/E6-privacy-and-gdpr.md)  
**Title**: Privacy Settings  
**Status**: Proposed  
**Story Points**: 3  
**Priority**: High  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** user  
**I want** to configure privacy settings for my profile and content  
**So that** I can control who can see my information

## Description

Users can configure privacy settings for profile (hide age/weight) and content (default visibility) via privacy settings UI. Settings take effect immediately and are persisted in user profile. Past data visibility is not retroactively changed.

## Related Acceptance Criteria

- [US-6.4-AC01](../acceptance-criteria/US-6.4-AC01.md): Privacy settings UI
- [US-6.4-AC02](../acceptance-criteria/US-6.4-AC02.md): Settings application

## Dependencies

### Story Dependencies

- [FR-009: Profile & Settings](../requirements/FR-009-profile-and-settings.md): Profile settings

## Technical Notes

- Privacy settings stored in user profile
- Settings applied immediately
- No retroactive changes to past data

## Test Strategy

- E2E tests for privacy settings workflow
- Integration tests for settings application
- Security tests for privacy enforcement

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code implemented and reviewed
- [ ] Tests written and passing (≥80% coverage)
- [ ] Documentation updated
- [ ] Evidence collected for all ACs

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
