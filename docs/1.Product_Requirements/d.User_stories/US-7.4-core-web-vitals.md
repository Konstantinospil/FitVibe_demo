# US-7.4: Core Web Vitals

---

**Story ID**: US-7.4  
**Epic ID**: [E7](../b.Epics/E7-performance-optimization.md)  
**Title**: Core Web Vitals  
**Status**: Proposed  
**Story Points**: 5  
**Priority**: High  
**Created**: 2025-01-21  
**Updated**: 2025-01-21

---

## User Story

**As a** user  
**I want** the application to load and interact quickly  
**So that** I have a smooth and responsive experience

## Description

Frontend performance metrics must meet targets: LCP ≤2.5s, CLS ≤0.1, TTI ≤3.0s on mid-tier device, 4G connection. Performance regression >10% from baseline blocks release. Lighthouse CI runs per PR with budget enforcement.

## Related Acceptance Criteria

- [US-7.4-AC01](../e.Acceptance_Criteria/US-7.4-AC01.md): Core Web Vitals targets
- [US-7.4-AC02](../e.Acceptance_Criteria/US-7.4-AC02.md): Performance regression prevention

## Dependencies

### Story Dependencies

- [NFR-003: Performance](../a.Requirements/NFR-003-performance.md): Parent requirement

## Technical Notes

- Core Web Vitals monitoring
- Lighthouse CI integration
- Performance baseline establishment

## Test Strategy

- Lighthouse performance tests
- Web Vitals measurement
- Regression detection

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code implemented and reviewed
- [ ] Tests written and passing (≥80% coverage)
- [ ] Documentation updated
- [ ] Evidence collected for all ACs

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
