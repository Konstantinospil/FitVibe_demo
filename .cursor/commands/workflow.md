---
name: workflow
description: Execute feature development workflow using Cursor IDE's built-in AI (no external API calls needed)
invokable: true
---

# Workflow Command - Feature Development

Execute the complete feature development workflow using Cursor IDE's built-in AI. This command simulates the multi-agent workflow system but uses Cursor's Chat and Composer instead of external API calls.

## Quick Start

```
/workflow Epic 1, Activities E1-A6, E1-A7, E1-A8
/workflow {"epic": "E1", "activities": ["E1-A6", "E1-A7", "E1-A8"]}
/workflow Implement profile editing with form validation and avatar upload
```

## How It Works

This command guides you through the feature development workflow phases using Cursor IDE's built-in features:

1. **Phase 1: Requirements & Design** - Uses Chat (`Cmd+L`) to analyze requirements
2. **Phase 2: Implementation** - Uses Composer (`Cmd+I`) to generate code
3. **Phase 3: Quality Assurance** - Uses Chat to generate tests and reviews
4. **Phase 4: Documentation & Deployment** - Uses Chat to update docs and create PRs

## Workflow Phases

### Phase 1: Requirements & Design (30-45 minutes)

#### Step 1: Requirements Analysis

**Action**: I'll use Chat to analyze your requirements.

**What I'll do**:
- Parse your input (epic reference, activity IDs, or natural language)
- Load context from `PROJECT_EPICS_AND_ACTIVITIES.md`
- Identify what needs to be built
- Ask clarifying questions if needed

**You'll see**:
```
📋 Requirements Analysis
Analyzing Epic 1: Profile & Settings
Activities: E1-A6 (Profile Edit Frontend), E1-A7 (Avatar Upload Frontend), E1-A8 (Profile Tests)

Questions:
1. Should profile edit include all fields or specific ones?
2. What validation rules should match backend?
...
```

#### Step 2: Technical Design

**Action**: I'll use Chat to create technical design.

**What I'll do**:
- Design API contracts (if backend changes needed)
- Plan component structure (if frontend changes needed)
- Identify dependencies
- Create implementation plan

**You'll see**:
```
🏗️ Technical Design
Component: ProfileEditForm
- Location: apps/frontend/src/components/ProfileEditForm.tsx
- Props: { userId: string, onSave: () => void }
- State: form data, validation errors, loading
- API: PATCH /api/v1/users/me
...
```

### Phase 2: Implementation (1-4 hours)

#### Step 3: Code Generation

**Action**: I'll use Composer (`Cmd+I`) to generate code.

**What I'll do**:
- Generate all required files
- Follow project patterns and standards
- Include validation, error handling, i18n
- Ensure accessibility compliance

**You'll see**:
```
💻 Implementation
Generating ProfileEditForm component...
[Composer will generate the component with all requirements]
```

**Composer Prompt I'll Use**:
```
Create ProfileEditForm component for FitVibe:
- Location: apps/frontend/src/components/ProfileEditForm.tsx
- Fields: alias (max 50 chars), weight (20-500kg), fitness_level, training_frequency
- Validation: Zod schemas matching backend (apps/backend/src/modules/users/*.schemas.ts)
- Error handling: Display validation errors, network errors
- Success: Show success toast on save
- i18n: All labels and messages from i18n (apps/frontend/src/i18n/)
- API: Use existing API service pattern (apps/frontend/src/services/api.ts)
- Follow existing component patterns in apps/frontend/src/components/
- Accessibility: WCAG 2.1 AA compliant (ARIA labels, keyboard navigation)
- TypeScript: Strict mode, proper types
```

### Phase 3: Quality Assurance (30-60 minutes)

#### Step 4: Test Generation

**Action**: I'll use Chat to generate tests.

**What I'll do**:
- Generate unit tests (Vitest + React Testing Library)
- Generate integration tests
- Generate E2E tests (Playwright)
- Ensure ≥80% coverage (≥90% for critical paths)

**You'll see**:
```
🧪 Test Generation
Generating tests for ProfileEditForm...
- Unit tests: ProfileEditForm.test.tsx
- Integration tests: profile.integration.test.tsx
- E2E tests: profile.e2e.spec.ts
```

**Chat Prompt I'll Use**:
```
Generate comprehensive tests for ProfileEditForm component:
- Unit tests: Test form validation, field interactions, error display
- Integration tests: Test API calls, error handling, success flow
- E2E tests: Test complete profile edit flow with Playwright
- Coverage: ≥80% overall, ≥90% for critical paths
- Use existing test patterns from apps/frontend/tests/
- Follow Vitest and React Testing Library patterns
```

#### Step 5: Code Review

**Action**: I'll use Chat to review code quality.

**What I'll do**:
- Check TypeScript strict mode compliance
- Verify patterns (Controller→Service→Repository for backend, React patterns for frontend)
- Check i18n usage (no hardcoded strings)
- Verify accessibility (WCAG 2.1 AA)
- Check error handling

**You'll see**:
```
🔍 Code Review
Reviewing ProfileEditForm component...
✅ TypeScript: Strict mode compliant
✅ i18n: All text uses i18n
✅ Accessibility: ARIA labels present
⚠️  Missing: Loading state during save
```

#### Step 6: Security Review

**Action**: I'll use Chat to review security.

**What I'll do**:
- Check input validation
- Verify XSS prevention (frontend)
- Check API security (backend)
- Review OWASP Top 10 compliance

**You'll see**:
```
🔒 Security Review
Reviewing security...
✅ Input validation: Zod schemas used
✅ XSS prevention: React escapes by default
✅ API security: Proper authentication
```

### Phase 4: Documentation & Deployment (15-30 minutes)

#### Step 7: Documentation Update

**Action**: I'll use Chat to update documentation.

**What I'll do**:
- Update PRD if UX changes
- Update TDD if technical changes
- Update ADRs if architectural decisions
- Update RTM (Requirements Traceability Matrix)

**You'll see**:
```
📚 Documentation Update
Updating documentation...
- PRD: Profile editing section updated
- TDD: API contracts documented
```

#### Step 8: Version Control

**Action**: I'll guide you to create a PR.

**What I'll do**:
- Generate conventional commit message
- Create PR description
- Suggest branch name

**You'll see**:
```
📝 Version Control
Suggested commit message:
feat(profile): implement profile edit frontend (E1-A6)

- Add ProfileEditForm component with validation
- Integrate with PATCH /api/v1/users/me endpoint
- Add error handling and success messages
- Ensure WCAG 2.1 AA accessibility compliance

Suggested branch: feat/epic-1-profile-edit-frontend
```

#### Step 9: Project Tracking

**Action**: I'll update project tracking.

**What I'll do**:
- Update `PROJECT_EPICS_AND_ACTIVITIES.md`
- Mark activities as complete
- Update status

**You'll see**:
```
📊 Project Tracking
Updating PROJECT_EPICS_AND_ACTIVITIES.md...
✅ E1-A6: Profile Edit Frontend - Complete
✅ E1-A7: Avatar Upload Frontend - Complete
✅ E1-A8: Profile Tests - Complete
```

## Input Formats

### Format 1: Epic and Activity References

```
/workflow Epic 1, Activities E1-A6, E1-A7, E1-A8
/workflow E1: E1-A6, E1-A7, E1-A8
/workflow Epic 1, all pending activities
```

### Format 2: JSON

```
/workflow {"epic": "E1", "activities": ["E1-A6", "E1-A7", "E1-A8"]}
/workflow {"epic": "E1", "activities": "all"}
```

### Format 3: Natural Language

```
/workflow Implement profile editing with form validation
/workflow Create avatar upload component with preview
/workflow Add profile edit frontend and avatar upload
```

## Workflow Execution Flow

```
User: /workflow Epic 1, Activities E1-A6, E1-A7, E1-A8

→ Phase 1: Requirements & Design
  ├─ Requirements Analysis (Chat)
  ├─ Technical Design (Chat)
  └─ ADR Creation (if needed, Chat)

→ Phase 2: Implementation
  ├─ Backend Implementation (Composer, if needed)
  ├─ Frontend Implementation (Composer)
  └─ API Contract Validation (Chat)

→ Phase 3: Quality Assurance
  ├─ Test Generation (Chat)
  ├─ Code Review (Chat)
  └─ Security Review (Chat)

→ Phase 4: Documentation & Deployment
  ├─ Documentation Update (Chat)
  ├─ Version Control (Guidance)
  └─ Project Tracking (Chat)
```

## Example: Complete Epic 1

### Input
```
/workflow Epic 1, Activities E1-A6, E1-A7, E1-A8
```

### Execution

**Phase 1: Requirements & Design**
```
📋 Requirements Analysis
Epic 1: Profile & Settings
- E1-A6: Profile Edit Frontend (🚧 In Progress)
- E1-A7: Avatar Upload Frontend (🚧 In Progress)
- E1-A8: Profile Tests (⏳ Pending)

Requirements:
- Profile edit form with validation
- Avatar upload with preview
- Comprehensive tests

✅ Requirements clear, proceeding to design...
```

**Phase 2: Implementation**
```
💻 Implementation - Profile Edit Frontend (E1-A6)

[I'll use Composer to generate ProfileEditForm]
Press Cmd+I and I'll guide you through the component creation...

Component structure:
- ProfileEditForm.tsx
- ProfileEditForm.test.tsx
- Integration with existing API service
```

**Phase 3: Quality Assurance**
```
🧪 Test Generation
Generating tests for ProfileEditForm and AvatarUpload...

[I'll use Chat to generate test files]
```

**Phase 4: Documentation & Deployment**
```
📚 Documentation Update
📝 Version Control
📊 Project Tracking
```

## Interactive Guidance

This command provides **interactive guidance** through each phase:

1. **I'll tell you what to do** at each step
2. **I'll provide the prompts** to use with Composer/Chat
3. **I'll review results** and suggest improvements
4. **I'll guide you** through the entire workflow

## Benefits

✅ **No API Keys** - Uses Cursor IDE's built-in AI  
✅ **Interactive** - You control each step  
✅ **Structured** - Follows the complete workflow  
✅ **Comprehensive** - Covers all phases  
✅ **Project-Aware** - Understands your codebase  

## Tips

1. **Be Specific**: Include epic/activity IDs or clear descriptions
2. **Review Each Step**: Check generated code before proceeding
3. **Iterate**: Use Chat to refine generated code
4. **Follow Patterns**: I'll ensure code follows project standards

## Integration with Existing Workflow

This command **simulates** the Python workflow system but:
- Uses Cursor IDE's AI instead of external APIs
- Provides interactive guidance instead of automated execution
- Lets you review and approve each step
- Maintains the same structure and quality standards

## Error Handling

If something goes wrong:
- I'll identify the issue
- Suggest fixes using Chat
- Guide you to resolve it
- Continue from where we left off

## Next Steps After Workflow

After completing the workflow:
1. Review all generated code
2. Run tests: `pnpm test`
3. Check linting: `pnpm lint`
4. Create PR with suggested commit message
5. Update project tracking (I'll help with this)

---

**Note**: This command uses Cursor IDE's built-in AI features (Chat and Composer) to simulate the multi-agent workflow system. No external API calls are made, and you have full control over each step.




