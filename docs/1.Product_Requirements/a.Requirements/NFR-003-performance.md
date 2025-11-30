# NFR-003 — Performance

---

**Requirement ID**: NFR-003  
**Type**: Non-Functional Requirement  
**Title**: Performance  
**Status**: Progressing  
**Priority**: High  
**Gate**: GOLD  
**Owner**: ENG  
**Created**: 2025-11-21  
**Updated**: 2025-01-21

---

## Executive Summary

This non-functional requirement defines performance standards and constraints for the FitVibe platform.

Ensure fast, responsive user experience across devices and network conditions.

## Business Context

- **Business Objective**: Ensure fast, responsive user experience across devices and network conditions.
- **Success Criteria**: Core Web Vitals meet targets, API responses are fast, and no regressions >10% across releases.
- **Target Users**: All users (performance affects everyone)

## Traceability

- **PRD Reference**: PRD §Perf
- **TDD Reference**: TDD §Perf

## Non-Functional Requirements

### Core Web Vitals

The system shall meet Core Web Vitals targets:

- **LCP**: Largest Contentful Paint p95 ≤2.5s on Dashboard and Planner
- **CLS**: Cumulative Layout Shift ≤0.1
- **TTI**: Time to Interactive p95 ≤3.5s on mid-tier mobile (Moto G4 class)
- **TTFB**: Time to First Byte p95 ≤500ms for authenticated HTML/API responses

### API Performance

- **Latency Budgets**: Per-endpoint budgets met (Auth ≤200ms, CRUD ≤300ms, Analytics ≤600ms, Feed ≤400ms p95)
- **Database Optimization**: Queries optimized with proper indexes; slow query threshold 200ms
- **Caching**: Read-through caching for heavy queries (feed, progress); cache TTL 60s default

### Frontend Performance

- **Bundle Size**: JS bundle size ≤300KB gzipped
- **Code Splitting**: Code splitting for non-critical routes; lazy loading mandatory
- **Critical CSS**: Critical CSS inlined

### Performance Monitoring

- **Regression Guard**: No regression >10% from baseline blocks release
- **Lighthouse CI**: Lighthouse CI runs per PR with budget enforcement
- **Performance Metrics**: Metrics exposed via Prometheus and Grafana dashboards

## Related Epics

- [E7: Performance Optimization](../b.Epics/E7-performance-optimization.md)

## Dependencies

### Technical Dependencies

- Lighthouse CI
- Performance monitoring
- Caching system
- Database optimization tools

### Feature Dependencies

- [FR-011: Sharing & Community](./FR-011-sharing-and-community.md) - Feed performance
- [FR-007: Analytics & Export](./FR-007-analytics-and-export.md) - Analytics performance
- [NFR-007: Observability](./NFR-007-observability.md) - Performance metrics

## Constraints

### Technical Constraints

- LCP p95 ≤2.5s
- CLS ≤0.1
- TTI p95 ≤3.5s
- TTFB p95 ≤500ms
- Bundle size ≤300KB gzipped

### Business Constraints

- No performance regression >10% from baseline
- Performance must not degrade user experience

## Assumptions

- Users have reasonable network connectivity
- Devices meet minimum requirements
- Performance monitoring is accurate

## Risks & Issues

- **Risk**: Performance may degrade with scale
- **Risk**: Third-party dependencies may impact performance
- **Risk**: Performance targets may be difficult to meet

## Open Questions

- What are acceptable performance targets for different user segments?
- Should there be different targets for different features?

## Related Requirements

- [FR-011: Sharing & Community](./FR-011-sharing-and-community.md) - Feed performance
- [FR-007: Analytics & Export](./FR-007-analytics-and-export.md) - Analytics performance
- [NFR-007: Observability](./NFR-007-observability.md) - Performance monitoring

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
