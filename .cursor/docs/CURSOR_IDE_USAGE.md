# Using Cursor IDE's Built-in AI Features

Cursor IDE has powerful built-in AI features that you can use directly within the IDE, without needing external API keys or the workflow system.

## Overview

Cursor IDE's built-in AI is integrated into the editor and provides:
- **AI Chat** - Interactive chat with AI assistant
- **Composer** - Multi-file code generation and editing
- **Autocomplete** - AI-powered code suggestions
- **Code Actions** - AI-assisted refactoring and fixes

## Key Features

### 1. AI Chat (Cmd+L / Ctrl+L)

Open the AI chat panel to:
- Ask questions about your codebase
- Get explanations of code
- Request code changes
- Debug issues
- Generate code snippets

**Usage:**
1. Press `Cmd+L` (Mac) or `Ctrl+L` (Windows/Linux)
2. Type your question or request
3. The AI has context of your entire codebase
4. It can reference files, make edits, and explain code

**Example:**
```
"Implement profile edit form validation for Epic 1, Activity E1-A6"
"Show me how avatar upload is handled in the backend"
"Add error handling to the profile edit API endpoint"
```

### 2. Composer (Cmd+I / Ctrl+I)

Composer is Cursor's multi-file editing feature:
- Edit multiple files at once
- Generate entire features
- Refactor across files
- Maintain context across changes

**Usage:**
1. Press `Cmd+I` (Mac) or `Ctrl+I` (Windows/Linux)
2. Describe what you want to build or change
3. Cursor will generate/edit code across multiple files
4. Review and accept/reject changes

**Example:**
```
"Implement the profile edit frontend component with form validation:
- Create ProfileEditForm component in apps/frontend/src/components/
- Add form fields: alias, weight, fitness_level, training_frequency
- Include validation using Zod schemas
- Add error handling and success messages
- Use i18n for all text labels"
```

### 3. Inline Autocomplete (Tab)

As you type, Cursor suggests completions:
- Context-aware suggestions
- Multi-line completions
- Understands your codebase patterns

**Usage:**
- Just type normally
- Press `Tab` to accept suggestions
- Press `Esc` to dismiss

### 4. Code Actions

Right-click on code to see AI-powered actions:
- "Explain this code"
- "Refactor this function"
- "Add error handling"
- "Generate tests"

## Using Cursor IDE for Feature Development

### For Epic 1: Profile & Settings

Instead of using the workflow system, you can use Cursor IDE directly:

#### Activity E1-A6: Profile Edit Frontend

1. **Open Composer** (`Cmd+I`):
   ```
   "Create a profile edit form component for FitVibe:
   - Component: ProfileEditForm in apps/frontend/src/components/
   - Fields: alias (max 50 chars), weight (20-500kg), fitness_level, training_frequency
   - Validation: Use Zod schemas matching backend validation
   - Error handling: Display validation errors, network errors
   - Success: Show success toast on save
   - i18n: All labels and messages from i18n
   - API: Use existing API service to call PATCH /api/v1/users/me
   - Follow existing component patterns in the codebase"
   ```

2. **Review Generated Code**:
   - Cursor will create the component file
   - Check that it follows project patterns
   - Verify i18n usage
   - Ensure accessibility (ARIA labels, keyboard nav)

3. **Test the Component**:
   - Use Cursor's chat to generate tests:
     ```
     "Generate React Testing Library tests for ProfileEditForm component"
     ```

#### Activity E1-A7: Avatar Upload Frontend

1. **Use Composer**:
   ```
   "Create avatar upload component:
   - Component: AvatarUpload in apps/frontend/src/components/
   - Features: File input, image preview (128x128), upload progress, error handling
   - API: POST /api/v1/users/avatar
   - Validation: File size (max 5MB), MIME type (image/*)
   - Preview: Show selected image before upload
   - Progress: Show upload progress indicator
   - Success: Update avatar display after upload
   - i18n: All text from i18n
   - Accessibility: Proper labels, keyboard navigation"
   ```

#### Activity E1-A8: Profile Tests

1. **Use Chat** (`Cmd+L`):
   ```
   "Generate integration and E2E tests for profile editing:
   - Integration tests: Test ProfileEditForm component with API mocking
   - E2E tests: Test full profile edit flow with Playwright
   - Cover: Form validation, API calls, error handling, success cases
   - Use existing test patterns from the codebase"
   ```

## Workflow Comparison

### Workflow System (Python Scripts)
- ✅ Automated multi-agent orchestration
- ✅ Structured handoffs between agents
- ✅ Full project tracking and documentation
- ❌ Requires API keys (OpenAI/Ollama)
- ❌ More setup and configuration

### Cursor IDE Built-in AI
- ✅ No API keys needed
- ✅ Immediate, interactive feedback
- ✅ Full codebase context automatically
- ✅ Visual code editing
- ❌ Manual step-by-step execution
- ❌ No automated workflow orchestration

## Best Practices

### 1. Be Specific in Requests

**Bad:**
```
"Add profile editing"
```

**Good:**
```
"Create ProfileEditForm component with:
- Form fields: alias (max 50), weight (20-500kg), fitness_level, training_frequency
- Zod validation matching backend schemas
- Error handling and success messages
- i18n for all text
- Follow existing component patterns"
```

### 2. Reference Existing Code

Cursor understands your codebase, but you can help:
```
"Create ProfileEditForm similar to UserSettingsForm but with these fields: ..."
"Use the same validation pattern as ExerciseForm"
"Follow the API service pattern from authService.ts"
```

### 3. Iterate Incrementally

Break large features into smaller requests:
1. First: "Create the form component structure"
2. Then: "Add validation logic"
3. Then: "Add error handling"
4. Finally: "Add success messages and loading states"

### 4. Review Generated Code

Always review what Cursor generates:
- Check it follows project patterns
- Verify TypeScript types are correct
- Ensure i18n is used (not hardcoded strings)
- Check accessibility attributes
- Verify error handling

### 5. Use Chat for Questions

Ask Cursor about your codebase:
```
"How does the profile API endpoint handle validation?"
"Show me examples of form validation in the frontend"
"What's the pattern for API error handling?"
```

## Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Open Chat | `Cmd+L` | `Ctrl+L` |
| Open Composer | `Cmd+I` | `Ctrl+I` |
| Accept Suggestion | `Tab` | `Tab` |
| Dismiss Suggestion | `Esc` | `Esc` |
| Next Suggestion | `Alt+]` | `Alt+]` |
| Previous Suggestion | `Alt+[` | `Alt+[` |

## Tips for Epic 1 Implementation

### Profile Edit Frontend (E1-A6)

1. **Start with Composer**:
   - Request the full component with all requirements
   - Cursor will generate the component following your patterns

2. **Use Chat for Refinement**:
   - "Add better error messages"
   - "Improve accessibility"
   - "Add loading states"

3. **Generate Tests**:
   - "Create React Testing Library tests for this component"

### Avatar Upload (E1-A7)

1. **Use Composer for Component**:
   - Request full upload component with preview

2. **Use Chat for Integration**:
   - "Integrate this with the profile page"
   - "Add avatar display to user menu"

### Tests (E1-A8)

1. **Use Chat for Test Generation**:
   - "Generate integration tests for profile editing"
   - "Create E2E tests for avatar upload with Playwright"

## When to Use Each Approach

### Use Cursor IDE When:
- ✅ You want immediate, interactive feedback
- ✅ You're exploring or prototyping
- ✅ You need to understand existing code
- ✅ You want to make quick iterations
- ✅ You don't want to set up API keys

### Use Workflow System When:
- ✅ You want fully automated feature implementation
- ✅ You need structured multi-agent coordination
- ✅ You want complete documentation and tracking
- ✅ You're implementing complex, multi-step features
- ✅ You have API keys set up (Ollama/OpenAI)

## Example: Complete Epic 1 with Cursor IDE

### Step 1: Profile Edit Form
```
Cmd+I → "Create ProfileEditForm component with all required fields, validation, and error handling"
```

### Step 2: Avatar Upload
```
Cmd+I → "Create AvatarUpload component with preview, progress, and error handling"
```

### Step 3: Integration
```
Cmd+L → "Integrate ProfileEditForm and AvatarUpload into the profile settings page"
```

### Step 4: Tests
```
Cmd+L → "Generate comprehensive tests for profile editing and avatar upload"
```

### Step 5: Review
- Review all generated code
- Test manually
- Fix any issues with Chat

## Slash Commands

Cursor IDE supports slash commands for quick access to common workflows. Use `/workflow` to trigger the feature development workflow system:

### Workflow Command

```
/workflow feature-development <instructions>
```

**Examples:**

```
/workflow Epic 1, Activity E1-A6: Profile Edit Frontend
/workflow {"epic": "E1", "activities": ["E1-A6", "E1-A7"]}
/workflow Implement profile editing with form validation
```

The workflow command:
- Parses your instructions (natural language, JSON, or Epic/Activity references)
- Guides you through the complete feature development workflow
- Uses Cursor IDE's built-in AI (Chat and Composer) instead of external APIs
- Generates code, tests, and documentation
- Helps create PRs and update project tracking

See `.cursor/commands/workflow.md` for complete documentation.

## Summary

Cursor IDE's built-in AI is perfect for:
- **Interactive development** - Get immediate feedback
- **Code exploration** - Understand your codebase
- **Quick iterations** - Make changes and see results
- **No setup** - Works out of the box
- **Slash commands** - Quick access to workflows via `/workflow`

For Epic 1, you can complete all activities (E1-A6, E1-A7, E1-A8) entirely within Cursor IDE using:
- **Composer** (`Cmd+I`) - For code generation
- **Chat** (`Cmd+L`) - For questions and refinements
- **Slash commands** (`/workflow`) - For automated workflows

