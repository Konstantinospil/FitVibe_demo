# FitVibe Requirements Schema

**Version**: 1.0  
**Last Updated**: 2025-01-21  
**Status**: Active  
**Owner**: Requirements Engineering Team

---

## Purpose

This document defines the canonical schema for all requirements artifacts in the FitVibe project. It serves as the authoritative source of truth for requirements structure, relationships, and traceability.

---

## Schema Overview

The requirements hierarchy follows this structure:

```
Requirement (FR-XXX / NFR-XXX)
  └── Epic (E1, E2, ...)
      └── Activity (E1-A1, E1-A2, ...)
          └── User Story (US-X.Y)
              └── Acceptance Criteria (US-X.Y-AC01, ...)
```

---

## Single Source of Truth (SSOT) Principle

**CRITICAL**: Each file contains ONLY its own information and links to related files. Do NOT duplicate information from other files.

### Rules

1. **Requirement files** contain requirement-level information only. Link to epics, do not embed epic details.
2. **Epic files** contain epic-level information only. Link to activities and stories, do not embed their details.
3. **Activity files** contain activity-level information only. Link to stories, do not embed story details.
4. **User Story files** contain story-level information only. Link to ACs, do not embed AC details.
5. **Acceptance Criteria files** contain AC-level information only. Include test method and evidence requirements, but do not create separate test or evidence files.

### Linking Convention

Use relative paths to link between files:

- `../epics/E1-epic-title.md`
- `../activities/E1-A1-activity-title.md`
- `../user-stories/US-1.1-story-title.md`
- `../acceptance-criteria/US-1.1-AC01.md`

### What to Include vs. Link

**Include (own information)**:

- Metadata (ID, status, dates, owner)
- Description of the entity itself
- Entity-specific criteria/requirements
- Entity-specific notes

**Link (other entities)**:

- Related entities (epics, activities, stories, ACs)
- Dependencies
- Related requirements

**Never Include**:

- Full details of related entities
- Embedded acceptance criteria from stories

---

## Entity Definitions

### Requirement

**Type**: Functional (FR) or Non-Functional (NFR)  
**ID Format**: `FR-XXX` or `NFR-XXX`  
**File Location**: `requirements/FR-XXX-{title}.md`

**Attributes**:

- `requirement_id`: Unique identifier (FR-XXX / NFR-XXX)
- `type`: Functional | Non-Functional
- `title`: Human-readable title
- `status`: Open | Progressing | Done
- `priority`: High | Medium | Low
- `gate`: GOLD | SILVER | BRONZE
- `owner`: Owner team/person
- `created`: Creation date
- `updated`: Last update date
- `prd_reference`: PRD section reference
- `tdd_reference`: TDD section reference

**Relationships**:

- Has many: Epics (via links)
- Traces to: PRD sections, TDD sections

---

### Epic

**ID Format**: `E{N}` (e.g., E1, E2, E3)  
**File Location**: `epics/E{N}-{title}.md`

**Attributes**:

- `epic_id`: Unique identifier (E1, E2, ...)
- `requirement_id`: Parent requirement (FR-XXX / NFR-XXX) - linked, not embedded
- `title`: Epic title
- `status`: Open | Progressing | Done
- `priority`: High | Medium | Low
- `gate`: GOLD | SILVER | BRONZE
- `estimated_effort`: Story points range (e.g., "8-12 SP")
- `description`: Epic description

**Relationships**:

- Belongs to: Requirement (via link)
- Has many: Activities (via links)
- Has many: User Stories (via links)

---

### Activity

**ID Format**: `E{N}-A{M}` (e.g., E1-A1, E1-A2)  
**File Location**: `activities/E{N}-A{M}-{title}.md`

**Attributes**:

- `activity_id`: Unique identifier (E1-A1, E1-A2, ...)
- `epic_id`: Parent epic (E1, E2, ...) - linked, not embedded
- `title`: Activity title
- `description`: Clear description of implementation
- `difficulty`: 1-5 scale (Trivial to Very Hard)
- `dependencies`: List of activity IDs or requirement IDs (linked)
- `status`: Open | Progressing | Done
- `estimated_effort`: Story points

**Relationships**:

- Belongs to: Epic (via link)
- Has many: User Stories (via links)

---

### User Story

**ID Format**: `US-{N}.{M}` (e.g., US-1.1, US-1.2)  
**File Location**: `user-stories/US-{N}.{M}-{title}.md`

**Attributes**:

- `story_id`: Unique identifier (US-1.1, US-1.2, ...)
- `epic_id`: Related epic (E1, E2, ...) - linked, not embedded
- `activity_ids`: Related activities (E1-A1, E1-A2, ...) - linked, not embedded
- `title`: Story title
- `as_a`: User type
- `i_want`: Goal
- `so_that`: Benefit
- `story_points`: 1-13 Fibonacci scale
- `priority`: High | Medium | Low
- `dependencies`: List of story IDs or activity IDs (linked)
- `status`: Open | Progressing | Done

**Relationships**:

- Belongs to: Epic (via link)
- Related to: Activities (via links)
- Has many: Acceptance Criteria (via links)

---

### Acceptance Criteria

**ID Format**: `US-{N}.{M}-AC{P}` (e.g., US-1.1-AC01, US-1.1-AC02)  
**File Location**: `acceptance-criteria/US-{N}.{M}-AC{P}.md`

**Attributes**:

- `ac_id`: Unique identifier (US-1.1-AC01, ...)
- `story_id`: Parent user story (US-1.1, ...) - linked, not embedded
- `criterion`: Specific, testable condition (SMART)
- `test_method`: Unit | Integration | E2E | API negative | Performance | Security
- `evidence_required`: List of evidence types
- `status`: Proposed | Approved | Verified | Rejected
- `priority`: High | Medium | Low

**Relationships**:

- Belongs to: User Story (via link)

---

## Traceability Matrix

All artifacts are traced through:

1. **Requirement → PRD**: Links to PRD sections
2. **Requirement → TDD**: Links to TDD sections
3. **AC → RTM**: Links to Requirements Traceability Matrix

---

## File Naming Conventions

- **Requirements**: `FR-XXX-{kebab-case-title}.md` or `NFR-XXX-{kebab-case-title}.md`
- **Epics**: `E{N}-{kebab-case-title}.md`
- **Activities**: `E{N}-A{M}-{kebab-case-title}.md`
- **User Stories**: `US-{N}.{M}-{kebab-case-title}.md`
- **Acceptance Criteria**: `US-{N}.{M}-AC{P}.md`

---

## Index Files

Each folder contains an `INDEX.md` file that lists all artifacts in that category with their status and relationships.

---

## Maintenance

This schema is maintained by the requirements engineering team. When artifacts are added, modified, or completed:

1. Update the individual artifact file
2. Update the folder's INDEX.md
3. Update REQUIREMENTS_SCHEMA.md if structure changes
4. Update Requirements_Catalogue.md
5. Update AC_Master.md for acceptance criteria
6. Update rtm_comprehensive.csv for traceability

---

**Last Reviewed**: 2025-01-21  
**Next Review**: 2025-02-21
