# Requirements Organization

This directory contains individual requirement documents organized by implementation status.

## Directory Structure

- **`done/`** - Requirements that are fully implemented and meet all acceptance criteria
- **`progressing/`** - Requirements that are partially implemented or in active development
- **`open/`** - Requirements that have not yet been started

## Status Definitions

### Done ✅

Requirements in this folder are:

- Fully implemented in the codebase
- All acceptance criteria met
- Tests passing
- Documentation complete

### Progressing 🚧

Requirements in this folder are:

- Partially implemented
- Some acceptance criteria met
- Active development ongoing
- May have known gaps or missing features

### Open 📋

Requirements in this folder are:

- Not yet started
- No implementation exists
- Planning or design phase

## Current Status Summary

**Done (8 requirements):**

- FR-001: User Registration
- FR-002: Login & Session
- FR-003: Auth-Wall
- FR-006: Gamification
- FR-007: Analytics & Export
- FR-008: Admin & RBAC
- NFR-001: Security
- NFR-006: Internationalization

**Progressing (6 requirements):**

- FR-004: Planner (drag-and-drop, conflict detection in progress)
- FR-005: Logging & Import (GPX/FIT import may be incomplete)
- NFR-002: Privacy (GDPR deletion workflow may be incomplete)
- NFR-003: Performance (Lighthouse CI configured, targets may not be fully met)
- NFR-004: Accessibility (WCAG compliance in progress)
- NFR-005: Availability & Backups (SLO monitoring may be incomplete)

**Open (6 requirements):**

- FR-009: Profile & Settings
- FR-010: Exercise Library
- FR-011: Sharing & Community
- FR-012: Coach Training Unit Assignment
- NFR-007: Observability
- REQ-2025-01-20-001: Terms and Conditions

## Updating Status

To update the status of a requirement:

1. Review the codebase for implementation evidence
2. Verify acceptance criteria are met
3. Update the status in `scripts/organize_requirements.py` if needed
4. Run `python scripts/organize_requirements.py` to reorganize files

## Notes

- Status is determined by codebase analysis and may need manual review
- Requirements may move between folders as implementation progresses
- All requirements are tracked in `AC_Master.md` with detailed acceptance criteria
