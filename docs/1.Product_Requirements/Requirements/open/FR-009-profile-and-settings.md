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

Each acceptance criterion must be met for this requirement to be considered complete.

### US-1.1-AC01

**Criterion**: Users can edit alias, weight, fitness level, and training frequency via API endpoint PATCH /api/v1/users/me within ≤500ms response time.

- **Test Method**: Integration + E2E
- **Evidence Required**: API response times, DB snapshot, UI screenshots
- **Related Story**: US-1.1

### US-1.1-AC02

**Criterion**: Profile field validation: alias max 32 chars, weight range 20-400 kg (or equivalent in lbs), fitness level enum (beginner/intermediate/advanced/elite), training frequency enum (rarely/1_2_per_week/3_4_per_week/5_plus_per_week). Invalid values rejected with 422 and clear error messages.

- **Test Method**: Unit + API negative
- **Evidence Required**: Validation test results, error message samples
- **Related Story**: US-1.1

### US-1.1-AC03

**Criterion**: Immutable fields (date_of_birth, gender) cannot be modified; attempts return 403 Forbidden with error code E.USER.IMMUTABLE_FIELD.

- **Test Method**: API negative
- **Evidence Required**: HTTP traces, error responses
- **Related Story**: US-1.1

### US-1.1-AC04

**Criterion**: Weight is stored internally as kg (weight_kg) regardless of user's preferred unit; UI converts for display based on user's weight_unit preference.

- **Test Method**: Integration
- **Evidence Required**: DB records, UI conversion tests
- **Related Story**: US-1.1

### US-1.1-AC05

**Criterion**: Profile changes are audit-logged with who/when/what; state history records created for each field change.

- **Test Method**: Integration
- **Evidence Required**: Audit log excerpts, state history records
- **Related Story**: US-1.1

### US-1.2-AC01

**Criterion**: Users can upload avatar images via POST /api/v1/users/me/avatar; accepted formats: JPEG, PNG, WebP; max size 5MB; rejected with 422 if invalid.

- **Test Method**: Integration
- **Evidence Required**: Upload logs, error responses for invalid files
- **Related Story**: US-1.2

### US-1.2-AC02

**Criterion**: Uploaded avatars are scanned for malware using antivirus service; infected files rejected with E.UPLOAD.MALWARE_DETECTED and audit logged.

- **Test Method**: Integration
- **Evidence Required**: AV scan logs, EICAR test file rejection
- **Related Story**: US-1.2

### US-1.2-AC03

**Criterion**: System generates 128×128 pixel preview image from uploaded avatar within ≤2s; preview stored and served at /users/avatar/:id endpoint.

- **Test Method**: Integration
- **Evidence Required**: Preview images, performance metrics, storage verification
- **Related Story**: US-1.2

### US-1.2-AC04

**Criterion**: Users without avatars see a default placeholder image; placeholder is accessible and properly sized.

- **Test Method**: E2E
- **Evidence Required**: UI screenshots showing placeholder
- **Related Story**: US-1.2

### US-1.2-AC05

**Criterion**: Avatar upload is idempotent via Idempotency-Key header; duplicate uploads return same result with Idempotent-Replayed header.

- **Test Method**: Integration
- **Evidence Required**: Idempotency test results, HTTP headers
- **Related Story**: US-1.2

### US-1.3-AC01

**Criterion**: Unit tests cover profile field validation, immutable field protection, and weight unit conversion with ≥90% code coverage.

- **Test Method**: Unit
- **Evidence Required**: Test coverage reports
- **Related Story**: US-1.3

### US-1.3-AC02

**Criterion**: Integration tests verify profile update API, avatar upload flow, and error handling scenarios.

- **Test Method**: Integration
- **Evidence Required**: Integration test results
- **Related Story**: US-1.3

### US-1.3-AC03

**Criterion**: E2E tests verify complete profile editing workflow including form validation, submission, and persistence.

- **Test Method**: E2E
- **Evidence Required**: E2E test results, UI screenshots
- **Related Story**: US-1.3

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
