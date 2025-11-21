# NFR-005 — Ops

---

**Requirement ID**: NFR-005
**Type**: Non-Functional Requirement
**Title**: Ops
**Status**: Proposed
**Priority**: High
**Gate**: SILVER
**Owner**: OPS/ENG
**Generated**: 2025-11-21T20:33:59.205303

---

## Executive Summary

This non-functional requirement defines ops standards and constraints for the FitVibe platform.

Ensure platform availability and data protection through backups and monitoring.

## Business Context

- **Business Objective**: Ensure platform availability and data protection through backups and monitoring.
- **Success Criteria**: 99.0% monthly uptime, backups succeed nightly, and restore drills validate RTO/RPO.
- **Priority**: High
- **Quality Gate**: SILVER
- **Owner**: OPS/ENG
- **Status**: Proposed
- **Target Users**: All users (availability affects everyone)

## Traceability

- **PRD Reference**: PRD §Ops
- **TDD Reference**: TDD §Ops

## Acceptance Criteria

Each acceptance criterion must be met for this requirement to be considered complete.

### NFR-005-AC01

**Criterion**: SLO uptime ≥ 99.0% monthly; outages have RCA within 5 BD.

- **Test Method**: Monitoring
- **Evidence Required**: Status page, RCA

### NFR-005-AC02

**Criterion**: Nightly backups succeed; monthly restore drill validates RTO≤4h/RPO≤24h.

- **Test Method**: Restore drill
- **Evidence Required**: Restore logs

### NFR-005-AC03

**Criterion**: `/healthz` allowlisted only; no sensitive data in body.

- **Test Method**: Proxy test
- **Evidence Required**: Curl captures

## Test Strategy

- Monitoring
- Proxy test
- Restore drill

## Evidence Requirements

- Curl captures
- Restore logs
- Status page, RCA

## Use Cases

### Primary Use Cases

- System is available for users
- Backups run successfully
- Restore drill validates recovery process
- Health check endpoint reports status

### Edge Cases

- System outage requires recovery
- Backup fails and needs investigation
- Restore drill reveals issues

## Dependencies

### Technical Dependencies

- Backup system
- Monitoring system
- Health check endpoint
- Restore procedures

### External Dependencies

- Backup storage
- Monitoring service

## Constraints

### Technical Constraints

- SLO ≥99.0% monthly
- RTO ≤4h
- RPO ≤24h
- /healthz allowlisted only

### Business Constraints

- Outages require RCA within 5 BD
- Backups must be tested regularly

## Assumptions

- Infrastructure is reliable
- Backup storage is secure
- Restore procedures are documented

## Risks & Issues

- **Risk**: Outages may exceed SLO
- **Risk**: Backups may fail silently
- **Risk**: Restore may take longer than RTO
