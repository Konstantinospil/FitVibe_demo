# User Stories: Coach Training Unit Assignment (FR-012)

**Epic**: FR-012 - Coach Training Unit Assignment  
**Status**: Open  
**Created**: 2025-11-23  
**Last Updated**: 2025-11-23

---

## Story Format

Each user story follows the format:

- **As a** [persona/role]
- **I want to** [action]
- **So that** [benefit]

With detailed acceptance criteria and technical notes.

---

## User Stories

### US-012-001: Create Training Unit

**As a** coach  
**I want to** create a reusable training unit with a name, exercises, sets, reps, and distance  
**So that** I can save standardized workouts for repeated use with my athletes

**Priority**: Must-have  
**Story Points**: 5  
**Activity**: E12-A3, E12-A9

**Acceptance Criteria**:

- [ ] Coach can navigate to "Training Units" section
- [ ] Coach can click "Create Training Unit" button
- [ ] Coach can enter a training unit name (required, max 120 chars)
- [ ] Coach can add exercises to the training unit:
  - Select exercise from exercise library
  - Specify number of sets (1-100)
  - Specify number of reps (1-1000 or "AMRAP")
  - Specify distance in meters (for running/cycling exercises, 1-100000)
  - Specify rest period in seconds (optional, 0-3600)
  - Add notes (optional, max 1000 chars)
- [ ] Coach can reorder exercises (drag-and-drop or up/down arrows)
- [ ] Coach can remove exercises from the training unit
- [ ] Coach can specify repeat count for the entire sequence (1-20, default 1)
- [ ] Coach can save the training unit
- [ ] Coach receives confirmation message on successful save
- [ ] Training unit appears in coach's library after creation

**Technical Notes**:

- Use existing exercise library (FR-010)
- Store training unit in new `training_units` table
- Store exercises in `training_unit_exercises` table with order_index
- Validate that at least one exercise is present before saving
- Use Zod schemas for validation

**Dependencies**: FR-010 (Exercise Library), E12-A2 (Data Model)

---

### US-012-002: View Training Unit Library

**As a** coach  
**I want to** view all my saved training units in a list  
**So that** I can quickly find and select training units to assign

**Priority**: Must-have  
**Story Points**: 3  
**Activity**: E12-A8

**Acceptance Criteria**:

- [ ] Coach can view a list of all their training units
- [ ] Each training unit displays:
  - Name
  - Number of exercises
  - Estimated duration (if calculable)
  - Last modified date
  - Usage count (how many times assigned)
- [ ] Coach can search training units by name
- [ ] Coach can click on a training unit to view details
- [ ] Coach can see archived training units in a separate section (optional)
- [ ] List supports pagination if coach has 20+ training units

**Technical Notes**:

- Query `training_units` table filtered by `coach_id = current_user_id`
- Include usage statistics from assignment history
- Implement search with case-insensitive name matching

**Dependencies**: E12-A2 (Data Model), E12-A3 (CRUD API)

---

### US-012-003: Edit Training Unit

**As a** coach  
**I want to** edit an existing training unit  
**So that** I can update workouts as training programs evolve

**Priority**: Must-have  
**Story Points**: 3  
**Activity**: E12-A3, E12-A9

**Acceptance Criteria**:

- [ ] Coach can open a training unit for editing
- [ ] Coach can modify the training unit name
- [ ] Coach can add, remove, or reorder exercises
- [ ] Coach can modify exercise parameters (sets, reps, distance, rest, notes)
- [ ] Coach can modify repeat count
- [ ] Coach can save changes
- [ ] Changes do not affect already-assigned sessions (only future assignments)
- [ ] Coach receives confirmation on successful update

**Technical Notes**:

- Use same form as creation
- Preserve training unit ID
- Update `updated_at` timestamp
- Consider versioning for future enhancement (not required for MVP)

**Dependencies**: E12-A2 (Data Model), E12-A3 (CRUD API)

---

### US-012-004: Delete/Archive Training Unit

**As a** coach  
**I want to** archive a training unit  
**So that** I can remove unused workouts while preserving assignment history

**Priority**: Must-have  
**Story Points**: 2  
**Activity**: E12-A3

**Acceptance Criteria**:

- [ ] Coach can archive a training unit from the library view
- [ ] Coach is prompted to confirm archiving
- [ ] Archived training unit is hidden from active library
- [ ] Archived training unit is preserved in database (soft delete)
- [ ] Already-assigned sessions are not affected
- [ ] Coach cannot assign archived training units (validation error)

**Technical Notes**:

- Use soft delete pattern (set `archived_at` timestamp)
- Filter archived units from active queries
- Preserve data for historical reference

**Dependencies**: E12-A2 (Data Model), E12-A3 (CRUD API)

---

### US-012-005: Establish Coach-Athlete Relationship

**As a** coach  
**I want to** establish a consent-based relationship with an athlete  
**So that** I can assign training units to them

**As an** athlete  
**I want to** grant consent to a coach  
**So that** the coach can assign training sessions to me

**Priority**: Must-have  
**Story Points**: 5  
**Activity**: E12-A1, E12-A11

**Acceptance Criteria**:

- [ ] Athlete can send a coach invitation (or coach can request access)
- [ ] Coach receives notification of invitation/request
- [ ] Coach can accept or decline the invitation
- [ ] Athlete can grant or revoke coach access
- [ ] Relationship status is clearly displayed (pending, active, revoked)
- [ ] Coach can view list of athletes with active relationships
- [ ] Athlete can view list of coaches with active relationships
- [ ] Revoked relationships prevent new assignments but preserve existing sessions

**Technical Notes**:

- Create `coach_athlete_relationships` table with:
  - `coach_id` (FK to users)
  - `athlete_id` (FK to users)
  - `status` (pending, active, revoked)
  - `consent_granted_at` (timestamptz)
  - `consent_revoked_at` (timestamptz, nullable)
  - `created_at`, `updated_at`
- Enforce unique constraint on (coach_id, athlete_id)
- Validate coach has 'coach' role
- Validate athlete has 'user' or 'athlete' role

**Dependencies**: FR-001 (User Registration), FR-008 (RBAC)

---

### US-012-006: Assign Training Unit to Single Athlete

**As a** coach  
**I want to** assign a training unit to an athlete on a specific date  
**So that** the athlete receives the workout in their planner

**Priority**: Must-have  
**Story Points**: 5  
**Activity**: E12-A5, E12-A10

**Acceptance Criteria**:

- [ ] Coach can select a training unit from their library
- [ ] Coach can click "Assign" button
- [ ] Coach can select an athlete from their athlete list (only active relationships)
- [ ] Coach can select a date for the assignment
- [ ] Coach can modify exercise parameters before confirming:
  - Change weight/resistance
  - Substitute exercises
  - Modify sets, reps, distance
  - Modify intensity/pace
- [ ] Coach can preview the modified training unit
- [ ] Coach can confirm assignment
- [ ] System creates a session in athlete's planner with status "planned"
- [ ] Session is owned by the athlete (owner_id = athlete_id)
- [ ] Session includes reference to source training unit
- [ ] Coach receives confirmation message
- [ ] Athlete receives notification (if notifications enabled)

**Technical Notes**:

- Validate coach-athlete relationship exists and is active
- Create session using existing session creation logic (FR-004)
- Apply exercise repeat logic (duplicate exercises based on repeat count)
- Apply modifications to exercises before creating session
- Store assignment metadata (coach_id, training_unit_id, assigned_at)
- Use transaction to ensure atomicity

**Dependencies**: E12-A1 (Relationships), E12-A3 (Training Units), E12-A4 (Repeat Logic), E12-A6 (Modifications), FR-004 (Planner)

---

### US-012-007: Assign Training Unit with Exercise Modifications

**As a** coach  
**I want to** modify exercise parameters when assigning a training unit  
**So that** I can personalize workouts for each athlete's level and needs

**Priority**: Must-have  
**Story Points**: 5  
**Activity**: E12-A6, E12-A10

**Acceptance Criteria**:

- [ ] Coach can modify weight/resistance for exercises (e.g., add 10kg to pull-ups)
- [ ] Coach can substitute one exercise for another (e.g., handstand push-ups for normal push-ups)
- [ ] Coach can modify sets, reps, or distance for individual exercises
- [ ] Coach can modify target intensity/pace for running/endurance exercises (e.g., "5:30/km pace")
- [ ] Modifications are applied per-athlete (different athletes can have different modifications)
- [ ] Coach can see original values and modified values side-by-side
- [ ] Coach can reset modifications to original values
- [ ] Modifications are preserved in the created session
- [ ] Original training unit remains unchanged

**Technical Notes**:

- Store modifications as part of assignment metadata
- Apply modifications when creating session exercises
- Validate substituted exercises exist and are accessible
- Support intensity/pace as text or structured data (e.g., pace in min/km format)
- Use existing exercise library for substitutions

**Dependencies**: E12-A5 (Assignment API), FR-010 (Exercise Library)

---

### US-012-008: Bulk Assign Training Unit to Multiple Athletes

**As a** coach  
**I want to** assign the same training unit to multiple athletes at once  
**So that** I can efficiently distribute workouts to my team

**Priority**: Should-have  
**Story Points**: 5  
**Activity**: E12-A7, E12-A10

**Acceptance Criteria**:

- [ ] Coach can select multiple athletes (checkboxes or multi-select)
- [ ] Coach can select a training unit
- [ ] Coach can select a date for all assignments
- [ ] Coach can choose to apply same modifications to all athletes OR customize per-athlete
- [ ] Coach can preview assignments before confirming
- [ ] Coach can confirm bulk assignment
- [ ] System creates sessions for all selected athletes
- [ ] System processes assignments efficiently (≤ 3s for 10 athletes)
- [ ] Coach receives summary:
  - Number of successful assignments
  - Number of failed assignments (if any)
  - Error messages for failures
- [ ] Failed assignments do not prevent successful ones (transaction per athlete)

**Technical Notes**:

- Use bulk insert for efficiency
- Process each athlete assignment in separate transaction (partial success allowed)
- Validate relationships for all athletes before processing
- Return detailed results for each athlete
- Consider rate limiting for very large bulk operations (e.g., > 50 athletes)

**Dependencies**: E12-A5 (Assignment API), E12-A6 (Modifications)

---

### US-012-009: View Assignment History

**As a** coach  
**I want to** view a history of all training unit assignments  
**So that** I can track what I've assigned and see completion rates

**Priority**: Nice-to-have  
**Story Points**: 3  
**Activity**: E12-A12

**Acceptance Criteria**:

- [ ] Coach can view a list of all assignments
- [ ] Each assignment shows:
  - Training unit name
  - Athlete name
  - Assignment date
  - Target session date
  - Session status (planned, in_progress, completed, canceled)
  - Completion date (if completed)
- [ ] Coach can filter assignments by:
  - Training unit
  - Athlete
  - Date range
  - Status
- [ ] Coach can see completion rate per training unit
- [ ] Coach can see which athletes have completed assigned sessions
- [ ] Coach can navigate to the assigned session (if coach has access)

**Technical Notes**:

- Query assignment history from assignment metadata table
- Join with sessions table to get status
- Calculate completion rates with aggregation queries
- Support pagination for large history lists

**Dependencies**: E12-A5 (Assignment API), FR-004 (Sessions)

---

### US-012-010: Exercise Repeat/Rounds Implementation

**As a** coach  
**I want to** specify that an exercise sequence should be repeated multiple times  
**So that** I can create circuit-style workouts

**Priority**: Must-have  
**Story Points**: 3  
**Activity**: E12-A4

**Acceptance Criteria**:

- [ ] Coach can specify repeat count (1-20) when creating/editing training unit
- [ ] Repeat count applies to the entire exercise sequence
- [ ] When assigning training unit, exercises are duplicated according to repeat count
- [ ] Each round maintains the same exercise order
- [ ] Each round maintains the same exercise parameters (unless modified)
- [ ] UI clearly displays "Repeat X times" indicator
- [ ] Session created from training unit contains all repeated exercises with correct order_index

**Technical Notes**:

- Store repeat_count in training_units table
- When creating session from training unit, duplicate exercises in session_exercises
- Calculate order_index: if 3 exercises with repeat_count=2, create exercises with order_index 1-6
- Preserve exercise parameters for each duplicate
- Consider performance for large repeat counts (e.g., 20 repeats × 10 exercises = 200 session exercises)

**Dependencies**: E12-A2 (Data Model), E12-A5 (Assignment API)

---

## Story Dependencies

```
US-012-005 (Relationships)
    ↓
US-012-001 (Create Training Unit)
    ↓
US-012-002 (View Library)
US-012-003 (Edit Training Unit)
US-012-004 (Archive Training Unit)
    ↓
US-012-010 (Repeat Logic)
    ↓
US-012-006 (Assign to Single Athlete)
    ↓
US-012-007 (Modifications)
    ↓
US-012-008 (Bulk Assignment)
    ↓
US-012-009 (Assignment History)
```

## Story Point Summary

- **Must-have**: 26 story points
- **Should-have**: 5 story points
- **Nice-to-have**: 3 story points
- **Total**: 34 story points

## Implementation Phases

### Phase 1: Foundation (Must-have)

1. US-012-005: Coach-Athlete Relationships
2. US-012-001: Create Training Unit
3. US-012-002: View Library
4. US-012-010: Repeat Logic
5. US-012-006: Assign to Single Athlete
6. US-012-007: Modifications

### Phase 2: Enhancement (Should-have)

7. US-012-003: Edit Training Unit
8. US-012-004: Archive Training Unit
9. US-012-008: Bulk Assignment

### Phase 3: Analytics (Nice-to-have)

10. US-012-009: Assignment History

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-23
