# FitVibe Project Epics and Activities

**Version**: 1.1
**Created**: 2025-11-21
**Last Updated**: 2025-12-13
**Status**: Active
**Owner**: Development Team

---

## Overview

This document defines the epics and activities for the FitVibe V2 project based on the Product Requirements Document (PRD), Technical Design Document (TDD), and current implementation status. Activity status is determined by verifying implementation against user stories and their acceptance criteria.

### Verification Methodology

Activity status is determined through:
1. **User Story Mapping**: Each activity maps to one or more user stories (US-*)
2. **Acceptance Criteria Verification**: Implementation verified against acceptance criteria (AC-*)
3. **Code Review**: Actual codebase checked for required functionality
4. **Test Coverage**: Test existence and coverage considered

**Status Definitions**:
- **✅ Complete**: All related user story acceptance criteria are met, code is implemented, and functionality verified
- **🚧 In Progress**: Partial implementation exists, some acceptance criteria met, work ongoing
- **⏳ Pending**: No implementation found, or user stories not yet started

### Difficulty Scale

- **1 - Trivial**: Simple bug fix, small refactor, documentation update
- **2 - Easy**: Straightforward feature, well-defined scope, minimal dependencies
- **3 - Medium**: Moderate complexity, some unknowns, multiple components
- **4 - Hard**: Complex feature, multiple integrations, architectural considerations
- **5 - Very Hard**: Major architectural changes, high risk, extensive refactoring

### Activity Status Symbols

- **✅ Complete**: Activity is fully implemented and tested
- **🚧 In Progress**: Activity is currently being worked on
- **⏳ Pending**: Activity is planned but not yet started

---

## Epic 1: Profile & Settings (FR-009)

**Status**: Progressing
**Priority**: Medium
**Gate**: SILVER
**Estimated Total Effort**: 8-12 story points

**Related User Stories**: US-1.1 (Profile Editing), US-1.2 (Avatar Upload), US-1.3 (Profile Testing)

### Activities

| ID    | Activity                    | Description                                                                                         | Difficulty | Dependencies   | Status      | Verification Notes                                                      |
| ----- | --------------------------- | --------------------------------------------------------------------------------------------------- | ---------- | -------------- | ----------- | ------------------------------------------------------------------------- |
| E1-A1 | Profile Edit API            | Implement backend API for editing profile fields (alias, weight, fitness level, training frequency) | 2          | FR-001, FR-002 | ✅ Complete | US-1.1-AC01: PATCH /api/v1/users/me implemented with validation         |
| E1-A2 | Profile Validation          | Add Zod schemas and validation for profile fields (weight range, alias uniqueness)                  | 2          | E1-A1          | ✅ Complete | US-1.1-AC02: Zod validation schemas implemented (alias max 50, weight 20-500kg) |
| E1-A3 | Immutable Fields Protection | Enforce immutability for date_of_birth and gender at API and database level                         | 2          | E1-A1          | ✅ Complete | US-1.1-AC03: Immutable field protection implemented                     |
| E1-A4 | Avatar Upload Backend       | Implement avatar upload endpoint with file validation (size, MIME type) and AV scanning             | 3          | E1-A1, NFR-001 | ✅ Complete | US-1.2-AC01, AC02: POST /api/v1/users/avatar with validation and AV scanning |
| E1-A5 | Avatar Preview Generation   | Generate 128×128 preview images from uploaded avatars                                               | 3          | E1-A4          | ✅ Complete | US-1.2-AC03: 128×128 preview generation implemented                      |
| E1-A6 | Profile Edit Frontend       | Create profile edit UI with form validation and error handling                                      | 3          | E1-A1, E1-A2   | 🚧 In Progress |
| E1-A7 | Avatar Upload Frontend      | Implement avatar upload UI with preview and progress indicator                                      | 2          | E1-A4, E1-A5   | 🚧 In Progress |
| E1-A8 | Profile Tests               | Write integration and E2E tests for profile editing and avatar upload                               | 2          | E1-A1, E1-A6   | ⏳ Pending   |

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

**Status**: Progressing
**Priority**: Medium
**Gate**: SILVER
**Estimated Total Effort**: 15-20 story points

**Related User Stories**: US-3.1 (Public Feed), US-3.2 (Session Visibility), US-3.3 (Likes & Bookmarks), US-3.4 (Comments), US-3.5 (User Following), US-3.6 (Session Cloning), US-3.7 (Content Reporting), US-3.8 (Social Testing)

### Activities

| ID     | Activity                     | Description                                                                  | Difficulty | Dependencies               | Status      | Verification Notes                                                      |
| ------ | ---------------------------- | ---------------------------------------------------------------------------- | ---------- | -------------------------- | ----------- | ------------------------------------------------------------------------- |
| E3-A1  | Public Feed API              | Implement authenticated public feed API with pagination, search, and sorting | 3          | FR-001, FR-002, FR-004     | ✅ Complete | US-3.1-AC01: GET /api/v1/feed with pagination (default 20, max 100)      |
| E3-A2  | Session Visibility Toggle    | Implement session visibility toggle (private/public) with privacy safeguards | 2          | FR-004, NFR-002            | ✅ Complete | US-3.2: Session visibility toggle implemented                            |
| E3-A3  | Like/Unlike API              | Implement like/unlike functionality for public sessions                      | 2          | E3-A1                      | ✅ Complete | US-3.3-AC01: POST/DELETE /api/v1/feed/item/:id/like with idempotency     |
| E3-A4  | Bookmark API                 | Implement bookmark/unbookmark functionality for sessions                     | 2          | E3-A1                      | ✅ Complete | US-3.3-AC03: POST/DELETE /api/v1/sessions/:id/bookmark implemented       |
| E3-A5  | Comments API                 | Implement comment CRUD for public sessions (plain text, 500 char max)        | 3          | E3-A1                      | ✅ Complete | US-3.4-AC01: Comment CRUD with 500 char limit implemented                |
| E3-A6  | Follow/Unfollow API          | Implement follow/unfollow functionality with follower counts                 | 2          | FR-009                     | ✅ Complete | US-3.5-AC01: POST/DELETE /api/v1/users/:alias/follow implemented         |
| E3-A7  | Session Cloning              | Implement session cloning with attribution preservation                      | 3          | FR-004, E3-A1              | ✅ Complete | US-3.6: Session cloning with attribution implemented                     |
| E3-A8  | Content Reporting            | Implement content reporting system with admin queue                          | 3          | E3-A1, FR-008              | ✅ Complete | US-3.7: Content reporting system implemented                             |
| E3-A9  | Feed Frontend                | Create public feed UI with pagination, search, and sorting                   | 4          | E3-A1                      | ✅ Complete |
| E3-A10 | Social Interactions Frontend | Implement like, bookmark, comment, and follow UI components                  | 3          | E3-A3, E3-A4, E3-A5, E3-A6 | 🚧 In Progress |
| E3-A11 | Session Cloning Frontend     | Add clone button and flow to session detail pages                            | 2          | E3-A7, FR-004              | 🚧 In Progress |
| E3-A12 | Social Features Tests        | Write integration and E2E tests for all social features                      | 3          | E3-A9, E3-A10              | ⏳ Pending   |

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

**Related User Stories**: US-6.1 (Data Export), US-6.2 (Account Deletion), US-6.3 (Consent Management), US-6.4 (Privacy Settings), US-6.5 (Audit Logging), US-6.6 (GDPR Testing)

### Activities

| ID    | Activity            | Description                                                   | Difficulty | Dependencies  | Status      | Verification Notes                                                      |
| ----- | ------------------- | ------------------------------------------------------------- | ---------- | ------------- | ----------- | ------------------------------------------------------------------------- |
| E6-A1 | Data Export API     | Implement GDPR data export endpoint (JSON bundle)             | 2          | FR-001        | ✅ Complete | US-6.1-AC01: GET /api/v1/users/me/export with JSON bundle implemented   |
| E6-A2 | Data Deletion API   | Complete GDPR data deletion flow with 14-day propagation      | 3          | FR-001, E6-A1 | ✅ Complete | US-6.2-AC01, AC02: DELETE /api/v1/users/me with 14-day backup purge     |
| E6-A3 | Consent Management  | Implement consent management UI and backend tracking          | 3          | FR-001        | ⏳ Pending   | US-6.3: Not yet implemented                                               |
| E6-A4 | Privacy Settings UI | Create privacy settings UI for profile and content visibility | 2          | FR-009, E3-A2 | 🚧 In Progress | US-6.4: Partial implementation in Settings page                          |
| E6-A5 | Audit Logging       | Enhance audit logging for GDPR events (export, deletion)      | 2          | FR-008        | ✅ Complete | US-6.5: Audit logging for GDPR events implemented                        |
| E6-A6 | Privacy Tests       | Write integration tests for GDPR flows                        | 2          | E6-A1, E6-A2  | ⏳ Pending   |

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

**Status**: Progressing
**Priority**: Medium
**Gate**: SILVER
**Estimated Total Effort**: 6-10 story points

**Related User Stories**: US-9.1 (Structured Logging), US-9.2 (Prometheus Metrics), US-9.3 (OpenTelemetry Tracing), US-9.4 (Grafana Dashboards), US-9.5 (Alerting Rules), US-9.6 (Log Aggregation)

### Activities

| ID    | Activity              | Description                                                               | Difficulty | Dependencies | Status      | Verification Notes                                                      |
| ----- | --------------------- | ------------------------------------------------------------------------- | ---------- | ------------ | ----------- | ------------------------------------------------------------------------- |
| E9-A1 | Structured Logging    | Implement structured JSON logging with correlation IDs                    | 2          | All modules  | ✅ Complete | US-9.1-AC01: Pino structured JSON logging with correlation IDs           |
| E9-A2 | Prometheus Metrics    | Add Prometheus metrics for all endpoints and key operations               | 3          | All modules  | ✅ Complete | US-9.2-AC01: http_request_duration_seconds and http_requests_total implemented |
| E9-A3 | OpenTelemetry Tracing | Implement OpenTelemetry tracing with proper sampling                      | 3          | All modules  | 🚧 In Progress | US-9.3: Tracing SDK exists but not fully integrated                      |
| E9-A4 | Grafana Dashboards    | Create Grafana dashboards for API latency, error rates, DB health         | 2          | E9-A2        | ✅ Complete | US-9.4: Grafana dashboards configured                                    |
| E9-A5 | Alerting Rules        | Set up alerting rules for critical metrics (5xx spikes, latency breaches) | 2          | E9-A2, E9-A4 | ⏳ Pending   | US-9.5: Alerting rules not yet configured                                 |
| E9-A6 | Log Aggregation       | Set up log aggregation pipeline (Loki or similar)                         | 3          | E9-A1        | ✅ Complete | US-9.6: Loki log aggregation configured                                   |

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

## Epic 13: WCAG 2.2 Compliance Update (NFR-004 Enhancement)

**Status**: Open
**Priority**: High
**Gate**: GOLD
**Estimated Total Effort**: 6-10 story points
**Related Epic**: Epic 8 (Accessibility)

### Description

Update FitVibe's accessibility compliance from WCAG 2.1 AA to WCAG 2.2 AA by implementing the 9 new success criteria introduced in WCAG 2.2 (released October 2023). This epic enhances the existing accessibility work in Epic 8 with the latest standards.

### Acceptance Criteria

#### AC-13-1: Documentation Updated

- [ ] Visual Design System updated to reference WCAG 2.2 AA instead of 2.1 AA
- [ ] All accessibility documentation reflects WCAG 2.2 requirements
- [ ] ADR-020 and NFR-004 updated to reference WCAG 2.2
- [ ] New status messages pattern documented in design system

#### AC-13-2: Focus Not Obscured (2.4.11)

- [ ] All focus indicators are visible and not hidden by sticky headers, modals, or overlays
- [ ] Focus indicators meet minimum 2px visibility requirement
- [ ] Z-index guidelines documented for focusable elements
- [ ] Automated tests verify focus visibility

#### AC-13-3: Dragging Movements (2.5.7)

- [ ] All drag-and-drop operations in Planner have keyboard alternatives
- [ ] Keyboard navigation documented for all draggable elements
- [ ] Arrow keys and Enter/Space activate drag operations via keyboard
- [ ] E2E tests verify keyboard alternatives work

#### AC-13-4: Target Size (2.5.8)

- [ ] All pointer targets meet minimum 24×24 CSS pixels
- [ ] Design system explicitly documents 24×24 minimum (current 44×44 exceeds requirement)
- [ ] Exceptions documented (inline links, essential targets)
- [ ] Automated tests verify target sizes

#### AC-13-5: Consistent Help (3.2.6)

- [ ] Help mechanisms (help links, contact forms) appear in consistent location
- [ ] Help placement pattern documented in design system
- [ ] Manual audit confirms consistency across pages

#### AC-13-6: Redundant Entry (3.3.7)

- [ ] Form data persists on validation errors
- [ ] Multi-step forms preserve entered data
- [ ] Auto-population patterns documented
- [ ] E2E tests verify data persistence

#### AC-13-7: Accessible Authentication (3.3.8)

- [ ] No cognitive function tests (CAPTCHA, puzzles) in authentication flows
- [ ] Authentication patterns documented
- [ ] If CAPTCHA is added, alternative authentication must be available
- [ ] Manual audit confirms compliance

#### AC-13-8: Status Messages (4.1.3)

- [ ] All status messages use appropriate ARIA roles (status/alert)
- [ ] Status message patterns documented in design system
- [ ] Polite vs. assertive updates properly implemented
- [ ] Automated tests verify ARIA roles

#### AC-13-9: Testing & Validation

- [ ] Accessibility tests updated to include WCAG 2.2 tags
- [ ] All new criteria verified with automated tests
- [ ] Manual testing checklist updated
- [ ] Lighthouse and axe-core report 0 WCAG 2.2 violations

### Activities

| ID      | Activity                           | Description                                                                                   | Difficulty | Dependencies        |
| ------- | ---------------------------------- | --------------------------------------------------------------------------------------------- | ---------- | ------------------- |
| E13-A1  | Update Visual Design System        | Update VDS to reference WCAG 2.2, add status messages pattern, update accessibility checklist | 2          | Documentation       |
| E13-A2  | Update ADR-020                     | Update ADR-020 to reference WCAG 2.2 instead of 2.1                                           | 1          | Documentation       |
| E13-A3  | Update NFR-004                     | Update NFR-004 requirement to reference WCAG 2.2                                              | 1          | Documentation       |
| E13-A4  | Focus Visibility Audit             | Audit and fix focus indicators obscured by overlays, sticky headers, modals                   | 2          | E8-A5, All frontend |
| E13-A5  | Keyboard Alternatives for Dragging | Implement and document keyboard alternatives for Planner drag-and-drop operations             | 3          | E4-A4, E8-A2        |
| E13-A6  | Target Size Verification           | Verify all pointer targets meet 24×24 minimum, document exceptions                            | 2          | E8-A3, Frontend     |
| E13-A7  | Help Mechanism Consistency         | Audit and standardize help mechanism placement across pages                                   | 2          | All frontend        |
| E13-A8  | Form Data Persistence              | Ensure forms preserve data on errors, document auto-population patterns                       | 2          | All frontend        |
| E13-A9  | Authentication Pattern Review      | Review authentication flows, ensure no cognitive tests, document patterns                     | 2          | Auth module         |
| E13-A10 | Status Messages Implementation     | Verify all status messages use appropriate ARIA roles, document patterns                      | 2          | All frontend        |
| E13-A11 | Update Accessibility Tests         | Update axe-core tests to include WCAG 2.2 tags, add tests for new criteria                    | 2          | E8-A6               |
| E13-A12 | WCAG 2.2 Compliance Validation     | Run full accessibility audit, verify all 9 new criteria pass                                  | 2          | E13-A1 through A11  |

### Dependencies

- **Epic 8 (Accessibility)**: Builds upon existing accessibility work
- **Epic 4 (Planner)**: Keyboard alternatives needed for drag-and-drop
- **All Frontend Modules**: Various components need updates

### Success Metrics

- 100% WCAG 2.2 AA compliance verified by automated tests
- 0 critical or serious violations in axe-core reports
- Lighthouse accessibility score remains ≥ 90
- All documentation updated and accurate
- Manual testing confirms all new criteria met

---

## Summary Statistics

### By Epic Status

- **Open**: 4 epics (E2, E11, E12, E13)
- **Progressing**: 9 epics (E1, E3, E4, E5, E6, E7, E8, E9, E10)

### By Priority

- **High**: 6 epics (E6, E7, E8, E10, E12, E13)
- **Medium**: 7 epics (E1, E2, E3, E4, E5, E9, E11)

### Total Activities

- **Total**: 121 activities
- **Trivial (1)**: 3 activities
- **Easy (2)**: 40 activities
- **Medium (3)**: 48 activities
- **Hard (4)**: 26 activities
- **Very Hard (5)**: 3 activities

### Estimated Total Effort

- **Total Story Points**: 118-183 story points
- **Average per Epic**: 8-14 story points

---

## Next Steps

1. Review and prioritize epics based on business value and dependencies
2. Break down epics into sprint-sized user stories
3. Assign story points and create sprint plan
4. Set up GitHub project board with columns: Backlog, To Do, In Progress, Review, Done
5. Create issues for each activity with proper labels and milestones

---

**Last Updated**: 2025-12-13
**Next Review**: 2026-01-13

---

## Notes on Status Determination

This document's activity status is based on verification against:
- **User Stories** (US-*): Defined in `docs/1.Product_Requirements/d.User_stories/`
- **Acceptance Criteria** (AC-*): Defined in `docs/1.Product_Requirements/e.Acceptance_Criteria/`
- **Code Implementation**: Verified against actual codebase in `apps/backend/` and `apps/frontend/`

**Key Findings**:
- Most backend APIs are fully implemented and meet acceptance criteria
- Frontend implementations are partially complete for many features
- Test coverage varies by module and needs improvement
- Some features (GPX/FIT import, consent management) are not yet implemented

**Recommendation**: Update user story status fields in `docs/1.Product_Requirements/d.User_stories/` to reflect actual implementation status for better traceability.
