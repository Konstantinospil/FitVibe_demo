# Test Coverage Analysis & Improvement Plan

## Current Coverage Status
- Overall: ~50-57%
- Target: 70%+

## High-Impact Test Targets (Priority Order)

### Frontend - 0% Coverage (Highest Impact)
1. **Home.tsx** (1,250 lines) - Main landing page
2. **Insights.tsx** (849 lines) - Analytics dashboard
3. **Logger.tsx** (609 lines) - Workout logger
4. **Planner.tsx** (786 lines) - Workout planner
5. **Progress.tsx** (528 lines) - Progress tracking
6. **Admin Pages** (~1,100 lines total):
   - AdminDashboard.tsx
   - ContentReports.tsx
   - SystemControls.tsx
   - UserManagement.tsx
7. **jwt.ts** - JWT utility functions
8. **adminApi.ts** - Admin API client

### Backend - Low Coverage (High Impact)
1. **logs module** (0%) - Complete module with 5 files
2. **tracing.ts** (0%) - Observability tracing
3. **plans.service.ts** (31.05%) - Training plans business logic
4. **streaks.service.ts** (27.27%) - Streaks calculation
5. **seasonal-events.service.ts** (43.85%) - Event handling
6. **feed.controller.ts** (46.23%) - Social feed endpoints
7. **users.service.ts** (59.5%) - User management
8. **users.avatar.controller.ts** (52.26%) - Avatar upload

## Implementation Strategy

### Phase 1: Frontend Pages (Est. +15-20% coverage)
- Add basic render tests for all 0% pages
- Test key user interactions
- Mock API calls appropriately

### Phase 2: Backend Services (Est. +5-10% coverage)
- Test logs module completely
- Add tests for low-coverage services
- Focus on business logic paths

### Phase 3: Edge Cases (Est. +5% coverage)
- Error handling paths
- Authentication/authorization flows
- Validation logic

## Expected Outcome
Total estimated coverage increase: 25-35%
Final coverage: 75-85%
