# Memory Issue Investigation & Fixes

## Problem

Tests were running out of memory (heap limit reached) after running for approximately 2 hours. This was causing test failures and preventing proper test execution.

## Root Causes Identified

1. **QueryClient Instances Not Being Cleaned Up**
   - Multiple tests create QueryClient instances for React Query
   - These instances maintain internal caches and timers that were not being cleared
   - Over time, these accumulated and consumed increasing amounts of memory

2. **Fake Timers Not Always Restored**
   - Some tests use `vi.useFakeTimers()` but don't always restore them in error cases
   - This can cause timers to leak and interfere with other tests

3. **React Query Refetch Intervals**
   - Tests with refetch intervals (like `useHealthStatus`) create timers that continue running
   - These timers need to be properly managed when using fake timers

4. **No Test Isolation**
   - QueryClient instances were shared or not properly isolated between tests
   - Memory from previous tests was accumulating

5. **Too Many Parallel Threads**
   - Running 4 threads in parallel increased memory pressure
   - Each thread runs its own test environment and QueryClient instances

## Fixes Applied

### 1. Added QueryClient Cleanup

All tests that create QueryClient instances now include `afterEach` cleanup:

- `queryClient.clear()` - Clears all cached queries
- `queryClient.removeQueries()` - Removes all query observers
- Set `gcTime: 0` in QueryClient config to disable garbage collection delays

### 2. Global Timer Cleanup

Added to `tests/frontend/setupTests.ts`:

- Global `afterEach` hook that checks for and restores fake timers
- Ensures timers are always cleaned up even if tests fail

### 3. Reduced Parallel Threads

Changed `maxThreads` from 4 to 1 in `vite.config.ts`:

- Reduces memory pressure to minimum
- Each thread consumes significant memory for its test environment
- Single thread ensures maximum stability and minimal memory footprint

### 4. Added Test Timeouts

Added explicit timeouts in `vite.config.ts`:

- `testTimeout: 10000` - 10 second timeout per test
- `hookTimeout: 10000` - 10 second timeout for hooks
- `teardownTimeout: 5000` - 5 second timeout for teardown
- Prevents tests from hanging indefinitely

### 5. Increased Node.js Memory Limit

Updated `run-vitest.mjs` to use `--max-old-space-size=6144`:

- Increases heap size from default ~2GB to 6GB
- Provides more headroom for test execution
- Can be overridden via NODE_OPTIONS environment variable
- Memory limit is set both via NODE_OPTIONS env var and directly in Node.js process args

## Files Modified

1. `apps/frontend/vite.config.ts` - Reduced threads, added timeouts
2. `apps/frontend/scripts/run-vitest.mjs` - Added memory limit flag
3. `tests/frontend/setupTests.ts` - Added global timer cleanup
4. `apps/frontend/tests/hooks/useHealthStatus.test.tsx` - Added QueryClient cleanup
5. `apps/frontend/tests/hooks/useDashboardAnalytics.test.tsx` - Added QueryClient cleanup
6. `apps/frontend/tests/pages/Progress.test.tsx` - Added QueryClient cleanup
7. `apps/frontend/tests/pages/Insights.test.tsx` - Added QueryClient cleanup

## Testing Recommendations

1. Run tests with memory monitoring:

   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" pnpm test
   ```

2. Monitor test execution time - tests should complete in reasonable time (< 5 minutes)

3. If memory issues persist:
   - Further reduce `maxThreads` to 1
   - Split large test suites into smaller groups
   - Investigate specific tests that consume excessive memory
   - Consider using `--no-coverage` for faster runs during development

4. Check for memory leaks in specific tests:
   - Use Node.js `--expose-gc` flag with manual garbage collection
   - Profile memory usage during test runs
   - Identify tests that cause memory to grow continuously

## Additional Notes

- The canvas mock in `setupTests.ts` uses WeakMap which should prevent memory leaks
- React Query's cache system is designed to manage memory, but requires proper cleanup in tests
- Fake timers can interfere with React Query's internal timers if not managed properly
