# Architecture Decision Record (ADR) Index

**Sources of truth:** PRD, TDD, and QA plan. Status is copied from each ADR file.

| ID | Title | Status | Decision Date | File |
| --- | --- | --- | --- | --- |
| ADR-001 | Adopt URI-based API Versioning with Additive v1 Policy and Deprecation Headers | Accepted | 2025-10-13 | [ADR-001-api-versioning-policy.md](./ADR-001-api-versioning-policy.md) |
| ADR-002 | Authentication & Session Strategy — JWT (RS256) with Refresh Token Rotation and Sliding Sessions | Accepted | 2025-10-13 | [ADR-002-authentication-token-strategy.md](./ADR-002-authentication-token-strategy.md) |
| ADR-003 | Data Retention & GDPR Backup Purge Window | Accepted | 2025-10-14 | [ADR-003-data-retention-and-gdpr-backup-purge.md](./ADR-003-data-retention-and-gdpr-backup-purge.md) |
| ADR-004 | Media Upload Safety & AV Scanning | Accepted | 2025-10-14 | [ADR-004-media-upload-safety-and-av-scanning.md](./ADR-004-media-upload-safety-and-av-scanning.md) |
| ADR-005 | Partitioning Strategy for sessions & audit_log | Accepted | 2025-10-14 | [ADR-005-partitioning-sessions-and-audit-log.md](./ADR-005-partitioning-sessions-and-audit-log.md) |
| ADR-006 | Observability Cardinality Policy | Accepted | 2025-10-14 | [ADR-006-observability-cardinality-policy.md](./ADR-006-observability-cardinality-policy.md) |
| ADR-007 | Idempotency Policy for Writes | Proposed | 2025-10-13 | [ADR-007-idempotency-policy-for-writes.md](./ADR-007-idempotency-policy-for-writes.md) |
| ADR-008 | Materialized Views for Analytics | Proposed | 2025-10-13 | [ADR-008-materialized-views-for-analytics.md](./ADR-008-materialized-views-for-analytics.md) |
| ADR-009 | Global Exercise Library Ownership Model | Proposed | 2025-10-13 | [ADR-009-global-exercise-library-ownership-model.md](./ADR-009-global-exercise-library-ownership-model.md) |
| ADR-010 | Public/Link/Private Visibility Model | Proposed | 2025-10-13 | [ADR-010-public-link-private-visibility-model.md](./ADR-010-public-link-private-visibility-model.md) |
| ADR-011 | ADR-011: Internationalization – Hybrid Model with MVP Static-Only Rollout | Accepted |  | [ADR-011-internationalization-hybrid-approach.md](./ADR-011-internationalization-hybrid-approach.md) |
| ADR-012 | ADR-012: Monorepo Structure, Tooling, and Governance | Accepted |  | [ADR-012-monorepo-structure.md](./ADR-012-monorepo-structure.md) |
| ADR-013 | ADR-013: Modular Backend Architecture (Router → Service → Repository) | Accepted |  | [ADR-013-modular-backend-architecture.md](./ADR-013-modular-backend-architecture.md) |
| ADR-014 | ADR-014: Technology Stack & Runtime Standards | Accepted |  | [ADR-014-technology-stack.md](./ADR-014-technology-stack.md) |
| ADR-015 | ADR-015: API Design & Internationalization (Hybrid) – MVP Static, UGC Translation Feature-Flagged | Accepted |  | [ADR-015-api-design-and-i18n-hybrid.md](./ADR-015-api-design-and-i18n-hybrid.md) |
| ADR-016 | ADR-016: Security Middleware & Audit Logging | Accepted |  | [ADR-016-audit-logging-and-security-middleware.md](./ADR-016-audit-logging-and-security-middleware.md) |
| ADR-017 | ADR-017: Avatar Handling & Media Storage (Object Storage + AV Scan) | Accepted |  | [ADR-017-avatar-handling-base64.md](./ADR-017-avatar-handling-base64.md) |
| ADR-018 | ADR-018: CI/CD with GitHub Actions and GHCR | Accepted |  | [ADR-018-ci-cd-github-ghcr.md](./ADR-018-ci-cd-github-ghcr.md) |
| ADR-019 | ADR-019: Caching & Performance Strategy | Accepted |  | [ADR-019-caching-and-performance-strategy.md](./ADR-019-caching-and-performance-strategy.md) |
| ADR-020 | ADR-020: Accessibility Compliance (WCAG 2.2 AA) & Inclusive UX | Accepted |  | [ADR-020-accessibility-compliance.md](./ADR-020-accessibility-compliance.md) |
| ADR-021 | ADR-021: Standardize Backend Test Runner on Jest 30 + @swc/jest | Deferred | 2025-10-14 | [ADR-021-test-runner-backend-jest30-swc.md](./ADR-021-test-runner-backend-jest30-swc.md) |
| ADR-022 | ADR-022: Comprehensive Lighthouse Testing Across All Categories | Accepted |  | [ADR-022-lighthouse-comprehensive-testing.md](./ADR-022-lighthouse-comprehensive-testing.md) |
| ADR-023 | ADR-023: Server-Side Rendering (SSR) Implementation | Accepted |  | [ADR-023-server-side-rendering.md](./ADR-023-server-side-rendering.md) |
| ADR-024 | ADR-024: Legal Document Version Calculation from Multi-Language Translations | Accepted |  | [ADR-024-legal-document-version-calculation.md](./ADR-024-legal-document-version-calculation.md) |
| ADR-025 | ADR-025: Lower Lighthouse CI Thresholds by 15% | Accepted |  | [ADR-025-lighthouse-ci-thresholds.md](./ADR-025-lighthouse-ci-thresholds.md) |
| ADR-026 | ADR-026: Database Encryption (In Transit and At Rest) | Accepted |  | [ADR-026-database-encryption.md](./ADR-026-database-encryption.md) |
| ADR-027 | Enforce Authentication Wall (pre-login access limited to auth and legal routes) | Accepted | 2025-10-26 | [ADR-027-auth-wall.md](./ADR-027-auth-wall.md) |

## Numbering notes

- ADR-021 is the Jest 30 proposal (**Deferred**; backend remains Jest 29 + ts-jest).
- ADR-023 is Server-Side Rendering.
- ADR-026 is Database Encryption (formerly a duplicate ADR-023).
- ADR-027 is the Auth Wall (formerly ADR-0021).
