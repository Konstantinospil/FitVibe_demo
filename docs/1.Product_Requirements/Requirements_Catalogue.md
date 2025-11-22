# FitVibe Requirements Catalogue

**Version**: 2.0  
**Last Updated**: 2025-01-20  
**Status**: Active

---

## Purpose

This catalogue provides a comprehensive index of all functional and non-functional requirements for the FitVibe platform. Each requirement is linked to its detailed specification document and traced to the Product Requirements Document (PRD) and Technical Design Document (TDD).

---

## Requirements Organization

Requirements are organized by:

- **Type**: Functional (FR) or Non-Functional (NFR)
- **Status**: Done, Progressing, or Open
- **Priority**: High, Medium, or Low
- **Quality Gate**: GOLD (must-have) or SILVER (should-have)

---

## Functional Requirements (FR)

### Authentication & User Management

| ID     | Title              | Status | Priority | Gate   | Document                                                                           | PRD Reference |
| ------ | ------------------ | ------ | -------- | ------ | ---------------------------------------------------------------------------------- | ------------- |
| FR-001 | User Registration  | Done   | High     | GOLD   | [FR-001-user-registration.md](Requirements/done/FR-001-user-registration.md)       | PRD §4.1      |
| FR-002 | Login & Session    | Done   | High     | GOLD   | [FR-002-login-and-session.md](Requirements/done/FR-002-login-and-session.md)       | PRD §4.1      |
| FR-003 | Auth-Wall          | Done   | High     | GOLD   | [FR-003-authwall.md](Requirements/done/FR-003-authwall.md)                         | PRD §4.1      |
| FR-009 | Profile & Settings | Open   | Medium   | SILVER | [FR-009-profile-and-settings.md](Requirements/open/FR-009-profile-and-settings.md) | PRD §4.2      |

### Content Management

| ID     | Title            | Status      | Priority | Gate   | Document                                                                              | PRD Reference |
| ------ | ---------------- | ----------- | -------- | ------ | ------------------------------------------------------------------------------------- | ------------- |
| FR-010 | Exercise Library | Open        | Medium   | SILVER | [FR-010-exercise-library.md](Requirements/open/FR-010-exercise-library.md)            | PRD §4.3      |
| FR-004 | Planner          | Progressing | Medium   | SILVER | [FR-004-planner.md](Requirements/progressing/FR-004-planner.md)                       | PRD §4.4      |
| FR-005 | Logging & Import | Progressing | Medium   | SILVER | [FR-005-logging-and-import.md](Requirements/progressing/FR-005-logging-and-import.md) | PRD §4.4      |

### Analytics & Social

| ID     | Title               | Status | Priority | Gate   | Document                                                                             | PRD Reference |
| ------ | ------------------- | ------ | -------- | ------ | ------------------------------------------------------------------------------------ | ------------- |
| FR-006 | Gamification        | Done   | Medium   | SILVER | [FR-006-gamification.md](Requirements/done/FR-006-gamification.md)                   | PRD §4.6      |
| FR-007 | Analytics & Export  | Done   | High     | GOLD   | [FR-007-analytics-and-export.md](Requirements/done/FR-007-analytics-and-export.md)   | PRD §4.5      |
| FR-011 | Sharing & Community | Open   | Medium   | SILVER | [FR-011-sharing-and-community.md](Requirements/open/FR-011-sharing-and-community.md) | PRD §4.7      |

### Administration

| ID     | Title        | Status | Priority | Gate | Document                                                               | PRD Reference |
| ------ | ------------ | ------ | -------- | ---- | ---------------------------------------------------------------------- | ------------- |
| FR-008 | Admin & RBAC | Done   | High     | GOLD | [FR-008-admin-and-rbac.md](Requirements/done/FR-008-admin-and-rbac.md) | PRD §4.8      |

---

## Non-Functional Requirements (NFR)

### Security & Privacy

| ID      | Title          | Status      | Priority | Gate | Document                                                          | PRD Reference |
| ------- | -------------- | ----------- | -------- | ---- | ----------------------------------------------------------------- | ------------- |
| NFR-001 | Security       | Done        | High     | GOLD | [NFR-001-security.md](Requirements/done/NFR-001-security.md)      | PRD §5.1      |
| NFR-002 | Privacy & GDPR | Progressing | High     | GOLD | [NFR-002-privacy.md](Requirements/progressing/NFR-002-privacy.md) | PRD §5.2      |

### Performance & Quality

| ID      | Title                       | Status      | Priority | Gate | Document                                                                  | PRD Reference |
| ------- | --------------------------- | ----------- | -------- | ---- | ------------------------------------------------------------------------- | ------------- |
| NFR-003 | Performance                 | Progressing | High     | GOLD | [NFR-003-performance.md](Requirements/progressing/NFR-003-performance.md) | PRD §5.3      |
| NFR-004 | Accessibility (WCAG 2.1 AA) | Progressing | High     | GOLD | [NFR-004-a11y.md](Requirements/progressing/NFR-004-a11y.md)               | PRD §5.5      |

### Operations & Infrastructure

| ID      | Title                       | Status      | Priority | Gate   | Document                                                  | PRD Reference  |
| ------- | --------------------------- | ----------- | -------- | ------ | --------------------------------------------------------- | -------------- |
| NFR-005 | Availability & Backups      | Progressing | High     | SILVER | [NFR-005-ops.md](Requirements/progressing/NFR-005-ops.md) | PRD §5.4, §5.7 |
| NFR-006 | Internationalization (i18n) | Done        | Medium   | SILVER | [NFR-006-i18n.md](Requirements/done/NFR-006-i18n.md)      | PRD §4.8       |

### Observability

| ID      | Title         | Status | Priority | Gate   | Document                                                               | PRD Reference |
| ------- | ------------- | ------ | -------- | ------ | ---------------------------------------------------------------------- | ------------- |
| NFR-007 | Observability | Open   | Medium   | SILVER | [NFR-007-observability.md](Requirements/open/NFR-007-observability.md) | PRD §5.6      |

---

## Requirements Summary

### By Status

- **Done**: 8 requirements (FR-001, FR-002, FR-003, FR-006, FR-007, FR-008, NFR-001, NFR-006)
- **Progressing**: 6 requirements (FR-004, FR-005, NFR-002, NFR-003, NFR-004, NFR-005)
- **Open**: 5 requirements (FR-009, FR-010, FR-011, NFR-007, REQ-2025-01-20-001)

### By Priority

- **High**: 10 requirements
- **Medium**: 9 requirements

### By Quality Gate

- **GOLD** (Must-have): 9 requirements
- **SILVER** (Should-have): 10 requirements

---

## Traceability

All requirements are traced to:

- **PRD**: Product Requirements Document sections
- **TDD**: Technical Design Document sections
- **AC_Master**: Acceptance Criteria master list
- **RTM**: Requirements Traceability Matrix (CSV)

---

## Related Documents

- [Product Requirements Document](../1.Product_Requirements_Document.md)
- [Acceptance Criteria Master List](../AC_Master.md)
- [Requirements Traceability Matrix](../rtm_comprehensive.csv)
- [Technical Design Document](../../2.Technical_Design_Document/)

---

## Maintenance

This catalogue is maintained by the requirements engineering team. When requirements are added, modified, or completed:

1. Update this catalogue
2. Update the individual requirement document
3. Update AC_Master.md with acceptance criteria
4. Update rtm_comprehensive.csv for traceability
5. Update PRD/TDD references if needed

---

**Last Reviewed**: 2025-01-20  
**Next Review**: 2025-02-20
