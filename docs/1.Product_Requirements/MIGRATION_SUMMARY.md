# Requirements Migration Summary

**Migration Date**: 2025-01-21  
**Status**: Complete

---

## Overview

All requirements from the `Requirements/` folder have been migrated to the new structured requirements management system following Single Source of Truth (SSOT) principles.

---

## Migration Statistics

### Requirements Migrated

- **Total Requirements**: 20
- **Functional Requirements (FR)**: 12
- **Non-Functional Requirements (NFR)**: 7
- **Other Requirements (REQ)**: 1

### By Status

- **Done**: 8 requirements
- **Progressing**: 6 requirements
- **Open**: 6 requirements

---

## Migrated Requirements

### Functional Requirements

| ID     | Title                          | Status      | New Location                                            |
| ------ | ------------------------------ | ----------- | ------------------------------------------------------- |
| FR-001 | User Registration              | Done        | `requirements/FR-001-user-registration.md`              |
| FR-002 | Login & Session                | Done        | `requirements/FR-002-login-and-session.md`              |
| FR-003 | Auth-Wall                      | Done        | `requirements/FR-003-authwall.md`                       |
| FR-004 | Planner                        | Progressing | `requirements/FR-004-planner.md`                        |
| FR-005 | Logging & Import               | Progressing | `requirements/FR-005-logging-and-import.md`             |
| FR-006 | Gamification                   | Done        | `requirements/FR-006-gamification.md`                   |
| FR-007 | Analytics & Export             | Done        | `requirements/FR-007-analytics-and-export.md`           |
| FR-008 | Admin & RBAC                   | Done        | `requirements/FR-008-admin-and-rbac.md`                 |
| FR-009 | Profile & Settings             | Open        | `requirements/FR-009-profile-and-settings.md`           |
| FR-010 | Exercise Library               | Open        | `requirements/FR-010-exercise-library.md`               |
| FR-011 | Sharing & Community            | Open        | `requirements/FR-011-sharing-and-community.md`          |
| FR-012 | Coach Training Unit Assignment | Open        | `requirements/FR-012-coach-training-unit-assignment.md` |

### Non-Functional Requirements

| ID      | Title                  | Status      | New Location                            |
| ------- | ---------------------- | ----------- | --------------------------------------- |
| NFR-001 | Security               | Done        | `requirements/NFR-001-security.md`      |
| NFR-002 | Privacy & GDPR         | Progressing | `requirements/NFR-002-privacy.md`       |
| NFR-003 | Performance            | Progressing | `requirements/NFR-003-performance.md`   |
| NFR-004 | Accessibility          | Progressing | `requirements/NFR-004-a11y.md`          |
| NFR-005 | Availability & Backups | Progressing | `requirements/NFR-005-ops.md`           |
| NFR-006 | Internationalization   | Done        | `requirements/NFR-006-i18n.md`          |
| NFR-007 | Observability          | Open        | `requirements/NFR-007-observability.md` |

### Other Requirements

| ID                 | Title                | Status | New Location                                              |
| ------------------ | -------------------- | ------ | --------------------------------------------------------- |
| REQ-2025-01-20-001 | Terms and Conditions | Open   | `requirements/REQ-2025-01-20-001-terms-and-conditions.md` |

---

## Migration Changes

### SSOT Principle Applied

All migrated requirements follow the Single Source of Truth principle:

1. **Removed Embedded Content**:
   - Acceptance criteria removed from requirement files (now in separate AC files)
   - User stories removed from requirement files (now in separate story files)
   - Test details removed from requirement files (now in separate test files)

2. **Added Links**:
   - Links to related epics (where applicable)
   - Links to related requirements
   - Links to PRD/TDD sections

3. **Requirement-Level Information Only**:
   - Business context
   - Functional/non-functional requirements
   - Dependencies
   - Constraints
   - Assumptions
   - Risks & issues

### Epic Links Added

Requirements are now linked to their related epics:

- **FR-009** → E1: Profile & Settings
- **FR-010** → E2: Exercise Library
- **FR-011** → E3: Sharing & Community
- **FR-004** → E4: Planner Completion
- **FR-005** → E5: Logging & Import
- **NFR-002** → E6: Privacy & GDPR
- **NFR-003** → E7: Performance Optimization
- **NFR-004** → E8: Accessibility, E13: WCAG 2.2 Compliance Update
- **NFR-005** → E10: Availability & Backups
- **NFR-007** → E9: Observability
- **FR-012** → E12: Coach Training Unit Assignment

---

## File Structure

### New Structure

```
docs/1.Product_Requirements/
├── REQUIREMENTS_SCHEMA.md          # Central schema
├── requirements/                    # All requirement files
│   ├── TEMPLATE.md
│   ├── README.md
│   ├── INDEX.md
│   ├── FR-001-user-registration.md
│   ├── FR-002-login-and-session.md
│   └── ... (all 20 requirements)
├── epics/                           # Epic files (to be created)
├── activities/                      # Activity files (to be created)
├── user-stories/                    # User story files (to be created)
├── acceptance-criteria/             # AC files (to be created)
├── tests/                           # Test files (to be created)
└── evidence/                        # Evidence files (to be created)
```

### Old Structure (Preserved)

The original `Requirements/` folder is preserved for reference but should not be updated going forward. All new work should use the new structure.

---

## Next Steps

1. **Create Epic Files**: Migrate epics from `PROJECT_EPICS_AND_ACTIVITIES.md` to individual epic files
2. **Create Activity Files**: Create individual activity files for each activity
3. **Create User Story Files**: Extract user stories and create individual story files
4. **Create Acceptance Criteria Files**: Extract ACs from `AC_Master.md` and create individual AC files
5. **Update Requirements_Catalogue.md**: Update links to point to new structure
6. **Create Maintenance Procedures**: Document how to maintain the new structure

---

## Verification

- ✅ All 20 requirements migrated
- ✅ SSOT principle applied (no embedded ACs/stories)
- ✅ Links to epics added (where applicable)
- ✅ Links to related requirements added
- ✅ Index file created and populated
- ✅ No linter errors
- ✅ All files follow template structure

---

**Migration Completed**: 2025-01-21  
**Verified By**: Requirements Engineering Team
