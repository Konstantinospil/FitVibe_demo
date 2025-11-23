# Skipped Tests Analysis & Recommendations

## Summary

- **Test Suites Skipped**: 2
- **Individual Tests Skipped**: 53
- **Total Tests**: 1749
- **Skip Rate**: ~3% (53/1749)

## Skipped Test Suites

### 1. `tests/seeds/seeds.test.ts` - Database Seeds Tests

**Reason**: Database unavailable  
**Skip Logic**: `describe.skip` when `isDatabaseAvailable === false`

**Location**: `apps/backend/tests/seeds/seeds.test.ts:7`

```typescript
const describeFn = isDatabaseAvailable ? describe : describe.skip;
```

**Why Skipped**:

- Requires a PostgreSQL database connection
- Checks for database availability via `resolveDatabaseConnection()`
- If no database is available, entire test suite is skipped

**Tests Affected**: ~30+ tests (all tests in the suite)

**How to Avoid Skipping**:

1. **Option A**: Ensure database is available
   - Set `TEST_DATABASE_URL` environment variable
   - Or set `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
   - Or start a local PostgreSQL instance

2. **Option B**: Use in-memory database for tests
   - Consider using `pg-mem` for unit tests
   - Keep real database only for integration tests

3. **Option C**: Make tests conditional but not skipped
   - Use `describe.only` in CI, `describe.skip` locally
   - Or use environment variable to control execution

### 2. `tests/migrations/migrations.test.ts` - Database Migrations Tests

**Reason**: Database unavailable  
**Skip Logic**: `describe.skip` when `isDatabaseAvailable === false`

**Location**: `apps/backend/tests/migrations/migrations.test.ts:7`

```typescript
const describeFn = isDatabaseAvailable ? describe : describe.skip;
```

**Why Skipped**:

- Requires a PostgreSQL database connection
- Tests database migration up/down operations
- If no database is available, entire test suite is skipped

**Tests Affected**: ~20+ tests (all tests in the suite)

**How to Avoid Skipping**:

- Same as seeds tests (see above)

## Database Availability Check

Both test suites use `resolveDatabaseConnection()` which:

1. Collects connection candidates from environment variables
2. Checks each candidate for availability
3. Returns `{ connectionString, isAvailable }`

**Connection Priority**:

1. `TEST_DATABASE_URL`
2. `TEST_DATABASE_HOST` + other PG env vars
3. `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
4. `DB_HOST`, `DATABASE_HOST`
5. `localhost` (default)

**Availability Check**:

- Spawns a Node.js process to test connection
- Uses a 5-second timeout
- Returns `false` if connection fails or times out

## Recommendations

### High Priority: Make Tests Run in CI

**Current State**: Tests are skipped when database is unavailable  
**Problem**: CI should have database available, but tests might still be skipped

**Solution 1**: Ensure CI has database

- ✅ Already done - CI workflow waits for PostgreSQL (`.github/workflows/ci.yml:118-132`)
- But tests might still skip if connection check fails

**Solution 2**: Improve database availability check

- Add retry logic to connection check
- Increase timeout for CI environments
- Add better error messages

**Solution 3**: Use test database setup in CI

- Ensure `TEST_DATABASE_URL` is set in CI
- Or ensure all PG environment variables are set

### Medium Priority: Better Skip Handling

**Current**: Entire test suite is skipped silently  
**Better**:

1. Log why tests are skipped
2. Provide clear instructions on how to enable
3. Consider failing in CI if database is unavailable (rather than skipping)

**Implementation**:

```typescript
if (!isDatabaseAvailable) {
  console.warn("⚠️  Database tests skipped. Set TEST_DATABASE_URL to run.");
  if (process.env.CI) {
    console.error("❌ Database unavailable in CI - this should not happen!");
    // Optionally: process.exit(1) in CI
  }
}
```

### Low Priority: Use In-Memory Database for Unit Tests

**Consideration**: Some tests might not need a real database

- Seeds tests: Need real DB (testing actual seed data)
- Migration tests: Need real DB (testing actual migrations)
- But other tests could use `pg-mem`

**Trade-off**:

- ✅ Faster tests
- ✅ No external dependencies
- ❌ Less realistic (might miss real DB issues)

## Action Items

### Immediate (Fix CI)

1. ✅ Verify CI has database available (already done)
2. ⚠️ Add retry logic to database availability check
3. ⚠️ Add logging when tests are skipped
4. ⚠️ Consider failing in CI if database unavailable

### Short Term (Improve Developer Experience)

1. Add clear error messages when database is unavailable
2. Document how to set up test database
3. Add `test:db` script that checks database availability

### Long Term (Optimize)

1. Evaluate if any tests can use `pg-mem`
2. Consider separating unit tests (no DB) from integration tests (with DB)
3. Add test database setup script

## Code Changes Needed

### 1. Improve Database Availability Check

**File**: `apps/backend/tests/seeds/seeds.test.ts` and `apps/backend/tests/migrations/migrations.test.ts`

**Current**:

```typescript
const describeFn = isDatabaseAvailable ? describe : describe.skip;
```

**Improved**:

```typescript
const describeFn = isDatabaseAvailable ? describe : describe.skip;

if (!isDatabaseAvailable) {
  console.warn("⚠️  Database tests skipped. To enable:");
  console.warn("   1. Set TEST_DATABASE_URL environment variable, or");
  console.warn("   2. Set PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE, or");
  console.warn("   3. Start a local PostgreSQL instance");
  if (process.env.CI) {
    console.error("❌ ERROR: Database unavailable in CI environment!");
    console.error("   This indicates a CI configuration issue.");
    // Don't fail, but make it very visible
  }
}
```

### 2. Add Retry Logic to Connection Check

**File**: `apps/backend/tests/seeds/seeds.test.ts` (function `checkDatabaseAvailability`)

**Current**: Single attempt with 5-second timeout  
**Improved**: Retry 3 times with exponential backoff

### 3. Add Test Database Setup Script

**New File**: `apps/backend/scripts/setup-test-db.mjs`

```javascript
#!/usr/bin/env node
// Script to verify test database is available
import { checkDatabaseAvailability } from "./test-db-utils.mjs";

const isAvailable = checkDatabaseAvailability();
if (!isAvailable) {
  console.error("❌ Test database is not available");
  console.error("Set TEST_DATABASE_URL or start PostgreSQL");
  process.exit(1);
}
console.log("✅ Test database is available");
```

## Testing the Fix

After implementing improvements:

1. **Test with database available**:

   ```bash
   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/test_db pnpm test
   ```

   - Should run all tests (no skips)

2. **Test without database**:

   ```bash
   # Unset all DB env vars
   pnpm test
   ```

   - Should show clear warning messages
   - Should skip tests gracefully

3. **Test in CI**:
   - Verify database is available
   - Verify tests run (not skipped)
   - If database unavailable, should fail loudly

## Metrics

### Current State

- Skipped test suites: 2
- Skipped tests: 53
- Skip rate: ~3%

### Target State

- Skipped test suites: 0 (in CI)
- Skipped tests: 0 (in CI)
- Skip rate: 0% (in CI)
- Local development: Graceful skip with clear messages

## Conclusion

The skipped tests are **intentional and reasonable** - they require a database connection. However, we can improve:

1. **CI**: Ensure tests always run (database should be available)
2. **Developer Experience**: Clear messages when tests are skipped
3. **Reliability**: Better connection checking with retries

The skip mechanism itself is fine - we just need to ensure:

- CI always has database available
- Developers know how to enable tests
- Clear feedback when tests are skipped
