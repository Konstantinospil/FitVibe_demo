# FitVibe Project Epics and Activities

**Version**: 1.0
**Created**: 2025-01-21
**Status**: Planning
**Owner**: Development Team

---

## Overview

This document defines the epics and activities for the FitVibe V2 project based on the Product Requirements Document (PRD), Technical Design Document (TDD), and current implementation status.

### Difficulty Scale

- **1 - Trivial**: Simple bug fix, small refactor, documentation update
- **2 - Easy**: Straightforward feature, well-defined scope, minimal dependencies
- **3 - Medium**: Moderate complexity, some unknowns, multiple components
- **4 - Hard**: Complex feature, multiple integrations, architectural considerations
- **5 - Very Hard**: Major architectural changes, high risk, extensive refactoring

---

## Epic 1: Profile & Settings (FR-009)

**Status**: Open
**Priority**: Medium
**Gate**: SILVER
**Estimated Total Effort**: 8-12 story points

### Activities

| ID    | Activity                    | Description                                                                                         | Difficulty | Dependencies   |
| ----- | --------------------------- | --------------------------------------------------------------------------------------------------- | ---------- | -------------- |
| E1-A1 | Profile Edit API            | Implement backend API for editing profile fields (alias, weight, fitness level, training frequency) | 2          | FR-001, FR-002 |
| E1-A2 | Profile Validation          | Add Zod schemas and validation for profile fields (weight range, alias uniqueness)                  | 2          | E1-A1          |
| E1-A3 | Immutable Fields Protection | Enforce immutability for date_of_birth and gender at API and database level                         | 2          | E1-A1          |
| E1-A4 | Avatar Upload Backend       | Implement avatar upload endpoint with file validation (size, MIME type) and AV scanning             | 3          | E1-A1, NFR-001 |
| E1-A5 | Avatar Preview Generation   | Generate 128×128 preview images from uploaded avatars                                               | 3          | E1-A4          |
| E1-A6 | Profile Edit Frontend       | Create profile edit UI with form validation and error handling                                      | 3          | E1-A1, E1-A2   |
| E1-A7 | Avatar Upload Frontend      | Implement avatar upload UI with preview and progress indicator                                      | 2          | E1-A4, E1-A5   |
| E1-A8 | Profile Tests               | Write integration and E2E tests for profile editing and avatar upload                               | 2          | E1-A1, E1-A6   |

---

## Epic 2: Exercise Library (FR-010)

**Status**: Open
**Priority**: Medium
**Gate**: SILVER
**Estimated Total Effort**: 10-15 story points

### Activities

| ID    | Activity                         | Description                                                                                   | Difficulty | Dependencies          |
| ----- | -------------------------------- | --------------------------------------------------------------------------------------------- | ---------- | --------------------- |
| E2-A1 | Exercise CRUD API                | Implement backend API for creating, reading, updating exercises                               | 2          | FR-001, FR-002        |
| E2-A2 | Exercise Archival                | Implement archive functionality (soft delete) that hides from selectors but preserves history | 2          | E2-A1                 |
| E2-A3 | Exercise Visibility Model        | Implement private/public visibility with proper access control                                | 2          | E2-A1, FR-008         |
| E2-A4 | Exercise Search & Discovery      | Implement search and filtering for public exercises (name, category, muscle group, tags)      | 3          | E2-A1, E2-A3          |
| E2-A5 | Exercise Snapshot on Session Use | Store exercise name snapshot in session_exercises when used in sessions                       | 2          | E2-A1, FR-004         |
| E2-A6 | Global Exercise Management       | Implement admin-only global exercise creation and management                                  | 2          | E2-A1, FR-008         |
| E2-A7 | Exercise Library Frontend        | Create exercise library UI with CRUD, search, and filtering                                   | 4          | E2-A1, E2-A4          |
| E2-A8 | Exercise Selector Integration    | Integrate exercise library into planner and logger exercise selectors                         | 3          | E2-A7, FR-004, FR-005 |
| E2-A9 | Exercise Tests                   | Write integration and E2E tests for exercise management and archival                          | 2          | E2-A1, E2-A7          |

---

## Epic 3: Sharing & Community (FR-011)

**Status**: Open
**Priority**: Medium
**Gate**: SILVER
**Estimated Total Effort**: 15-20 story points

### Activities

| ID     | Activity                     | Description                                                                  | Difficulty | Dependencies               |
| ------ | ---------------------------- | ---------------------------------------------------------------------------- | ---------- | -------------------------- |
| E3-A1  | Public Feed API              | Implement authenticated public feed API with pagination, search, and sorting | 3          | FR-001, FR-002, FR-004     |
| E3-A2  | Session Visibility Toggle    | Implement session visibility toggle (private/public) with privacy safeguards | 2          | FR-004, NFR-002            |
| E3-A3  | Like/Unlike API              | Implement like/unlike functionality for public sessions                      | 2          | E3-A1                      |
| E3-A4  | Bookmark API                 | Implement bookmark/unbookmark functionality for sessions                     | 2          | E3-A1                      |
| E3-A5  | Comments API                 | Implement comment CRUD for public sessions (plain text, 500 char max)        | 3          | E3-A1                      |
| E3-A6  | Follow/Unfollow API          | Implement follow/unfollow functionality with follower counts                 | 2          | FR-009                     |
| E3-A7  | Session Cloning              | Implement session cloning with attribution preservation                      | 3          | FR-004, E3-A1              |
| E3-A8  | Content Reporting            | Implement content reporting system with admin queue                          | 3          | E3-A1, FR-008              |
| E3-A9  | Feed Frontend                | Create public feed UI with pagination, search, and sorting                   | 4          | E3-A1                      |
| E3-A10 | Social Interactions Frontend | Implement like, bookmark, comment, and follow UI components                  | 3          | E3-A3, E3-A4, E3-A5, E3-A6 |
| E3-A11 | Session Cloning Frontend     | Add clone button and flow to session detail pages                            | 2          | E3-A7, FR-004              |
| E3-A12 | Social Features Tests        | Write integration and E2E tests for all social features                      | 3          | E3-A9, E3-A10              |

---

## Epic 4: Planner Completion (FR-004)

**Status**: Progressing
**Priority**: Medium
**Gate**: SILVER
**Estimated Total Effort**: 12-18 story points

### Activities

| ID    | Activity                             | Description                                                                     | Difficulty | Dependencies   |
| ----- | ------------------------------------ | ------------------------------------------------------------------------------- | ---------- | -------------- |
| E4-A1 | Plan CRUD API                        | Complete plan creation, editing, and deletion API                               | 2          | FR-001, FR-002 |
| E4-A2 | Plan Activation & Session Generation | Implement plan activation that generates scheduled sessions based on recurrence | 4          | E4-A1, FR-004  |
| E4-A3 | Plan Progress Tracking               | Implement progress tracking for plans (completed vs planned sessions)           | 3          | E4-A1, E4-A2   |
| E4-A4 | Drag-and-Drop Calendar               | Implement drag-and-drop scheduling in calendar view                             | 4          | E4-A1, FR-004  |
| E4-A5 | Conflict Detection                   | Implement client and server-side conflict detection for overlapping sessions    | 3          | E4-A4          |
| E4-A6 | Planner Frontend                     | Complete planner UI with calendar view, plan management, and conflict handling  | 4          | E4-A1, E4-A4   |
| E4-A7 | Mobile Touch Gestures                | Implement mobile-friendly drag/resize with touch gestures                       | 3          | E4-A4          |
| E4-A8 | Planner Tests                        | Write E2E tests for planner including drag-and-drop and conflict detection      | 3          | E4-A6          |

---

## Epic 5: Logging & Import (FR-005)

**Status**: Progressing
**Priority**: Medium
**Gate**: SILVER
**Estimated Total Effort**: 10-15 story points

### Activities

| ID    | Activity                | Description                                                               | Difficulty | Dependencies |
| ----- | ----------------------- | ------------------------------------------------------------------------- | ---------- | ------------ |
| E5-A1 | Session Logging API     | Complete session logging API with actual metrics recording                | 2          | FR-004       |
| E5-A2 | GPX Parser              | Implement GPX file parser with validation and error handling              | 3          | E5-A1        |
| E5-A3 | FIT Parser              | Implement FIT file parser with GPS/HR metadata and timezone normalization | 4          | E5-A1        |
| E5-A4 | File Import API         | Implement file upload and import endpoint with validation                 | 3          | E5-A2, E5-A3 |
| E5-A5 | Metric Recalculation    | Implement derived metric recalculation (pace, elevation) with idempotency | 3          | E5-A1        |
| E5-A6 | Offline Logging Support | Implement offline logging with sync on reconnect (PWA)                    | 4          | E5-A1        |
| E5-A7 | Logger Frontend         | Complete logger UI with manual entry and file import                      | 3          | E5-A1, E5-A4 |
| E5-A8 | Import Tests            | Write fuzz tests and fixtures for GPX/FIT parsers                         | 3          | E5-A2, E5-A3 |

---

## Epic 6: Privacy & GDPR (NFR-002)

**Status**: Progressing
**Priority**: High
**Gate**: GOLD
**Estimated Total Effort**: 8-12 story points

### Activities

| ID    | Activity            | Description                                                   | Difficulty | Dependencies  |
| ----- | ------------------- | ------------------------------------------------------------- | ---------- | ------------- |
| E6-A1 | Data Export API     | Implement GDPR data export endpoint (JSON bundle)             | 2          | FR-001        |
| E6-A1 | Data Deletion API   | Complete GDPR data deletion flow with 14-day propagation      | 3          | FR-001, E6-A1 |
| E6-A3 | Consent Management  | Implement consent management UI and backend tracking          | 3          | FR-001        |
| E6-A4 | Privacy Settings UI | Create privacy settings UI for profile and content visibility | 2          | FR-009, E3-A2 |
| E6-A5 | Audit Logging       | Enhance audit logging for GDPR events (export, deletion)      | 2          | FR-008        |
| E6-A6 | Privacy Tests       | Write integration tests for GDPR flows                        | 2          | E6-A1, E6-A2  |

---

## Epic 7: Performance Optimization (NFR-003)

**Status**: Progressing
**Priority**: High
**Gate**: GOLD
**Estimated Total Effort**: 10-15 story points

### Activities

| ID    | Activity                     | Description                                                                | Difficulty | Dependencies  |
| ----- | ---------------------------- | -------------------------------------------------------------------------- | ---------- | ------------- |
| E7-A1 | API Latency Optimization     | Optimize slow endpoints to meet p95 < 300ms target                         | 3          | All modules   |
| E7-A2 | Database Query Optimization  | Optimize slow queries, add missing indexes, implement partitioning         | 4          | All modules   |
| E7-A3 | Frontend Bundle Optimization | Reduce JS bundle size to < 300KB gzipped                                   | 3          | Frontend      |
| E7-A4 | Frontend Performance         | Optimize LCP, CLS, TTI to meet targets (LCP < 2.5s, CLS < 0.1, TTI < 3.0s) | 4          | Frontend      |
| E7-A5 | Caching Strategy             | Implement read-through caching for heavy queries (feed, progress)          | 3          | E3-A1, FR-007 |
| E7-A6 | Materialized Views           | Create and maintain materialized views for analytics                       | 3          | FR-007        |
| E7-A7 | Performance Tests            | Set up k6 load tests and Lighthouse CI budgets                             | 3          | All modules   |
| E7-A8 | Performance Monitoring       | Add performance metrics and dashboards                                     | 2          | NFR-007       |

---

## Epic 8: Accessibility (NFR-004)

**Status**: Progressing
**Priority**: High
**Gate**: GOLD
**Estimated Total Effort**: 8-12 story points

### Activities

| ID    | Activity              | Description                                                      | Difficulty | Dependencies |
| ----- | --------------------- | ---------------------------------------------------------------- | ---------- | ------------ |
| E8-A1 | ARIA Labels Audit     | Audit and add missing ARIA labels to all interactive elements    | 2          | All frontend |
| E8-A2 | Keyboard Navigation   | Ensure all features are keyboard accessible                      | 3          | All frontend |
| E8-A3 | Color Contrast        | Fix color contrast issues to meet WCAG 2.1 AA standards          | 2          | Frontend     |
| E8-A4 | Screen Reader Testing | Test with screen readers and fix issues                          | 3          | All frontend |
| E8-A5 | Focus Management      | Implement proper focus management for modals and dynamic content | 2          | All frontend |
| E8-A6 | Accessibility Tests   | Add automated accessibility tests (axe-core) to CI               | 2          | All frontend |
| E8-A7 | Lighthouse A11y Audit | Achieve 100% Lighthouse accessibility score                      | 2          | All frontend |

---

## Epic 9: Observability (NFR-007)

**Status**: Open
**Priority**: Medium
**Gate**: SILVER
**Estimated Total Effort**: 6-10 story points

### Activities

| ID    | Activity              | Description                                                               | Difficulty | Dependencies |
| ----- | --------------------- | ------------------------------------------------------------------------- | ---------- | ------------ |
| E9-A1 | Structured Logging    | Implement structured JSON logging with correlation IDs                    | 2          | All modules  |
| E9-A2 | Prometheus Metrics    | Add Prometheus metrics for all endpoints and key operations               | 3          | All modules  |
| E9-A3 | OpenTelemetry Tracing | Implement OpenTelemetry tracing with proper sampling                      | 3          | All modules  |
| E9-A4 | Grafana Dashboards    | Create Grafana dashboards for API latency, error rates, DB health         | 2          | E9-A2        |
| E9-A5 | Alerting Rules        | Set up alerting rules for critical metrics (5xx spikes, latency breaches) | 2          | E9-A2, E9-A4 |
| E9-A6 | Log Aggregation       | Set up log aggregation pipeline (Loki or similar)                         | 3          | E9-A1        |

---

## Epic 10: Availability & Backups (NFR-005)

**Status**: Progressing
**Priority**: High
**Gate**: SILVER
**Estimated Total Effort**: 6-10 story points

### Activities

| ID     | Activity                 | Description                                    | Difficulty | Dependencies   |
| ------ | ------------------------ | ---------------------------------------------- | ---------- | -------------- |
| E10-A1 | Backup Automation        | Implement automated daily encrypted backups    | 3          | Infrastructure |
| E10-A2 | Backup Testing           | Set up quarterly restore tests                 | 2          | E10-A1         |
| E10-A3 | DR Procedures            | Document and test disaster recovery procedures | 3          | E10-A1         |
| E10-A4 | Health Check Enhancement | Enhance health check endpoints for monitoring  | 2          | Infrastructure |
| E10-A5 | Read-Only Mode           | Implement read-only mode for maintenance       | 2          | System module  |

---

## Epic 11: Technical Debt & Code Quality

**Status**: Open
**Priority**: Medium
**Gate**: N/A
**Estimated Total Effort**: 4-6 story points

### Activities

| ID     | Activity                    | Description                                                     | Difficulty | Dependencies |
| ------ | --------------------------- | --------------------------------------------------------------- | ---------- | ------------ |
| E11-A1 | Fix 2FA Route Conflict      | Remove duplicate 2FA routes and dead code (twofa.controller.ts) | 1          | Auth module  |
| E11-A2 | Review Skipped Tests        | Review and fix or document 62 skipped tests across 22 files     | 2          | Test suite   |
| E11-A3 | Standardize Timer Cleanup   | Standardize timer cleanup patterns across tests                 | 1          | Test suite   |
| E11-A4 | Database Connection Cleanup | Review and improve database connection cleanup in tests         | 2          | Test suite   |
| E11-A5 | Code Documentation          | Add missing JSDoc comments and improve code documentation       | 2          | All modules  |

---

## Epic 12: Coach Training Unit Assignment (FR-012)

**Status**: Open
**Priority**: High
**Gate**: SILVER
**Estimated Total Effort**: 15-20 story points

### Activities

| ID      | Activity                          | Description                                                                                                 | Difficulty | Dependencies                   |
| ------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------ |
| E12-A1  | Coach-Athlete Relationship API    | Implement consent-based coach-athlete relationship management (create, list, revoke)                        | 3          | FR-001, FR-002, FR-008         |
| E12-A2  | Training Unit Data Model          | Create training_units table and migration with exercises, repeat count, and metadata                        | 2          | FR-010                         |
| E12-A3  | Training Unit CRUD API            | Implement backend API for creating, reading, updating, and archiving training units                         | 3          | E12-A2, FR-010                 |
| E12-A4  | Exercise Repeat/Rounds Logic      | Implement logic to duplicate exercises based on repeat count when creating sessions                         | 2          | E12-A3, FR-004                 |
| E12-A5  | Training Unit Assignment API      | Implement API endpoint for assigning training units to athletes with date selection                         | 4          | E12-A1, E12-A3, E12-A4, FR-004 |
| E12-A6  | Exercise Modification API         | Implement API support for modifying exercise parameters (weight, substitution, intensity) during assignment | 3          | E12-A5, FR-010                 |
| E12-A7  | Bulk Assignment API               | Implement bulk assignment endpoint for assigning to multiple athletes efficiently                           | 3          | E12-A5                         |
| E12-A8  | Training Unit Library Frontend    | Create training unit library UI with CRUD, search, and list views                                           | 4          | E12-A3                         |
| E12-A9  | Training Unit Creation Frontend   | Create training unit creation/editing UI with exercise management and repeat count                          | 4          | E12-A3, E12-A4                 |
| E12-A10 | Assignment Frontend               | Create assignment UI with athlete selection, date picker, and modification interface                        | 4          | E12-A5, E12-A6, E12-A7         |
| E12-A11 | Coach-Athlete Management Frontend | Create UI for managing coach-athlete relationships and athlete list                                         | 3          | E12-A1                         |
| E12-A12 | Assignment History Frontend       | Create UI for viewing assignment history and completion tracking                                            | 3          | E12-A5                         |
| E12-A13 | Training Unit Tests               | Write integration and E2E tests for training unit CRUD and assignment                                       | 3          | E12-A3, E12-A5                 |
| E12-A14 | Coach-Athlete Relationship Tests  | Write tests for relationship management and access control                                                  | 2          | E12-A1                         |

---

## Summary Statistics

### By Epic Status

- **Open**: 6 epics (E1, E2, E3, E9, E11, E12)
- **Progressing**: 5 epics (E4, E5, E6, E7, E8, E10)

### By Priority

- **High**: 5 epics (E6, E7, E8, E10, E12)
- **Medium**: 7 epics (E1, E2, E3, E4, E5, E9, E11)

### Total Activities

- **Total**: 109 activities
- **Trivial (1)**: 2 activities
- **Easy (2)**: 33 activities
- **Medium (3)**: 45 activities
- **Hard (4)**: 26 activities
- **Very Hard (5)**: 3 activities

### Estimated Total Effort

- **Total Story Points**: 112-173 story points
- **Average per Epic**: 8-14 story points

---

## Next Steps

1. Review and prioritize epics based on business value and dependencies
2. Break down epics into sprint-sized user stories
3. Assign story points and create sprint plan
4. Set up GitHub project board with columns: Backlog, To Do, In Progress, Review, Done
5. Create issues for each activity with proper labels and milestones

---

**Last Updated**: 2025-11-23
**Next Review**: 2025-12-01
