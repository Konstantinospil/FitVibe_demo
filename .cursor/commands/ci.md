# CI/CD Workflow Command

Run each CI/CD step locally and separately. Fix all issues before proceeding to the next step.

## Workflow Steps

Execute the following steps in order. **CRITICAL**: After each step, if there are failures:
1. Analyze the root cause of the failure
2. Fix ALL issues completely before moving to next step
3. Re-run the same step to verify the fix worked
4. Only proceed to the next step after the current step passes

## Step-by-Step Instructions

### Step 1: Install Dependencies
```bash
pnpm install --frozen-lockfile
```
- **On failure**: Check lockfile is up to date, resolve dependency conflicts
- **Note**: Uses `--frozen-lockfile` to match CI workflow (prevents lockfile changes)
- **Success criteria**: Installation completes without errors

### Step 2: Lint Check
```bash
pnpm lint:check
```
- **On failure**:
  - Run `pnpm lint -- --fix`
  - Read the linting errors carefully
  - Fix each linting issue (unused imports, formatting, etc.)
  - DO NOT remove functionality to fix lints
  - Re-run `pnpm lint:check` to verify all issues resolved
- **Success criteria**: Zero warnings, zero errors

### Step 3: Type Check
```bash
pnpm typecheck
```
- **On failure**:
  - Read TypeScript errors carefully
  - Fix type errors by adding proper types, not by using `any`
  - DO NOT remove functionality to fix types
  - Re-run `pnpm typecheck` to verify all type errors resolved
- **Success criteria**: No TypeScript errors

### Step 4: Run Tests with Coverage
```bash
pnpm test -- --coverage --runInBand
```
- **On failure**:
  - Read test failure messages carefully
  - Identify if it's a test bug or implementation bug
  - **If test bug**: Fix the test to properly test the functionality
  - **If implementation bug**: Fix the implementation to make the test pass
  - **NEVER remove or skip tests to make them pass**
  - **NEVER remove functionality to make tests pass**
  - Add missing mocks if needed (e.g., `req.get()` method for Express Request)
  - Re-run `pnpm test -- --coverage --runInBand` to verify fixes
- **Success criteria**: All tests passing (or >95% pass rate acceptable)

### Step 5: Coverage Gate Check
```bash
pnpm test:coverage:gate ./coverage/coverage-summary.json
```
- **On failure**:
  - Analyse the missing coverage.
  - Write or append to a report at `.\apps\docs\dev\Coverage_weaknesses.md` with the missing coverage classified by priority based on the potential impact on test coverage of the missing test, with higher impact items being on the top of the report.
  - Implement the highest impact test and rerun `/ci`
- **Note**: Matches CI workflow. The script auto-discovers coverage files from workspace directories, but the argument is included for consistency with CI.
- **Success criteria**: Coverage gate passes or is explicitly skipped (currently temporarily disabled - see script comments)

### Step 6: Baseline Assertion Check
```bash
node tests/qa/assert-baseline.js
```
- **On failure**: Investigate baseline requirements, ensure all required files exist
- **Success criteria**: "QA baseline validated successfully"

### Step 7: i18n Check
```bash
pnpm i18n:check
```
- **On failure**: Add missing translation keys to locale files
- **Success criteria**: "i18n coverage check passed" with matching key counts

### Step 8: Feature Flags Check
```bash
node tests/qa/check-feature-flags.js
```
- **On failure**: Verify feature flag defaults are correct
- **Success criteria**: "Feature flag defaults verified"

### Step 9: Production Build
```bash
pnpm build
```
- **On failure**:
  - Read build errors carefully
  - Fix TypeScript errors in source code (not test files)
  - Install missing dependencies if needed
  - Fix syntax errors
  - Re-run `pnpm build` to verify build succeeds
- **Success criteria**: Both frontend and backend build successfully

## Important Rules

1. **Never remove functionality** - Always fix issues by improving code, not removing features
2. **Never skip tests** - Fix failing tests, don't disable them
3. **Fix root causes** - Don't apply superficial fixes that hide problems
4. **Verify each fix** - Always re-run the failing step after fixing to confirm success
5. **One step at a time** - Complete each step fully before moving to the next
6. **Read error messages carefully** - They contain the information needed to fix issues
7. **Keep context** - Track what you've fixed to avoid introducing new bugs

## After Completion

Once all steps pass, summarize:
- Total issues fixed
- Test pass rates (Backend: X/Y, Frontend: X/Y)
- Any warnings or concerns
- Build output sizes

## Example Usage

User: `/ci`

Claude: I'll run the complete CI/CD workflow step by step, fixing any issues before proceeding to the next step.

**Step 1: Installing dependencies...**
[runs and checks for issues]

**Step 2: Running lint check...**
[if fails, fixes issues and re-runs until it passes]

[continues through all steps]

**CI/CD Workflow Complete!**
Summary:
- ✅ All 9 steps passed
- Backend tests: 943/947 passing (99.8%)
- Frontend tests: 269/289 passing (93%)
- Production build: 292.75 kB (gzipped: 94.26 kB)
