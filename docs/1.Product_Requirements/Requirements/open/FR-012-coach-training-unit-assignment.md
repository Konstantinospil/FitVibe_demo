# Requirements Document

**Request ID**: REQ-2025-11-23-001
**Feature**: Coach Training Unit Assignment
**Status**: Complete
**Timestamp**: 2025-11-23T00:00:00Z
**Analyst**: requirements-analyst

---

## Executive Summary

Enable coaches to define reusable training units (named workout sessions with exercises, sets, reps, and distance) and assign them to athletes on specific dates. Coaches can modify exercise parameters (weight, exercise substitution, intensity/pace) during assignment to personalize training for each athlete's level and needs.

---

## Business Context

- **Business Objective**: Enable coaches to efficiently create, manage, and distribute standardized training units to their athletes while maintaining flexibility to customize workouts based on individual athlete capabilities and progression needs.
- **Success Criteria**:
  - Coaches can create and save training units in under 2 minutes
  - Coaches can assign a training unit to multiple athletes in under 30 seconds per athlete
  - Athletes receive assigned sessions in their planner with appropriate modifications
  - 90% of coaches report the feature saves them time compared to manual session creation
- **Priority**: High
- **Target Users**: Coaches (primary), Athletes (secondary - receive assigned sessions)

---

## Functional Requirements

### FR-012-001: Training Unit Definition

**Description**: Coaches must be able to create and save reusable training units with a name, exercises, sets, reps, distance, and exercise repeat/rounds capability.

**Priority**: Must-have

**Acceptance Criteria**:

- [ ] Coach can create a training unit with a name (e.g., "Upper Body Circuit", "Endurance Workout")
- [ ] Coach can add exercises to the training unit in a specific order
- [ ] Coach can specify for each exercise:
  - Number of sets
  - Number of reps (or "AMRAP" / "max reps")
  - Distance (for running/cycling exercises) in meters
  - Rest period (optional)
  - Notes (optional)
- [ ] Coach can specify that the entire exercise sequence should be repeated N times (e.g., "Repeat twice")
- [ ] Coach can save the training unit for future use
- [ ] Coach can view a list of all their saved training units
- [ ] Coach can edit existing training units
- [ ] Coach can delete training units (soft delete to preserve history)
- [ ] Training units are private to the coach by default (not visible to other users)

**Use Cases**:

- Primary: Coach creates a training unit with: Pull-ups (3 sets × 25 reps), Push-ups (3 sets × 25 reps), Run (1000m), repeated twice
- Edge Cases:
  - Training unit with no exercises (should be prevented)
  - Training unit with 50+ exercises (should be supported but may need pagination in UI)
  - Training unit with exercises that are later archived (should preserve snapshot)

---

### FR-012-002: Exercise Repeat/Rounds Support

**Description**: Coaches must be able to specify that a sequence of exercises should be repeated multiple times (rounds/circuits).

**Priority**: Must-have

**Acceptance Criteria**:

- [ ] Coach can specify a "repeat count" (1-100) for the entire exercise sequence
- [ ] When a training unit is assigned, the repeat count is preserved
- [ ] The UI clearly displays that exercises will be repeated N times
- [ ] When a session is created from a training unit, all exercises are duplicated according to the repeat count
- [ ] Each round maintains the same exercise order and parameters

**Use Cases**:

- Primary: Coach creates a training unit with 3 exercises and sets "Repeat twice", resulting in 6 exercises total when assigned
- Edge Cases:
  - Repeat count of 1 (default, no duplication needed)
  - Repeat count of 100 (should be supported but may impact performance)

---

### FR-012-003: Training Unit Assignment to Athletes

**Description**: Coaches must be able to assign training units to one or more athletes on specific dates.

**Priority**: Must-have

**Acceptance Criteria**:

- [ ] Coach can select one or more athletes from their athlete list (requires coach-athlete relationship/consent)
- [ ] Coach can select a specific date for the assignment
- [ ] Coach can assign the same training unit to multiple athletes in a single operation
- [ ] When assigned, a session is created in the athlete's planner with status "planned"
- [ ] The session title defaults to the training unit name but can be modified
- [ ] The session is owned by the athlete (owner_id = athlete's user_id)
- [ ] The session includes a reference to the source training unit (for tracking and updates)
- [ ] Coach receives confirmation of successful assignment(s)
- [ ] Athlete receives a notification when a session is assigned (if notifications are enabled)

**Use Cases**:

- Primary: Coach assigns a training unit to 5 athletes on a specific date, creating 5 planned sessions
- Edge Cases:
  - Assignment to athlete who has no consent/relationship with coach (should be prevented)
  - Assignment to athlete who already has a session on the same date (should allow but may show conflict warning)
  - Assignment date in the past (should be allowed but may show warning)

---

### FR-012-004: Exercise Parameter Modification During Assignment

**Description**: When assigning a training unit, coaches must be able to modify exercise parameters (weight, exercise substitution, intensity/pace) to personalize the workout for each athlete.

**Priority**: Must-have

**Acceptance Criteria**:

- [ ] Coach can modify weight/resistance for exercises (e.g., weighted vs unweighted pull-ups)
- [ ] Coach can substitute one exercise for another (e.g., handstand push-ups instead of normal push-ups)
- [ ] Coach can modify target intensity/pace for running/endurance exercises (e.g., "run with 5:30 pace")
- [ ] Coach can modify sets, reps, or distance for individual exercises
- [ ] Modifications are applied per-athlete (different athletes can have different modifications)
- [ ] Modifications are preserved in the created session
- [ ] Coach can see a preview of the modified training unit before confirming assignment
- [ ] Original training unit remains unchanged (modifications only affect the assigned session)

**Use Cases**:

- Primary: Coach assigns a training unit to Athlete A with weighted pull-ups (10kg) and to Athlete B with unweighted pull-ups
- Primary: Coach assigns a training unit to Athlete C, substituting handstand push-ups for normal push-ups
- Primary: Coach assigns a training unit to Athlete D, setting run pace to 5:30/km
- Edge Cases:
  - Modifying an exercise that is later archived (should preserve the modified exercise in the session)
  - Modifying to an exercise the athlete doesn't have access to (should validate and prevent or allow)

---

### FR-012-005: Coach-Athlete Relationship Management

**Description**: Coaches must have a consent-based relationship with athletes before assigning training units.

**Priority**: Must-have

**Acceptance Criteria**:

- [ ] Coach can view a list of athletes they have an active relationship with
- [ ] Coach-athlete relationship requires explicit consent from the athlete
- [ ] Coach can only assign training units to athletes with an active relationship
- [ ] System validates coach-athlete relationship before allowing assignment
- [ ] Coach receives clear error message if attempting to assign to athlete without relationship
- [ ] Athlete can revoke coach access (which prevents future assignments but preserves existing sessions)

**Use Cases**:

- Primary: Coach views their athlete list and selects athletes for assignment
- Edge Cases:
  - Coach attempts to assign to athlete who revoked access (should be prevented with clear message)
  - Coach-athlete relationship is suspended (should prevent new assignments)

---

### FR-012-006: Training Unit Library Management

**Description**: Coaches must be able to manage their library of training units (view, search, organize, archive).

**Priority**: Should-have

**Acceptance Criteria**:

- [ ] Coach can view all their training units in a list/grid view
- [ ] Coach can search training units by name
- [ ] Coach can filter training units by tags/categories (if implemented)
- [ ] Coach can see usage statistics (how many times assigned, last assigned date)
- [ ] Coach can duplicate a training unit to create a variant
- [ ] Coach can archive training units (soft delete)
- [ ] Archived training units are hidden from assignment UI but preserved for historical sessions

**Use Cases**:

- Primary: Coach searches for a training unit by name in their library of 50+ training units
- Edge Cases:
  - Coach has 100+ training units (should support pagination)

---

### FR-012-007: Bulk Assignment

**Description**: Coaches must be able to assign the same training unit to multiple athletes efficiently.

**Priority**: Should-have

**Acceptance Criteria**:

- [ ] Coach can select multiple athletes (checkboxes or multi-select)
- [ ] Coach can apply the same modifications to all selected athletes OR customize per-athlete
- [ ] Coach can assign to all selected athletes with a single action
- [ ] System processes bulk assignments efficiently (≤ 3s for 10 athletes)
- [ ] Coach receives summary of successful and failed assignments
- [ ] Failed assignments show clear error messages

**Use Cases**:

- Primary: Coach selects 10 athletes and assigns a training unit to all on the same date with same modifications
- Edge Cases:
  - One athlete in the selection has no relationship (should skip that athlete and continue with others)
  - Assignment fails for some athletes due to validation errors (should show partial success)

---

### FR-012-008: Assignment History and Tracking

**Description**: Coaches must be able to view history of training unit assignments and track athlete completion.

**Priority**: Nice-to-have

**Acceptance Criteria**:

- [ ] Coach can view a history of all training unit assignments
- [ ] Coach can see which athletes have completed assigned sessions
- [ ] Coach can see completion rate per training unit
- [ ] Coach can filter assignments by date range, athlete, or training unit
- [ ] Coach can see when an assigned session was modified by the athlete

**Use Cases**:

- Primary: Coach reviews which athletes completed a specific training unit last week
- Edge Cases:
  - Athlete deleted an assigned session (should be tracked in history)

---

## Non-Functional Requirements

### NFR-012-001: Performance

**Description**: Training unit assignment operations must complete within acceptable time limits.

**Acceptance Criteria**:

- Single assignment: ≤ 1s
- Bulk assignment (10 athletes): ≤ 3s
- Training unit creation: ≤ 500ms
- Training unit list loading: ≤ 500ms for 50 units

---

### NFR-012-002: Security

**Description**: Training unit assignment must respect privacy and access control.

**Acceptance Criteria**:

- Only coaches with active athlete relationships can assign sessions
- Assigned sessions are private to the athlete by default
- All assignment operations are audited (who assigned what to whom and when)
- Coach cannot access athlete's other sessions beyond what they assigned

---

### NFR-012-003: Data Integrity

**Description**: Training unit modifications and assignments must preserve data integrity.

**Acceptance Criteria**:

- Training unit deletion does not affect already-assigned sessions
- Exercise archival does not break assigned sessions (snapshot preserved)
- Assignment failures are transactional (all-or-nothing for bulk operations)
- Training unit modifications are versioned (optional, for future enhancement)

---

### NFR-012-004: Usability

**Description**: Training unit creation and assignment must be intuitive and efficient.

**Acceptance Criteria**:

- Coach can create a training unit with 5 exercises in under 2 minutes
- Assignment UI supports keyboard navigation (WCAG 2.1 AA)
- Error messages are clear and actionable
- Mobile-responsive design for coach operations

---

## Dependencies

### Technical Dependencies

- **FR-001 (User Registration)**: Required for coach and athlete accounts
- **FR-002 (Login & Session)**: Required for authentication
- **FR-008 (Admin & RBAC)**: Required for coach role and permissions
- **FR-004 (Planner)**: Required for session creation and athlete planner
- **FR-010 (Exercise Library)**: Required for exercise selection and substitution
- **Coach-Athlete Relationship System**: New feature required - consent-based relationship management

### Feature Dependencies

- **Notification System**: For notifying athletes of assigned sessions (if notifications are implemented)
- **Session Cloning/Recurrence**: May leverage existing session recurrence logic for repeat functionality

### External Dependencies

- None

---

## Constraints

### Technical Constraints

- Must use existing session data model (sessions, session_exercises, exercise_sets tables)
- Must respect existing RBAC system and coach role permissions
- Must maintain backward compatibility with existing sessions
- Must use UTC timestamps for all date/time fields

### Business Constraints

- Coach-athlete relationships require explicit consent (GDPR/privacy requirement)
- Training units are coach-owned and private by default
- Assigned sessions become athlete-owned (athlete can modify/delete)

---

## Assumptions

- Coaches have already established consent-based relationships with athletes (this may need to be implemented separately)
- Exercise library (FR-010) is implemented and available for exercise selection
- Session planner (FR-004) is functional and can display assigned sessions
- Coaches typically assign to 1-20 athletes per training unit
- Training units typically contain 1-20 exercises
- Repeat counts are typically 1-5 (rarely exceed 10)

---

## Risks & Issues

- **Risk 1**: Coach-athlete relationship system not yet implemented
  - **Mitigation**: Implement relationship management as part of this epic or as a prerequisite
  - **Impact**: High - blocks assignment functionality

- **Risk 2**: Performance degradation with large repeat counts (e.g., 100 repeats)
  - **Mitigation**: Implement reasonable limits (max 20 repeats) and optimize session creation logic
  - **Impact**: Medium - edge case but should be handled

- **Risk 3**: Exercise substitution may reference archived exercises
  - **Mitigation**: Preserve exercise snapshots in assigned sessions (already implemented for sessions)
  - **Impact**: Low - existing pattern

- **Risk 4**: Bulk assignment failures may leave partial state
  - **Mitigation**: Use database transactions for bulk operations
  - **Impact**: Medium - data integrity concern

---

## Open Questions

- **Q1**: Should training units support tags/categories for organization?
  - **Answer**: Nice-to-have, can be added in future iteration

- **Q2**: Should coaches be able to create training unit templates from existing sessions?
  - **Answer**: Should-have, but can be added in future iteration

- **Q3**: Should training units support exercise groups/supersets?
  - **Answer**: Out of scope for MVP, can be added later

- **Q4**: Should assigned sessions be editable by athletes, or read-only?
  - **Answer**: Athletes should be able to edit (they own the session), but coach modifications should be preserved as "suggested" values

- **Q5**: Should training units support time-based exercises (e.g., "plank for 60 seconds")?
  - **Answer**: Yes, should support duration in addition to reps/distance

---

## Handoff Information

**Next Agent**: implementation-agent
**Status**: Ready
**Notes**:

- This feature requires coach-athlete relationship management to be implemented first (or as part of this epic)
- Consider reusing existing session creation logic and extending it for assignment workflow
- Training units can be implemented as a new entity (training_units table) or as a special type of workout_template
- Exercise repeat/rounds can be implemented by duplicating exercises in the session_exercises table with appropriate order_index values
- Modification UI should allow per-athlete customization in bulk assignment flow

**Estimated Effort**: 15-20 story points (Epic-level estimate)

---

## Related Requirements

- **FR-004**: Planner (session creation and management)
- **FR-008**: Admin & RBAC (coach role and permissions)
- **FR-010**: Exercise Library (exercise selection and management)
- **FR-011**: Sharing & Community (may inform future public training unit sharing)

---

## Acceptance Criteria Summary

### Must-Have (MVP)

- ✅ Training unit creation with exercises, sets, reps, distance
- ✅ Exercise repeat/rounds support
- ✅ Assignment to athletes on specific dates
- ✅ Exercise parameter modification (weight, substitution, intensity)
- ✅ Coach-athlete relationship validation

### Should-Have

- ✅ Training unit library management
- ✅ Bulk assignment

### Nice-to-Have

- ✅ Assignment history and tracking

---

**Document Version**: 1.0
**Last Updated**: 2025-11-23
**Next Review**: After implementation planning
