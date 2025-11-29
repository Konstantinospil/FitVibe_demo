# FR-012 — Coach Training Unit Assignment

---

**Requirement ID**: FR-012  
**Type**: Functional Requirement  
**Title**: Coach Training Unit Assignment  
**Status**: Open  
**Priority**: High  
**Gate**: SILVER  
**Owner**: ENG/QA  
**Created**: 2025-11-23  
**Updated**: 2025-01-21

---

## Executive Summary

This functional requirement specifies coach training unit assignment capabilities that the system must provide.

Enable coaches to define reusable training units (named workout sessions with exercises, sets, reps, and distance) and assign them to athletes on specific dates. Coaches can modify exercise parameters (weight, exercise substitution, intensity/pace) during assignment to personalize training for each athlete's level and needs.

## Business Context

- **Business Objective**: Enable coaches to efficiently create, manage, and distribute standardized training units to their athletes while maintaining flexibility to customize workouts based on individual athlete capabilities and progression needs.
- **Success Criteria**:
  - Coaches can create and save training units in under 2 minutes
  - Coaches can assign a training unit to multiple athletes in under 30 seconds per athlete
  - Athletes receive assigned sessions in their planner with appropriate modifications
  - 90% of coaches report the feature saves them time compared to manual session creation
- **Target Users**: Coaches (primary), Athletes (secondary - receive assigned sessions)

## Traceability

- **PRD Reference**: PRD §Coach Features
- **TDD Reference**: TDD §Training Units, §Coach Module

## Functional Requirements

### Training Unit Definition

The system shall allow coaches to create and manage reusable training units:

- **Training Unit Creation**: Coaches can create training units with name, exercises, sets, reps, distance, and exercise repeat/rounds capability
- **Exercise Management**: Coaches can add exercises in specific order with sets, reps, distance, rest periods, and notes
- **Repeat/Rounds Support**: Coaches can specify that the entire exercise sequence should be repeated N times (1-100)
- **Training Unit Library**: Coaches can view, search, edit, and archive (soft delete) their training units
- **Privacy**: Training units are private to the coach by default

### Training Unit Assignment

- **Assignment to Athletes**: Coaches can assign training units to one or more athletes on specific dates
- **Coach-Athlete Relationship**: Assignment requires consent-based coach-athlete relationship
- **Session Creation**: Assigned training units create planned sessions in athlete's planner
- **Bulk Assignment**: Coaches can assign the same training unit to multiple athletes efficiently (≤3s for 10 athletes)

### Exercise Parameter Modification

- **Weight Modification**: Coaches can modify weight/resistance for exercises during assignment
- **Exercise Substitution**: Coaches can substitute one exercise for another
- **Intensity/Pace Modification**: Coaches can modify target intensity/pace for running/endurance exercises
- **Per-Athlete Customization**: Modifications are applied per-athlete (different athletes can have different modifications)
- **Original Preservation**: Original training unit remains unchanged (modifications only affect assigned session)

### Coach-Athlete Relationship

- **Consent-Based**: Coach-athlete relationship requires explicit consent from athlete
- **Relationship Management**: Coaches can view their athlete list; athletes can revoke access
- **Validation**: System validates coach-athlete relationship before allowing assignment

### Assignment History

- **History Tracking**: Coaches can view history of training unit assignments
- **Completion Tracking**: Coaches can see which athletes have completed assigned sessions
- **Filtering**: Filter assignments by date range, athlete, or training unit

## Related Epics

- [E12: Coach Training Unit Assignment](../epics/E12-coach-training-unit-assignment.md)

## Dependencies

### Technical Dependencies

- Training unit data model (training_units table)
- Session creation system
- Coach-athlete relationship system
- Exercise library integration

### Feature Dependencies

- [FR-001: User Registration](./FR-001-user-registration.md) - User accounts
- [FR-002: Login & Session](./FR-002-login-and-session.md) - Authentication
- [FR-004: Planner](./FR-004-planner.md) - Session planning and creation
- [FR-008: Admin & RBAC](./FR-008-admin-and-rbac.md) - Coach role and permissions
- [FR-010: Exercise Library](./FR-010-exercise-library.md) - Exercise selection and substitution

## Constraints

### Technical Constraints

- Single assignment ≤1s
- Bulk assignment (10 athletes) ≤3s
- Training unit creation ≤500ms
- Training unit list loading ≤500ms for 50 units
- Must use existing session data model
- Must respect existing RBAC system

### Business Constraints

- Coach-athlete relationships require explicit consent (GDPR/privacy requirement)
- Training units are coach-owned and private by default
- Assigned sessions become athlete-owned (athlete can modify/delete)

## Assumptions

- Coaches have established consent-based relationships with athletes
- Exercise library (FR-010) is implemented and available
- Session planner (FR-004) is functional
- Coaches typically assign to 1-20 athletes per training unit
- Training units typically contain 1-20 exercises
- Repeat counts are typically 1-5 (rarely exceed 10)

## Risks & Issues

- **Risk**: Coach-athlete relationship system not yet implemented
  - **Mitigation**: Implement relationship management as part of this epic or as a prerequisite
- **Risk**: Performance degradation with large repeat counts (e.g., 100 repeats)
  - **Mitigation**: Implement reasonable limits (max 20 repeats) and optimize session creation logic
- **Risk**: Bulk assignment failures may leave partial state
  - **Mitigation**: Use database transactions for bulk operations

## Open Questions

- Should training units support tags/categories for organization?
- Should coaches be able to create training unit templates from existing sessions?
- Should training units support exercise groups/supersets?
- Should assigned sessions be editable by athletes, or read-only?
- Should training units support time-based exercises (e.g., "plank for 60 seconds")?

## Related Requirements

- [FR-004: Planner](./FR-004-planner.md) - Session creation and management
- [FR-008: Admin & RBAC](./FR-008-admin-and-rbac.md) - Coach role and permissions
- [FR-010: Exercise Library](./FR-010-exercise-library.md) - Exercise selection and management
- [FR-011: Sharing & Community](./FR-011-sharing-and-community.md) - May inform future public training unit sharing

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
