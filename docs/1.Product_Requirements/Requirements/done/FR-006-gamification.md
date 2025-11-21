# FR-006 — Gamification

---

**Requirement ID**: FR-006
**Type**: Functional Requirement
**Title**: Gamification
**Status**: Proposed
**Priority**: Medium
**Gate**: SILVER
**Owner**: ENG
**Generated**: 2025-11-21T20:33:59.193021

---

## Executive Summary

This functional requirement specifies gamification capabilities that the system must provide.

Motivate users through points and badges awarded for completing training sessions.

## Business Context

- **Business Objective**: Motivate users through points and badges awarded for completing training sessions.
- **Success Criteria**: Users receive points and badges upon session completion, visible in profile within 2s.
- **Priority**: Medium
- **Quality Gate**: SILVER
- **Owner**: ENG
- **Status**: Proposed
- **Target Users**: Authenticated users completing workouts

## Traceability

- **PRD Reference**: PRD §Gamification
- **TDD Reference**: TDD §Rules

## Acceptance Criteria

Each acceptance criterion must be met for this requirement to be considered complete.

### FR-006-AC01-A

**Criterion**: Scoring rules are deterministic and pure; property-based tests hold across 10k generated cases.

- **Test Method**: Property-based
- **Evidence Required**: Test run logs

### FR-006-AC01-B

**Criterion**: No negative points; user total ≤ configured max per period.

- **Test Method**: Unit
- **Evidence Required**: Bound checks

### FR-006-AC02-A

**Criterion**: Badge awards appear in profile within **≤2s** of qualifying event and persist post reload.

- **Test Method**: E2E
- **Evidence Required**: UI/screens

### FR-006-AC02-B

**Criterion**: Revocation/adjustment re-evaluates affected users within one job cycle; audit trail recorded.

- **Test Method**: Job integration
- **Evidence Required**: Job logs

## Test Strategy

- E2E
- Job integration
- Property-based
- Unit

## Evidence Requirements

- Bound checks
- Job logs
- Test run logs
- UI/screens

## Use Cases

### Primary Use Cases

- User completes a training session and receives points
- User earns a badge for achieving milestone
- User views points and badges in profile

### Edge Cases

- User attempts to game the system (detected and prevented)
- Admin adjusts user points (audit logged)
- Badge criteria changes and affects existing users

## Dependencies

### Technical Dependencies

- Points calculation engine
- Badge evaluation system
- Background job processor

### Feature Dependencies

- FR-005 (Logging & Import)

## Constraints

### Technical Constraints

- Scoring rules must be deterministic
- No negative points
- Badge awards ≤2s

### Business Constraints

- Points formula is hidden from users
- Anti-gaming measures required

## Assumptions

- Users are motivated by gamification
- Points formula is fair and balanced
- Badge criteria are achievable

## Risks & Issues

- **Risk**: Users may attempt to exploit points system
- **Risk**: Badge criteria changes may frustrate users
- **Risk**: Points calculation errors may reduce trust
