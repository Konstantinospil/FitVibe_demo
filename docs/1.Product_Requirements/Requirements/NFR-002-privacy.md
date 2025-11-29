# NFR-002 — Privacy

---

**Requirement ID**: NFR-002  
**Type**: Non-Functional Requirement  
**Title**: Privacy  
**Status**: Progressing  
**Priority**: High  
**Gate**: GOLD  
**Owner**: ENG/QA  
**Created**: 2025-11-21  
**Updated**: 2025-01-21

---

## Executive Summary

This non-functional requirement defines privacy standards and constraints for the FitVibe platform.

Ensure GDPR compliance and user privacy through data minimization and user rights.

## Business Context

- **Business Objective**: Ensure GDPR compliance and user privacy through data minimization and user rights.
- **Success Criteria**: No PII in logs, consent is respected, and users can export/delete their data within SLA.
- **Target Users**: All users (privacy affects everyone)

## Traceability

- **PRD Reference**: PRD §Privacy
- **TDD Reference**: TDD §Data, QA

## Non-Functional Requirements

### GDPR Compliance

The system shall comply with GDPR requirements:

- **Data Export**: Users can request data export (JSON bundle) within ≤24h
- **Data Deletion**: Users can delete account; hard deletion within 30 days, backup propagation ≤14 days
- **Consent Management**: Users can manage consent preferences; opt-out respected within ≤5m
- **Privacy Settings**: Users can configure privacy settings for profile and content visibility
- **Audit Logging**: All GDPR events (export, deletion, consent changes) are audit-logged

### Data Minimization

- **PII Exclusion**: No PII in logs beyond hashed IDs
- **Privacy-by-Default**: Default privacy settings are private
- **Data Retention**: Data retention policies enforced

### User Rights

- **Right to Access**: Users can export their data
- **Right to Erasure**: Users can delete their account
- **Right to Rectification**: Users can update their data
- **Right to Portability**: Data export in machine-readable format

## Related Epics

- [E6: Privacy & GDPR](../epics/E6-privacy-and-gdpr.md)

## Dependencies

### Technical Dependencies

- Data export system
- Account deletion system
- Consent management system
- Audit logging system

### Feature Dependencies

- [FR-001: User Registration](./FR-001-user-registration.md) - User accounts
- [FR-009: Profile & Settings](./FR-009-profile-and-settings.md) - Privacy settings
- [NFR-005: Availability & Backups](./NFR-005-ops.md) - Backup deletion propagation

## Constraints

### Technical Constraints

- Data export generation ≤24h
- Account deletion hard deletion ≤30 days
- Backup deletion propagation ≤14 days
- Consent opt-out effect ≤5m

### Business Constraints

- GDPR compliance required
- Privacy-by-default required
- Data minimization required

## Assumptions

- Users understand their privacy rights
- GDPR requirements are clear
- Data export/deletion processes are reliable

## Risks & Issues

- **Risk**: Data export may be incomplete
- **Risk**: Account deletion may affect related data
- **Risk**: Consent management may be complex

## Open Questions

- Should there be data retention policies?
- How should consent be obtained for new features?

## Related Requirements

- [FR-001: User Registration](./FR-001-user-registration.md) - User data
- [FR-009: Profile & Settings](./FR-009-profile-and-settings.md) - Privacy settings
- [NFR-005: Availability & Backups](./NFR-005-ops.md) - Backup management

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
