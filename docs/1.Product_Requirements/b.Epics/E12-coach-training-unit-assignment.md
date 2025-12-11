# Epic 12: Coach Training Unit Assignment

---

**Epic ID**: E12  
**Requirement ID**: [FR-012](../a.Requirements/FR-012-coach-training-unit-assignment.md)  
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

- [E12-A1: Training Unit CRUD](../c.Activities/E12-A1-training-unit-crud.md)
- [E12-A2: Training Unit Assignment System](../c.Activities/E12-A2-training-unit-assignment-system.md)
- [E12-A3: Exercise Parameter Modification](../c.Activities/E12-A3-exercise-parameter-modification.md)
- [E12-A4: Coach-Athlete Relationship Management](../c.Activities/E12-A4-coach-athlete-relationship-management.md)

## Related User Stories

- [US-12.1: Training Unit CRUD](../d.User_stories/US-12.1-training-unit-crud.md)
- [US-12.2: Training Unit Assignment](../d.User_stories/US-12.2-training-unit-assignment.md)
- [US-12.3: Exercise Parameter Modification](../d.User_stories/US-12.3-exercise-parameter-modification.md)
- [US-12.4: Coach-Athlete Relationship Management](../d.User_stories/US-12.4-coach-athlete-relationship-management.md)

## Dependencies

### Epic Dependencies

- [FR-012: Coach Training Unit Assignment](../a.Requirements/FR-012-coach-training-unit-assignment.md): Parent requirement
- [FR-001: User Registration](../a.Requirements/FR-001-user-registration.md): User accounts
- [FR-002: Login & Session](../a.Requirements/FR-002-login-and-session.md): Authentication
- [FR-004: Planner](../a.Requirements/FR-004-planner.md): Session planning and creation
- [FR-008: Admin & RBAC](../a.Requirements/FR-008-admin-and-rbac.md): Coach role and permissions
- [FR-010: Exercise Library](../a.Requirements/FR-010-exercise-library.md): Exercise selection and substitution

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
