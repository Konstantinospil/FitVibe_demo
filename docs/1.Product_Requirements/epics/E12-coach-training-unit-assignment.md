# Epic 12: Coach Training Unit Assignment

---

**Epic ID**: E12  
**Requirement ID**: [FR-012](../requirements/FR-012-coach-training-unit-assignment.md)  
**Title**: Coach Training Unit Assignment  
**Status**: Open  
**Priority**: High  
**Gate**: SILVER  
**Estimated Total Effort**: 15-20 story points  
**Created**: 2025-01-20  
**Updated**: 2025-01-21

---

## Description

Enable coaches to define reusable training units (named workout sessions with exercises, sets, reps, and distance) and assign them to athletes on specific dates. Coaches can modify exercise parameters (weight, exercise substitution, intensity/pace) during assignment to personalize training for each athlete's level and needs.

## Business Value

Enables coaches to efficiently create, manage, and distribute standardized training units to their athletes while maintaining flexibility to customize workouts. This feature differentiates FitVibe for the coaching market and creates a new user segment.

## Related Activities

{Note: Activities will be created and linked here as they are defined}

## Related User Stories

{Note: User stories will be created and linked here as they are defined}

## Dependencies

### Epic Dependencies

- [FR-012: Coach Training Unit Assignment](../requirements/FR-012-coach-training-unit-assignment.md): Parent requirement
- [FR-001: User Registration](../requirements/FR-001-user-registration.md): User accounts
- [FR-002: Login & Session](../requirements/FR-002-login-and-session.md): Authentication
- [FR-004: Planner](../requirements/FR-004-planner.md): Session planning and creation
- [FR-008: Admin & RBAC](../requirements/FR-008-admin-and-rbac.md): Coach role and permissions
- [FR-010: Exercise Library](../requirements/FR-010-exercise-library.md): Exercise selection and substitution

### Blocking Dependencies

{Note: Coach-athlete relationship system may need to be implemented as a prerequisite}

## Success Criteria

- Coaches can create and save training units in under 2 minutes
- Coaches can assign a training unit to multiple athletes in under 30 seconds per athlete
- Athletes receive assigned sessions in their planner with appropriate modifications
- Exercise parameter modifications work correctly
- Coach-athlete relationship validation works
- Assignment history tracking is functional

## Risks & Mitigation

- **Risk**: Coach-athlete relationship system not yet implemented
  - **Mitigation**: Implement relationship management as part of this epic or as a prerequisite
- **Risk**: Performance degradation with large repeat counts
  - **Mitigation**: Implement reasonable limits (max 20 repeats) and optimize session creation logic
- **Risk**: Bulk assignment failures may leave partial state
  - **Mitigation**: Use database transactions for bulk operations

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
