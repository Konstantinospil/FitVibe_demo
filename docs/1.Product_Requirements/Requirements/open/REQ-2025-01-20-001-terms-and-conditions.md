# Requirements Document: Terms and Conditions Acceptance During Registration

**Request ID**: REQ-2025-01-20-001
**Feature**: Terms and Conditions Acceptance
**Status**: Complete
**Timestamp**: 2025-11-20T10:30:00Z
**Analyst**: requirements-analyst

---

## Executive Summary

Add a Terms and Conditions acceptance requirement to the user registration flow. Users must explicitly accept the Terms and Conditions before completing registration. This feature ensures legal compliance, protects the platform, and provides clear user consent documentation.

---

## Business Context

- **Business Objective**: Ensure legal compliance and protect the platform by requiring explicit user consent to Terms and Conditions during registration
- **Success Criteria**:
  - 100% of new registrations include terms acceptance
  - Terms acceptance is recorded and auditable
  - Registration cannot be completed without terms acceptance
- **Priority**: High (Legal/Compliance requirement)
- **Target Users**: All new users registering for FitVibe accounts

---

## Functional Requirements

### FR-001: Terms and Conditions Document

**Description**: A Terms and Conditions document must exist and be accessible to users.
**Priority**: Must-have
**Acceptance Criteria**:

- [ ] Terms and Conditions document is created and stored (e.g., `/apps/docs/policies/Terms_and_Conditions.md`)
- [ ] Terms document is accessible via a public route (e.g., `/terms` or `/terms-and-conditions`)
- [ ] Terms document includes standard sections: user obligations, service description, liability limitations, dispute resolution
- [ ] Terms document is versioned (e.g., "Effective Date: [date]")
- [ ] Terms document can be viewed in a modal or new page from registration form
      **Use Cases**:
- Primary: User views Terms before accepting during registration
- Edge Cases: User needs to review Terms after registration (should be accessible from settings/profile)

### FR-002: Terms Acceptance Checkbox in Registration Form

**Description**: Registration form must include a required checkbox for Terms and Conditions acceptance.
**Priority**: Must-have
**Acceptance Criteria**:

- [ ] Checkbox is displayed on registration form (before submit button)
- [ ] Checkbox is required (form cannot be submitted without checking)
- [ ] Checkbox label includes link to view full Terms document
- [ ] Checkbox state is visually clear (checked/unchecked)
- [ ] Checkbox is accessible via keyboard navigation
- [ ] Error message displayed if user attempts to submit without accepting
      **Use Cases**:
- Primary: User checks box to accept Terms and submits registration
- Edge Cases: User unchecks box after checking (submit button should be disabled), user tries to submit without checking (show error)

### FR-003: Terms Acceptance Data Storage

**Description**: Terms acceptance must be recorded in the database with timestamp and version information.
**Priority**: Must-have
**Acceptance Criteria**:

- [ ] Database schema includes fields for terms acceptance:
  - `terms_accepted` (boolean, required)
  - `terms_accepted_at` (timestamp)
  - `terms_version` (string, e.g., "v1.0" or date-based version)
- [ ] Terms acceptance is stored when user is created
- [ ] Terms acceptance cannot be null or false for new registrations
- [ ] Terms acceptance data is included in user data export (GDPR compliance)
      **Use Cases**:
- Primary: User accepts Terms, data is stored with registration
- Edge Cases: User registration fails after acceptance (should not create partial user record)

### FR-004: Backend Validation of Terms Acceptance

**Description**: Backend must validate that Terms and Conditions are accepted before processing registration.
**Priority**: Must-have
**Acceptance Criteria**:

- [ ] Registration API endpoint validates `terms_accepted` field
- [ ] API returns 400/422 error if `terms_accepted` is false or missing
- [ ] Error message is clear and user-friendly
- [ ] Validation occurs before any user record is created
- [ ] Validation is included in registration schema (Zod validation)
      **Use Cases**:
- Primary: User submits registration with terms_accepted: true, registration succeeds
- Edge Cases: API called directly without terms_accepted field (should reject), terms_accepted is false (should reject)

### FR-005: Terms Document Display

**Description**: Users must be able to view the full Terms and Conditions document from the registration form.
**Priority**: Must-have
**Acceptance Criteria**:

- [ ] Link to Terms is visible in registration form (near checkbox)
- [ ] Clicking link opens Terms in modal, new tab, or dedicated page
- [ ] Terms document is readable and properly formatted
- [ ] Terms document is accessible (WCAG 2.1 AA compliant)
- [ ] Users can close/view Terms without losing registration form state
      **Use Cases**:
- Primary: User clicks "View Terms" link, reads Terms, returns to form
- Edge Cases: User opens Terms in new tab, closes tab, returns to form (form state preserved)

### FR-006: Terms Version Tracking

**Description**: System must track which version of Terms user accepted for audit and compliance purposes.
**Priority**: Should-have
**Acceptance Criteria**:

- [ ] Terms document has a version identifier (version number or effective date)
- [ ] Version identifier is stored with user's acceptance record
- [ ] Version can be queried for audit purposes
- [ ] Version is displayed in user data export
      **Use Cases**:
- Primary: User accepts Terms v1.0, version is stored with acceptance timestamp
- Edge Cases: Terms are updated after user registration (existing users keep their accepted version)

---

## Non-Functional Requirements

### NFR-001: Legal Compliance

**Description**: Implementation must meet legal requirements for terms acceptance.
**Acceptance Criteria**:

- Terms acceptance is explicit (not pre-checked)
- Terms acceptance is required (cannot be bypassed)
- Terms acceptance is recorded with timestamp
- Terms acceptance is auditable

### NFR-002: Accessibility

**Description**: Terms acceptance UI must be accessible to all users.
**Acceptance Criteria**:

- Checkbox is keyboard accessible
- Screen readers can identify checkbox purpose
- Link to Terms is clearly labeled
- Error messages are accessible
- WCAG 2.1 AA compliant

### NFR-003: User Experience

**Description**: Terms acceptance should not significantly impact registration flow.
**Acceptance Criteria**:

- Terms can be viewed without losing form data
- Checkbox is clearly visible and understandable
- Error messages are helpful and actionable
- Registration flow remains intuitive

### NFR-004: Performance

**Description**: Terms document loading should not delay registration.
**Acceptance Criteria**:

- Terms document loads in < 2 seconds
- Registration form remains responsive while Terms load
- Terms viewing does not block form submission

---

## Dependencies

### Technical Dependencies

- **Registration Form Component** (`apps/frontend/src/pages/Register.tsx`): Must be modified to include checkbox
- **Registration API Endpoint** (`apps/backend/src/modules/auth/auth.controller.ts`): Must validate terms acceptance
- **Registration Schema** (`apps/backend/src/modules/auth/auth.schemas.ts`): Must include terms_accepted field
- **User Database Schema**: Must include terms acceptance fields (migration required)
- **User Service** (`apps/backend/src/modules/users/users.service.ts`): Must handle terms acceptance data
- **Routing System**: Must support Terms document route (e.g., `/terms`)

### Feature Dependencies

- **User Registration Flow**: Must exist (already implemented)
- **Database Migration System**: Required to add new fields
- **Form Validation**: Required for checkbox validation

### External Dependencies

- **Legal Review**: Terms and Conditions document must be reviewed by legal team before implementation
- **Content**: Terms and Conditions content must be written/approved

---

## Constraints

### Technical Constraints

- Must work with existing registration flow (minimal disruption)
- Must use existing form components and styling system
- Must follow existing database schema patterns
- Must maintain backward compatibility (existing users may not have terms acceptance)

### Business Constraints

- Terms document content must be legally reviewed before launch
- Implementation should not delay other registration features
- Must comply with GDPR and other applicable regulations

### Regulatory Constraints

- Terms acceptance must be explicit (not implied)
- Terms acceptance must be recorded for audit purposes
- Terms acceptance data must be included in user data exports (GDPR)

---

## Assumptions

- Terms and Conditions document will be provided/approved by legal team
- Existing registered users will not be required to retroactively accept Terms (grandfathered)
- Terms document will be static (not dynamically generated)
- Terms updates will be handled through new version tracking (future enhancement)
- Users can view Terms after registration from settings/profile page (future enhancement)

---

## Risks & Issues

- **Risk**: Terms document not ready when feature is implemented
  - **Mitigation**: Create placeholder Terms document, mark for legal review, implement structure to support content updates
- **Risk**: Breaking existing registration flow
  - **Mitigation**: Thorough testing, feature flag if needed, backward compatibility for existing users
- **Issue**: None identified

---

## Open Questions

- Should Terms acceptance be required for existing users on next login? (Recommendation: No, grandfathered)
- Should Terms document be translatable/multi-language? (Recommendation: Yes, if app supports i18n)
- How should Terms updates be handled for existing users? (Recommendation: Future enhancement - notify users of updates)
- Should Privacy Policy acceptance be combined with Terms acceptance? (Recommendation: Separate checkboxes for clarity)

---

## Handoff Information

**Next Agent**: design-agent (for UI/UX design) or implementation-agent (if design patterns exist)
**Status**: Ready
**Notes**:

- Requirements are complete and ready for design/implementation
- Legal team should review Terms document content before production deployment
- Database migration will be required to add terms acceptance fields
- Existing users should be handled gracefully (nullable fields or default values)
  **Estimated Effort**: 2-3 days for implementation (assuming Terms document content is ready)

---

## Implementation Notes

### Database Schema Changes Required

```sql
-- Add to users table or user_consents table
ALTER TABLE users ADD COLUMN terms_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN terms_version VARCHAR(50);
```

### API Changes Required

- Update `RegisterSchema` in `auth.schemas.ts` to include `terms_accepted: z.boolean().refine(val => val === true)`
- Update registration controller to validate terms acceptance
- Update user creation service to store terms acceptance data

### Frontend Changes Required

- Add checkbox to `Register.tsx` form
- Add link to Terms document (modal or route)
- Add form validation for checkbox
- Add error handling for terms acceptance
- Create Terms document page/component

### Testing Considerations

- Unit tests for schema validation
- Integration tests for registration flow with/without terms acceptance
- E2E tests for registration with terms acceptance
- Accessibility tests for checkbox and link
- Edge case: form submission without checkbox checked
