# Epic 4: Planner Completion

---

**Epic ID**: E4  
**Requirement ID**: [FR-004](../requirements/FR-004-planner.md)  
**Title**: Planner Completion  
**Status**: Progressing  
**Priority**: Medium  
**Gate**: SILVER  
**Estimated Total Effort**: 12-18 story points  
**Created**: 2025-01-20  
**Updated**: 2025-01-21

---

## Description

Enable users to plan training sessions with drag-and-drop scheduling, conflict detection, plan management (CRUD, activation, progress tracking), and mobile touch gesture support.

## Business Value

Allows users to plan their training effectively, improving adherence and goal achievement. The planner is a core feature that differentiates FitVibe from simple logging apps.

## Related Activities

{Note: Activities will be created and linked here as they are defined}

## Related User Stories

- [US-4.1: Plan CRUD](../user-stories/US-4.1-plan-crud.md)
- [US-4.2: Plan Activation & Progress](../user-stories/US-4.2-plan-activation-progress.md)
- [US-4.3: Drag-and-Drop Scheduling](../user-stories/US-4.3-drag-and-drop-scheduling.md)
- [US-4.4: Mobile Touch Gestures](../user-stories/US-4.4-mobile-touch-gestures.md)
- [US-4.5: Planner Testing](../user-stories/US-4.5-planner-testing.md)

## Dependencies

### Epic Dependencies

- [FR-004: Planner](../requirements/FR-004-planner.md): Parent requirement
- [FR-001: User Registration](../requirements/FR-001-user-registration.md): User accounts
- [FR-002: Login & Session](../requirements/FR-002-login-and-session.md): Authentication
- [FR-003: Auth-Wall](../requirements/FR-003-authwall.md): Protected routes

### Blocking Dependencies

{Note: Blocking dependencies will be identified as activities are defined}

## Success Criteria

- Users can create, edit, and delete training plans
- Plans can be activated to generate scheduled sessions
- Drag-and-drop scheduling works smoothly (re-render ≤150ms)
- Conflict detection works client and server-side
- Mobile touch gestures work correctly
- Plan progress tracking is accurate

## Risks & Mitigation

- **Risk**: Performance degradation with many scheduled sessions
  - **Mitigation**: Efficient calendar rendering and pagination
- **Risk**: Concurrency conflicts may frustrate users
  - **Mitigation**: ETag support and clear conflict resolution
- **Risk**: Mobile drag-and-drop may be difficult on small screens
  - **Mitigation**: Touch-optimized UI and gesture support

---

**Last Updated**: 2025-01-21  
**Next Review**: 2025-02-21
