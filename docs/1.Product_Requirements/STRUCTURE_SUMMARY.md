# Requirements Management Structure - Summary

**Created**: 2025-01-21  
**Status**: Active

---

## Overview

A new structured requirements management system has been created following Single Source of Truth (SSOT) principles. Each artifact type has its own folder with templates, README files, and index files.

---

## Folder Structure

```
docs/1.Product_Requirements/
├── REQUIREMENTS_SCHEMA.md          # Central schema definition
├── STRUCTURE_SUMMARY.md             # This file
│
├── requirements/                    # Requirement files (FR/NFR)
│   ├── TEMPLATE.md
│   ├── README.md
│   └── INDEX.md
│
├── epics/                          # Epic files
│   ├── TEMPLATE.md
│   ├── README.md
│   └── INDEX.md
│
├── activities/                     # Activity files
│   ├── TEMPLATE.md
│   ├── README.md
│   └── INDEX.md
│
├── user-stories/                   # User story files
│   ├── TEMPLATE.md
│   ├── README.md
│   └── INDEX.md
│
└── acceptance-criteria/            # Acceptance criteria files
    ├── TEMPLATE.md
    ├── README.md
    └── INDEX.md
```

---

## Key Principles

### Single Source of Truth (SSOT)

**CRITICAL**: Each file contains ONLY its own information and links to related files. Do NOT duplicate information from other files.

- **Requirement files** → Link to epics (don't embed epic details)
- **Epic files** → Link to activities and stories (don't embed their details)
- **Activity files** → Link to stories (don't embed story details)
- **User Story files** → Link to ACs (don't embed AC details)
- **Acceptance Criteria files** → Include test method and evidence requirements (no separate test/evidence files)

### Linking Convention

Use relative paths to link between files:

- `../epics/E1-epic-title.md`
- `../activities/E1-A1-activity-title.md`
- `../user-stories/US-1.1-story-title.md`
- `../acceptance-criteria/US-1.1-AC01.md`

---

## File Naming Conventions

- **Requirements**: `FR-XXX-{kebab-case-title}.md` or `NFR-XXX-{kebab-case-title}.md`
- **Epics**: `E{N}-{kebab-case-title}.md`
- **Activities**: `E{N}-A{M}-{kebab-case-title}.md`
- **User Stories**: `US-{N}.{M}-{kebab-case-title}.md`
- **Acceptance Criteria**: `US-{N}.{M}-AC{P}.md`

---

## How to Use

### Creating a New Requirement

1. Copy `requirements/TEMPLATE.md` to `requirements/FR-XXX-title.md`
2. Fill in requirement-specific information
3. Link to related epics (don't embed epic details)
4. Update `requirements/INDEX.md`

### Creating a New Epic

1. Copy `epics/TEMPLATE.md` to `epics/E{N}-title.md`
2. Fill in epic-specific information
3. Link to related activities and stories (don't embed their details)
4. Update `epics/INDEX.md`

### Creating a New User Story

1. Copy `user-stories/TEMPLATE.md` to `user-stories/US-{N}.{M}-title.md`
2. Fill in story-specific information
3. Link to related acceptance criteria (don't embed AC details)
4. Update `user-stories/INDEX.md`

### Creating New Acceptance Criteria

1. Copy `acceptance-criteria/TEMPLATE.md` to `acceptance-criteria/US-{N}.{M}-AC{P}.md`
2. Ensure criterion is SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
3. Include test method and evidence requirements in the AC file
4. Update `acceptance-criteria/INDEX.md`

---

## Quality Standards

All templates follow production-grade quality standards:

### Requirements-Analyst Standards

- Clear, unambiguous requirements
- Specific, measurable acceptance criteria (SMART)
- Complete dependencies and constraints
- Testable requirements

### Documentation-Agent Standards

- Consistent format across all templates
- Proper linking between related files
- Complete structure with all required sections
- SSOT principle enforced

---

## Maintenance

When artifacts are added, modified, or completed:

1. Update the individual artifact file
2. Update the folder's INDEX.md
3. Update REQUIREMENTS_SCHEMA.md if structure changes
4. Update Requirements_Catalogue.md
5. Update AC_Master.md for acceptance criteria
6. Update rtm_comprehensive.csv for traceability

---

## Next Steps

1. **Migrate existing requirements** from `Requirements/` folder to new structure
2. **Create maintenance procedures** for keeping artifacts synchronized
3. **Set up automation** (if desired) for index generation
4. **Train team** on SSOT principles and new structure

---

**Last Updated**: 2025-01-21
