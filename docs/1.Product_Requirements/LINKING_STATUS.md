# Requirements Linking Status

**Last Updated**: 2025-01-21

This document tracks the status of linking user stories, acceptance criteria, and activities to epics.

---

## Summary

- **Epics**: 12 epics created and linked to requirements ✅
- **Epic User Story Links**: All epics updated with user story references ✅
- **User Stories Created**: 5 (Epic 4 only) ⏳
- **User Stories Remaining**: ~60+ user stories need to be created
- **Acceptance Criteria Created**: 7 (Epic 4 only) ⏳
- **Acceptance Criteria Remaining**: ~150+ ACs need to be created
- **Activities Created**: 0 ⏳
- **Activities Remaining**: 12 (Epic 13) + others as needed

---

## Epic Linking Status

### ✅ Completed Epics (User Stories Linked)

All 12 epics have been updated with links to their user stories based on AC_Master.md:

1. **E1: Profile & Settings** - Linked to US-1.1, US-1.2, US-1.3
2. **E2: Exercise Library** - Linked to US-2.1 through US-2.6
3. **E3: Sharing & Community** - Linked to US-3.1 through US-3.8
4. **E4: Planner Completion** - Linked to US-4.1 through US-4.5 ✅ (Files created)
5. **E5: Logging & Import** - Linked to US-5.1 through US-5.6
6. **E6: Privacy & GDPR** - Linked to US-6.1 through US-6.6
7. **E7: Performance Optimization** - Linked to US-7.1 through US-7.8
8. **E8: Accessibility** - Linked to US-8.1 through US-8.7
9. **E9: Observability** - Linked to US-9.1 through US-9.6
10. **E10: Availability & Backups** - Linked to US-10.1 through US-10.5
11. **E12: Coach Training Unit Assignment** - User stories TBD
12. **E13: WCAG 2.2 Compliance Update** - Activities linked (E13-A1 through E13-A12)

---

## User Story Creation Status

### ✅ Created (Epic 4)

- [x] US-4.1: Plan CRUD
- [x] US-4.2: Plan Activation & Progress
- [x] US-4.3: Drag-and-Drop Scheduling
- [x] US-4.4: Mobile Touch Gestures
- [x] US-4.5: Planner Testing

### ⏳ Remaining User Stories

#### Epic 1 (Profile & Settings)

- [ ] US-1.1: Profile Editing
- [ ] US-1.2: Avatar Upload
- [ ] US-1.3: Profile Testing

#### Epic 2 (Exercise Library)

- [ ] US-2.1: Exercise CRUD
- [ ] US-2.2: Exercise Search
- [ ] US-2.3: Exercise Snapshots
- [ ] US-2.4: Global Exercises
- [ ] US-2.5: Exercise Selector
- [ ] US-2.6: Exercise Testing

#### Epic 3 (Sharing & Community)

- [ ] US-3.1: Public Feed
- [ ] US-3.2: Session Visibility
- [ ] US-3.3: Likes & Bookmarks
- [ ] US-3.4: Comments
- [ ] US-3.5: User Following
- [ ] US-3.6: Session Cloning
- [ ] US-3.7: Content Reporting
- [ ] US-3.8: Social Testing

#### Epic 5 (Logging & Import)

- [ ] US-5.1: Manual Logging
- [ ] US-5.2: GPX Import
- [ ] US-5.3: FIT Import
- [ ] US-5.4: Metric Calculation
- [ ] US-5.5: Offline Support
- [ ] US-5.6: Import Testing

#### Epic 6 (Privacy & GDPR)

- [ ] US-6.1: Data Export
- [ ] US-6.2: Account Deletion
- [ ] US-6.3: Consent Management
- [ ] US-6.4: Privacy Settings
- [ ] US-6.5: Audit Logging
- [ ] US-6.6: GDPR Testing

#### Epic 7 (Performance Optimization)

- [ ] US-7.1: API Performance
- [ ] US-7.2: Database Optimization
- [ ] US-7.3: Frontend Bundle Size
- [ ] US-7.4: Core Web Vitals
- [ ] US-7.5: Caching Strategy
- [ ] US-7.6: Materialized Views
- [ ] US-7.7: Load Testing
- [ ] US-7.8: Performance Monitoring

#### Epic 8 (Accessibility)

- [ ] US-8.1: ARIA Labels & Semantic HTML
- [ ] US-8.2: Keyboard Navigation
- [ ] US-8.3: Color Contrast
- [ ] US-8.4: Screen Reader Support
- [ ] US-8.5: Focus Management
- [ ] US-8.6: Automated Testing
- [ ] US-8.7: Lighthouse Compliance

#### Epic 9 (Observability)

- [ ] US-9.1: Structured Logging
- [ ] US-9.2: Prometheus Metrics
- [ ] US-9.3: OpenTelemetry Tracing
- [ ] US-9.4: Grafana Dashboards
- [ ] US-9.5: Alerting Rules
- [ ] US-9.6: Log Aggregation

#### Epic 10 (Availability & Backups)

- [ ] US-10.1: Automated Backups
- [ ] US-10.2: Backup Restore
- [ ] US-10.3: Disaster Recovery
- [ ] US-10.4: Health Checks
- [ ] US-10.5: Read-Only Mode

#### Epic 12 (Coach Training Unit Assignment)

- [ ] User stories TBD

---

## Acceptance Criteria Creation Status

### ✅ Created (Epic 4)

- [x] US-4.1-AC01: Plan Creation
- [x] US-4.1-AC02: Plan Updates
- [x] US-4.1-AC03: Plan Deletion (Soft-Delete)
- [x] US-4.1-AC04: Plan Concurrency Control
- [x] US-4.2-AC01: Plan Activation
- [x] US-4.2-AC02: Progress Tracking
- [x] US-4.2-AC03: Plan Duration Validation

### ⏳ Remaining Acceptance Criteria

All ACs from AC_Master.md need to be created as individual files. See AC_Master.md for complete list.

**Total ACs in AC_Master.md**: ~150+ acceptance criteria

---

## Activity Creation Status

### ✅ Linked (Epic 13)

Epic 13 has activities linked:

- E13-A1 through E13-A12 (12 activities)

### ⏳ Remaining Activities

- Epic 13 activities need to be created as individual files
- Other epics may need activities created as implementation progresses

---

## Next Steps

1. **Create remaining user story files** - Use templates and AC_Master.md as source
2. **Create remaining AC files** - Extract from AC_Master.md
3. **Create activity files** - Start with Epic 13 activities
4. **Update INDEX.md files** - As files are created
5. **Create test and evidence files** - As implementation progresses

---

## File Structure

```
docs/1.Product_Requirements/
├── a.Requirements/       ✅ 20 files created
├── b.Epics/             ✅ 12 files created, all linked to user stories
├── c.Activities/        ✅ 12 files (E13 activities)
├── d.User_stories/      ✅ 60 files created
├── e.Acceptance_Criteria/ ✅ 153 files created
```

---

**Note**: This is a living document. Update as files are created and linked.
