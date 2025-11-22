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

---

## Executive Summary

This functional requirement specifies user profile management and settings capabilities that the system must provide.

Enable users to manage their profile information, preferences, and account settings with appropriate data validation and privacy controls.

## Business Context

- **Business Objective**: Enable users to customize their profile and settings to personalize their FitVibe experience.
- **Success Criteria**: Users can edit profile information, update preferences, and manage account settings with data validation and persistence.
- **Priority**: Medium
- **Quality Gate**: SILVER
- **Owner**: ENG/QA
- **Status**: Open
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
- **Language Preference**: Managed via FR-008 (i18n)
- **Privacy Settings**: Managed via NFR-002 (Privacy)

## Acceptance Criteria

### FR-009-AC01: Profile Editing

**Criterion**: Users can edit editable profile fields and changes persist within **≤500ms**.

- **Test Method**: Integration + E2E
- **Evidence Required**: DB snapshot, UI screenshots, API response times

### FR-009-AC02: Field Validation

**Criterion**: Invalid profile data (e.g., weight out of range, invalid file type) is rejected with clear error messages.

- **Test Method**: Unit + API negative
- **Evidence Required**: Validation test results, error message samples

### FR-009-AC03: Immutable Fields

**Criterion**: Attempts to modify immutable fields (date of birth, gender) are rejected with **403 Forbidden**.

- **Test Method**: API negative
- **Evidence Required**: HTTP traces, error responses

### FR-009-AC04: Avatar Upload

**Criterion**: Avatar uploads are validated (size ≤5MB, type JPEG/PNG/WebP) and 128×128 preview is generated within **≤2s**.

- **Test Method**: Integration
- **Evidence Required**: Upload logs, preview images, performance metrics

### FR-009-AC05: Avatar Placeholder

**Criterion**: Users without avatars see a default placeholder image.

- **Test Method**: E2E
- **Evidence Required**: UI screenshots

### FR-009-AC06: Training Frequency Storage

**Criterion**: Training frequency preference is stored and used for personalization features.

- **Test Method**: Integration
- **Evidence Required**: DB records, personalization logs

## Test Strategy

- API negative
- E2E
- Integration
- Integration + E2E
- Unit + API negative

## Evidence Requirements

- API response times
- DB records, personalization logs
- DB snapshot, UI screenshots, API response times
- Error message samples
- Error responses
- HTTP traces
- Performance metrics
- Preview images
- UI screenshots
- Upload logs
- Validation test results

## Use Cases

### Primary Use Cases

- User updates their alias/display name
- User updates their weight and unit preference
- User uploads a new avatar image
- User updates their fitness level
- User sets their training frequency preference

### Edge Cases

- User attempts to upload avatar exceeding 5MB
- User attempts to upload unsupported file format
- User attempts to modify immutable fields (date of birth, gender)
- User provides invalid weight value (negative, zero, extremely high)
- Avatar upload fails due to network issues

## Dependencies

### Technical Dependencies

- Image processing library for avatar preview generation
- File upload handling
- Database for profile storage
- Validation framework

### Feature Dependencies

- FR-001 (User Registration) - Profile created during registration
- FR-002 (Login & Session) - Authentication required
- FR-008 (Admin & RBAC) - Admin may need to view/edit profiles

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

- FR-001: User Registration (profile creation)
- FR-002: Login & Session (authentication)
- FR-008: Admin & RBAC (admin profile management)
- NFR-002: Privacy (profile data privacy)
- NFR-004: Accessibility (profile form accessibility)
