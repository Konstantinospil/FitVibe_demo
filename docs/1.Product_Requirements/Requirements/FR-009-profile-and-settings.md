# FR-009 — Profile & Settings

---

**Requirement ID**: FR-009  
**Type**: Functional Requirement  
**Title**: Profile & Settings  
**Status**: Open  
**Priority**: Medium  
**Gate**: SILVER  
**Owner**: ENG/QA  
**Created**: 2025-01-20  
**Updated**: 2025-01-21

---

## Executive Summary

This functional requirement specifies user profile management and settings capabilities that the system must provide.

Enable users to manage their profile information, preferences, and account settings with appropriate data validation and privacy controls.

## Business Context

- **Business Objective**: Enable users to customize their profile and settings to personalize their FitVibe experience.
- **Success Criteria**: Users can edit profile information, update preferences, and manage account settings with data validation and persistence.
- **Target Users**: All authenticated users

## Traceability

- **PRD Reference**: PRD §4.2 (FR-2 Profile & Settings)
- **TDD Reference**: TDD §Users Module

## Functional Requirements

### Profile Information Management

#### Editable Fields

The system shall allow users to edit the following profile fields:

- **Alias**: User's display name (text, max length TBD)
- **Weight**: User's current weight with unit selection (kg/lbs)
- **Fitness Level**: User's self-assessed fitness level (enum: beginner, intermediate, advanced, elite)
- **Avatar**: Profile image (max 5MB, formats: JPEG, PNG, WebP)
- **Training Frequency**: User's typical training frequency for personalization

#### Immutable Fields

The following fields shall be immutable after initial registration:

- **Date of Birth**: Set during registration, cannot be changed
- **Gender**: Set during registration, cannot be changed
  - Options: man, woman, diverse, prefer not to say

### Avatar Handling

- **Upload**: Users can upload avatar images up to 5MB
- **Preview**: System generates 128×128 pixel preview
- **Placeholder**: System displays placeholder if no avatar is uploaded
- **Validation**: File type and size validation before upload

### Settings Management

- **Training Frequency**: Stored for personalization algorithms
- **Language Preference**: Managed via [FR-008](./FR-008-admin-and-rbac.md) (i18n)
- **Privacy Settings**: Managed via [NFR-002](./NFR-002-privacy.md) (Privacy)

## Related Epics

- [E1: Profile & Settings](../epics/E1-profile-and-settings.md)

## Dependencies

### Technical Dependencies

- Image processing library for avatar preview generation
- File upload handling
- Database for profile storage
- Validation framework

### Feature Dependencies

- [FR-001: User Registration](./FR-001-user-registration.md) - Profile created during registration
- [FR-002: Login & Session](./FR-002-login-and-session.md) - Authentication required
- [FR-008: Admin & RBAC](./FR-008-admin-and-rbac.md) - Admin may need to view/edit profiles

## Constraints

### Technical Constraints

- Avatar file size: max 5MB
- Avatar formats: JPEG, PNG, WebP only
- Avatar preview: 128×128 pixels
- Profile update persistence: ≤500ms
- Avatar preview generation: ≤2s

### Business Constraints

- Date of birth and gender are immutable after registration
- Weight must be positive and within reasonable range
- Alias must meet content policy requirements

## Assumptions

- Users have access to image files for avatar upload
- Image processing is reliable and performant
- Users understand which fields are editable vs immutable
- Training frequency data improves personalization

## Risks & Issues

- **Risk**: Large avatar uploads may impact performance
- **Risk**: Image processing may fail for corrupted files
- **Risk**: Immutable fields may frustrate users who made mistakes during registration
- **Risk**: Training frequency may not accurately reflect user behavior

## Open Questions

- What is the maximum length for alias/display name?
- What are the valid weight ranges (min/max)?
- Should there be avatar moderation/review?
- Should training frequency be auto-calculated from logged sessions?

## Related Requirements

- [FR-001: User Registration](./FR-001-user-registration.md) - Profile creation
- [FR-002: Login & Session](./FR-002-login-and-session.md) - Authentication
- [FR-008: Admin & RBAC](./FR-008-admin-and-rbac.md) - Admin profile management
- [NFR-002: Privacy](./NFR-002-privacy.md) - Profile data privacy
- [NFR-004: Accessibility](./NFR-004-a11y.md) - Profile form accessibility

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
