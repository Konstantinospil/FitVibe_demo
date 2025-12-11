---
name: test-fails-collect
description: Collect failing tests and differentiate between test-bugs and functional gaps
invokable: true
---

# Test Fails Collection Command

Collects failing tests and automatically classifies them as test-bugs or functional gaps.

## What It Does

1. **Runs Test Suites**:
   - Jest tests (backend) with JSON output
   - Vitest tests (frontend) with JSON output

2. **Collects Only Failing Tests**:
   - Filters test results to include only failures
   - Classifies each failure as:
     - **test-bug**: Issue with test code itself (missing imports, setup errors, test infrastructure)
     - **functional-gap**: Issue with implementation code (business logic bugs, assertion failures)
     - **unknown**: Cannot be classified automatically

3. **Updates Database**:
   - Creates/updates `.cursor/test-database/test-fails.json`
   - Tracks failure classification
   - Maintains statistics by failure type

## Usage

```bash
# Run tests and collect failures
pnpm test:fails:collect

# Or use the slash command
/test-fails-collect
```

## Database Structure

The test fails database includes:

- **Test Identification**: Unique ID, file path, test name, suite
- **Execution History**: Last run time (ISO timestamp), duration
- **Failure Classification**: test-bug, functional-gap, or unknown
- **Failure Information**: Failure messages for debugging
- **Statistics**: Aggregated metrics by type, category, and failure classification

## Failure Classification

### Test-Bug Indicators

Failures are classified as **test-bugs** when they indicate issues with:
- Test setup/teardown (beforeEach, afterEach, beforeAll, afterAll errors)
- Missing modules or dependencies
- Test infrastructure problems (timeouts, mock/spy/stub errors)
- Syntax errors in test files
- Reference errors in test code

### Functional Gap Indicators

Failures are classified as **functional-gaps** when they indicate:
- Assertion failures (expected vs actual mismatches)
- Business logic errors
- API errors
- Validation failures
- Authorization/authentication issues
- Database query failures

## Output

The script provides:

- Collection summary (Jest/Vitest failure counts)
- Classification breakdown (test-bugs vs functional-gaps)
- Database statistics by failure type
- List of failing tests with classification
- Exit code 1 if there are failing tests (for CI/CD)

## Performance

- **No LLM Usage**: Pure test execution and JSON parsing
- **Minimal Overhead**: Only collects failing tests
- **Fast Execution**: Parallel test execution where possible
- **Efficient Storage**: JSON database with incremental updates

## Example Output

```
🧪 Test Fails Collector - Starting collection of failing tests...

🔍 Collecting Jest test failures...
🔍 Collecting Vitest test failures...

📊 Collection Summary:
   Jest failures: 3
   Vitest failures: 1
   Total failing tests collected: 4

✅ Test fails database updated:
   Total failing tests: 4
   Test bugs: 1
   Functional gaps: 2
   Unknown/Unclassified: 1

📁 Database saved to: .cursor/test-database/test-fails.json

❌ Failing tests breakdown:
   Test bugs (test code issues): 1
   Functional gaps (implementation bugs): 2
   Unknown/Unclassified: 1

📋 Sample failing tests (first 10):
   🐛 tests/backend/auth.test.ts: should setup auth correctly [test-bug]
   ⚙️ tests/backend/users.test.ts: should validate user input [functional-gap]
   ⚙️ tests/frontend/Login.test.tsx: should handle login error [functional-gap]
   ❓ tests/backend/utils.test.ts: should process data [unknown]

💡 Use the test fails database to plan repairs and track progress.
```

## Related Commands

- `/test` - Run tests for current file or create tests
- `/test-fix` - Fix failing tests using LLM analysis
- `/bug:collect` - Collect linter and type errors (code quality bugs)
- `pnpm test:fix` - Fix failing tests programmatically

## Next Steps

After running test:fails:collect:

1. **Review Classifications**: Check the database for test-bugs vs functional-gaps
2. **Fix Test Bugs**: Fix test infrastructure issues first
3. **Fix Functional Gaps**: Address implementation bugs discovered by tests
4. **Track Progress**: Database tracks classification and fix status

## CI/CD Integration

The script exits with code 1 if there are failing tests, making it suitable for CI/CD:

```yaml
- name: Collect test failures
  run: pnpm test:fails:collect
  continue-on-error: true

- name: Check test failures
  run: |
    if [ -f .cursor/test-database/test-fails.json ]; then
      TOTAL=$(jq '.stats.total' .cursor/test-database/test-fails.json)
      TEST_BUGS=$(jq '.stats.testBugs' .cursor/test-database/test-fails.json)
      FUNC_GAPS=$(jq '.stats.functionalGaps' .cursor/test-database/test-fails.json)
      echo "Found $TOTAL failing tests ($TEST_BUGS test-bugs, $FUNC_GAPS functional-gaps)"
      if [ "$TOTAL" -gt 0 ]; then
        exit 1
      fi
    fi
```







