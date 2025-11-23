# NFR-002 — Privacy

---

**Requirement ID**: NFR-002
**Type**: Non-Functional Requirement
**Title**: Privacy
**Status**: Proposed
**Priority**: High
**Gate**: GOLD
**Owner**: ENG/QA
**Generated**: 2025-11-21T20:33:59.199589

---

## Executive Summary

This non-functional requirement defines privacy standards and constraints for the FitVibe platform.

Ensure GDPR compliance and user privacy through data minimization and user rights.

## Business Context

- **Business Objective**: Ensure GDPR compliance and user privacy through data minimization and user rights.
- **Success Criteria**: No PII in logs, consent is respected, and users can export/delete their data within SLA.
- **Priority**: High
- **Quality Gate**: GOLD
- **Owner**: ENG/QA
- **Status**: Proposed
- **Target Users**: All users (privacy affects everyone)

## Traceability

- **PRD Reference**: PRD §Privacy
- **TDD Reference**: TDD §Data, QA

## Acceptance Criteria

Each acceptance criterion must be met for this requirement to be considered complete.

### US-6.1-AC01

**Criterion**: Users can request data export via GET /api/v1/users/me/export; export generates JSON bundle with user, profile, sessions, exercises, points, badges within ≤24h.

- **Test Method**: E2E DSR
- **Evidence Required**: Export job logs, JSON bundle samples
- **Related Story**: US-6.1

### US-6.1-AC02

**Criterion**: Export link valid for 24h; download available via secure link; export includes all user data per GDPR requirements.

- **Test Method**: E2E DSR
- **Evidence Required**: Export link tests, data completeness verification
- **Related Story**: US-6.1

### US-6.2-AC01

**Criterion**: Users can delete account via DELETE /api/v1/users/me; deletion marks account as pending_deletion; hard deletion occurs within 30 days.

- **Test Method**: E2E DSR
- **Evidence Required**: Deletion tests, account status verification
- **Related Story**: US-6.2

### US-6.2-AC02

**Criterion**: Account deletion propagates to backups within ≤14 days (configurable); deletion receipt issued in audit log.

- **Test Method**: Ops review
- **Evidence Required**: Deletion pipeline logs, backup verification
- **Related Story**: US-6.2

### US-6.2-AC03

**Criterion**: Deletion invalidates all active sessions; user cannot login after deletion; data anonymized where required for referential integrity.

- **Test Method**: Integration
- **Evidence Required**: Session invalidation tests, anonymization verification
- **Related Story**: US-6.2

### US-6.3-AC01

**Criterion**: Users can manage consent preferences via UI; consent stored in database with timestamp and version; opt-out respected within ≤5m across services.

- **Test Method**: E2E
- **Evidence Required**: Consent UI screenshots, consent storage verification
- **Related Story**: US-6.3

### US-6.3-AC02

**Criterion**: Consent banner gates optional analytics; consent changes trigger immediate effect; consent history maintained for audit.

- **Test Method**: E2E
- **Evidence Required**: Consent banner tests, analytics gating verification
- **Related Story**: US-6.3

### US-6.4-AC01

**Criterion**: Users can configure privacy settings for profile (hide age/weight) and content (default visibility) via privacy settings UI.

- **Test Method**: E2E
- **Evidence Required**: Privacy settings UI screenshots, settings persistence tests
- **Related Story**: US-6.4

### US-6.4-AC02

**Criterion**: Privacy settings take effect immediately; past data visibility not retroactively changed; settings persisted in user profile.

- **Test Method**: Integration + Security
- **Evidence Required**: Privacy tests, settings application verification
- **Related Story**: US-6.4

### US-6.5-AC01

**Criterion**: All GDPR-related events (export requests, deletion requests, consent changes) are audit-logged with timestamp, user ID, and action details.

- **Test Method**: Integration
- **Evidence Required**: Audit log excerpts, GDPR event verification
- **Related Story**: US-6.5

### US-6.5-AC02

**Criterion**: Audit logs are retained per retention policy; logs are searchable and exportable for compliance demonstrations.

- **Test Method**: Ops review
- **Evidence Required**: Audit log retention verification, search functionality
- **Related Story**: US-6.5

### US-6.6-AC01

**Criterion**: Integration tests verify data export flow, deletion flow, consent management, and privacy settings with GDPR compliance checks.

- **Test Method**: Integration
- **Evidence Required**: GDPR flow test results
- **Related Story**: US-6.6

### US-6.6-AC02

**Criterion**: E2E tests verify complete GDPR user journeys including export request, download, account deletion, and consent management.

- **Test Method**: E2E DSR
- **Evidence Required**: E2E test results, GDPR journey screenshots
- **Related Story**: US-6.6

## Test Strategy

- E2E
- E2E DSR
- Ops log review
- Ops review
- Unit + Integration

## Evidence Requirements

- Config + screenshots
- Job logs
- Log samples
- Runbook evidence

## Use Cases

### Primary Use Cases

- User exports their data (GDPR right)
- User deletes their account (GDPR right)
- User opts out of analytics
- System redacts PII from logs

### Edge Cases

- User requests export during high load
- User deletes account but data needed for legal hold
- Consent changes require immediate effect

## Dependencies

### Technical Dependencies

- Data export job system
- Data deletion pipeline
- Log redaction system

### Feature Dependencies

- FR-007 (Analytics & Export)

## Constraints

### Technical Constraints

- Export ≤24h for typical accounts
- Deletion ≤30d
- No PII in logs

### Business Constraints

- GDPR compliance required
- Consent opt-out ≤5m

## Assumptions

- Users understand their privacy rights
- Data deletion is technically feasible
- Legal holds are rare

## Risks & Issues

- **Risk**: Data deletion may be incomplete
  - **Mitigation**: Comprehensive deletion pipeline with verification and audit trail
- **Risk**: Export delays may violate GDPR
  - **Mitigation**: Job monitoring, alerting, and SLA enforcement
- **Risk**: Log redaction may miss edge cases
  - **Mitigation**: Automated PII scanning and manual audit processes

## Open Questions

- What is the retention policy for audit logs containing user actions?
- How are legal holds handled when user requests deletion?
- What is the process for handling data subject access requests (DSAR)?
- Should there be a data processing register (Article 30 GDPR)?
- What is the consent withdrawal process for different data types?
