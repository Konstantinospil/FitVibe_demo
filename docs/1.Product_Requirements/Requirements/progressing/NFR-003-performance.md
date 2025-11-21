# NFR-003 — Performance

---

**Requirement ID**: NFR-003
**Type**: Non-Functional Requirement
**Title**: Performance
**Status**: Proposed
**Priority**: High
**Gate**: GOLD
**Owner**: ENG
**Generated**: 2025-11-21T20:33:59.201527

---

## Executive Summary

This non-functional requirement defines performance standards and constraints for the FitVibe platform.

Ensure fast, responsive user experience across devices and network conditions.

## Business Context

- **Business Objective**: Ensure fast, responsive user experience across devices and network conditions.
- **Success Criteria**: Core Web Vitals meet targets, API responses are fast, and no regressions >10% across releases.
- **Priority**: High
- **Quality Gate**: GOLD
- **Owner**: ENG
- **Status**: Proposed
- **Target Users**: All users (performance affects everyone)

## Traceability

- **PRD Reference**: PRD §Perf
- **TDD Reference**: TDD §Perf

## Acceptance Criteria

Each acceptance criterion must be met for this requirement to be considered complete.

### NFR-003-AC01-A

**Criterion**: P95 LCP ≤ 2.5s and CLS ≤ 0.1 on Dashboard and Planner (staging & prod).

- **Test Method**: LHCI
- **Evidence Required**: LHCI reports

### NFR-003-AC01-B

**Criterion**: P95 TTI ≤ 3.5s on mid-tier mobile (Moto G4 class).

- **Test Method**: LHCI
- **Evidence Required**: LHCI reports

### NFR-003-AC02

**Criterion**: P95 TTFB ≤ 500ms for authenticated HTML/API responses.

- **Test Method**: Synthetic
- **Evidence Required**: WebPageTest

### NFR-003-AC03

**Criterion**: No regression >10% on Core Web Vitals across releases (LHCI budgets).

- **Test Method**: Trend compare
- **Evidence Required**: LHCI budgets

## Test Strategy

- LHCI
- Synthetic
- Trend compare

## Evidence Requirements

- LHCI budgets
- LHCI reports
- WebPageTest

## Use Cases

### Primary Use Cases

- User loads dashboard quickly (LCP ≤2.5s)
- User interacts with page (TTI ≤3.5s)
- User makes API call (TTFB ≤500ms)

### Edge Cases

- User on slow 3G connection
- User on mid-tier mobile device
- High load causes performance degradation

## Dependencies

### Technical Dependencies

- Lighthouse CI
- Performance monitoring
- Caching layer
- CDN

### External Dependencies

- CDN provider
- Performance monitoring service

## Constraints

### Technical Constraints

- P95 LCP ≤2.5s
- P95 TTI ≤3.5s
- P95 TTFB ≤500ms
- No regression >10%

### Business Constraints

- Performance budgets enforced in CI
- Mobile performance is critical

## Assumptions

- Users have reasonable network connections
- Devices meet minimum requirements
- Performance monitoring is accurate

## Risks & Issues

- **Risk**: Performance may degrade under load
- **Risk**: Third-party scripts may slow page load
- **Risk**: Mobile performance may be challenging
