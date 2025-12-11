---
name: test-fix
description: Fix failing tests by analyzing root cause and applying appropriate fixes
invokable: true
---

Fix failing tests by analyzing whether the failure is due to incorrect test implementation or actual app bugs, then applying appropriate fixes using LLM.

## Usage

```bash
# Fix failing tests
pnpm test:fix

# Or use the slash command
/test-fix
```

## Process

1. **Load Test Database**: Reads failing tests from `.cursor/test-database/tests.json`
2. **Analyze Root Cause**: Uses OpenAI LLM to determine if failure is due to:
   - **Test Bug**: Incorrect test implementation (wrong expectations, setup issues, etc.)
   - **App Bug**: Actual bug in application code that the test correctly catches
3. **Generate Fix**: Uses LLM to generate appropriate fix following repo standards
4. **Apply Fix**: Applies fix to test file or source file based on analysis
5. **Verify**: Runs test to verify fix works
6. **Update Database**: Updates test database with results

## Requirements

- **Test Database**: Run `pnpm test:fails:collect` first to create/update the test fails database
- **OpenAI API Key**:
  - Can be set in `.env` file in root directory: `OPENAI_API_KEY=your-key-here`
  - Or as environment variable: `export OPENAI_API_KEY='your-key-here'`
- **LLM Provider**: Uses OpenAI by default (set `LLM_PROVIDER=openai` in `.env` file or environment variable)

## Safety Features

- Creates backup before making changes
- Reverts changes if test still fails after fix
- Limits attempts per test (max 3 attempts)
- Limits number of tests per run (max 10)
- Follows repository standards without reducing functionality

## Fix Strategy

The fixer follows these principles:

1. **Repository Standards**:
   - TypeScript strict mode (no 'any' types)
   - Proper error handling with HttpError utility
   - Controller → Service → Repository pattern
   - Zod schemas for validation
   - i18n for user-facing text
   - Configuration from env.ts (no hardcoded values)
   - Accessibility requirements

2. **No Functionality Reduction**:
   - Maintains all existing behavior
   - Doesn't remove features or simplify logic
   - Keeps all error handling intact
   - Preserves all validation rules

3. **Appropriate Fixes**:
   - If test bug: Fixes the test to correctly validate implementation
   - If app bug: Fixes the implementation to match requirements

## Example

```bash
# First, collect failing tests
pnpm test:fails:collect

# Then fix failing tests
pnpm test:fix
```

## Related Commands

- `/test` - Run tests or create tests
- `pnpm test:fails:collect` - Collect failing tests and classify them
- `pnpm bug:fix` - Fix bugs (non-test failures)

## Agent Reference

For detailed testing patterns and best practices, see:
- **Test Manager Agent**: `.cursor/agents/test_manager.md`
- **Testing & QA Plan**: `docs/4.Testing_and_Quality_Assurance_Plan/`

