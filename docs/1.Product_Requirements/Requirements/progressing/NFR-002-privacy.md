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

### NFR-002-AC01-A

**Criterion**: Logs contain no PII beyond hashed IDs; redaction verified across error paths.

- **Test Method**: Unit + Integration
- **Evidence Required**: Log samples

### NFR-002-AC01-B

**Criterion**: Consent banner gates optional analytics; opt-out respected within **≤5m** across services.

- **Test Method**: E2E
- **Evidence Required**: Config + screenshots

### NFR-002-AC02-A

**Criterion**: User data export (JSON+CSV) available within **≤24h** for typical accounts; job monitored.

- **Test Method**: E2E DSR
- **Evidence Required**: Job logs

### NFR-002-AC02-B

**Criterion**: Deletion: anonymization + purge across primary/backup within **≤30d**; evidence in staging.

- **Test Method**: Ops review
- **Evidence Required**: Runbook evidence

### NFR-002-AC03

**Criterion**: Retention jobs execute per policy; at least one successful run evidenced in staging.

- **Test Method**: Ops log review
- **Evidence Required**: Job logs

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
