# Acceptance Criteria

This folder contains acceptance criteria files that define testable conditions.

## Purpose

Each acceptance criteria file documents a specific, testable condition (SMART) with its test method, evidence requirements, and links to related tests and evidence.

## File Naming

Format: `US-{N}.{M}-AC{P}.md` (e.g., `US-1.1-AC01.md`)

## SMART Criteria

Each AC must be:

- **Specific**: Clear and unambiguous
- **Measurable**: Can be verified objectively
- **Achievable**: Realistic within project constraints
- **Relevant**: Directly relates to the user story
- **Time-bound**: Includes timing constraints where applicable

## Test Methods

- Unit
- Integration
- E2E
- API negative
- Performance
- Security

## Template

See [TEMPLATE.md](./TEMPLATE.md) for the structure and required fields.

## Single Source of Truth

**IMPORTANT**: Acceptance criteria files contain ONLY AC-level information. They link to tests and evidence but do NOT embed their details. See [0.REQUIREMENTS_SCHEMA.md](../0.REQUIREMENTS_SCHEMA.md) for the SSOT principle.

## Index

See [INDEX.md](./INDEX.md) for a list of all acceptance criteria.
