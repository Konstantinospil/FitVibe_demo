# Test Metrics Analysis

## Summary

- **Total test files**: 27
- **Passed**: 26
- **Failed**: 1 (ProtectedRoute.test.tsx - hangs/timeout)

## Performance Metrics

### Average Test Time (excluding ProtectedRoute)

- **Average**: ~3.6 seconds per test file
- **Median**: ~3.4 seconds per test file

### Top 5 Slowest Tests (excluding ProtectedRoute)

1. Planner.test.tsx - 6.49s - PASSED
2. Home.test.tsx - 4.90s - PASSED
3. ToastContext.test.tsx - 4.70s - PASSED
4. AuthContext.test.tsx - 4.63s - PASSED
5. Progress.test.tsx - 4.20s - PASSED

### Fastest Tests

1. ErrorBoundary.test.tsx - 2.65s - PASSED
2. idleScheduler.test.ts - 2.81s - PASSED
3. logger.test.ts - 2.89s - PASSED
4. idempotency.test.ts - 2.96s - PASSED
5. Button.test.tsx - 3.06s - PASSED

## Memory Usage

### Memory Statistics

- **Max peak memory**: 5.44MB (VisibilityBadge.test.tsx)
- **Average peak memory**: ~5.1MB per test
- **Memory efficiency**: Excellent - all tests use < 5.5MB peak memory

### Memory Usage by Category

- **UI Components**: ~4.8-5.4MB peak
- **Pages**: ~4.8-5.4MB peak
- **Utils**: ~5.0-5.1MB peak
- **Hooks**: ~5.2MB peak
- **Contexts**: ~5.1-5.1MB peak

## Issues Identified

### 1. ProtectedRoute.test.tsx - CRITICAL

- **Status**: Hangs/timeout
- **Duration**: 577+ seconds (killed)
- **Issue**: Infinite redirect loop - Navigate component creates redirect loop in test environment
- **Root Cause**: Test doesn't properly mock router structure, causing Navigate to redirect infinitely
- **Fix Required**: Update test to properly structure routes or mock Navigate behavior

### 2. Chart Component Warnings

- **Status**: Non-blocking warnings
- **Issue**: Recharts warnings about zero width/height in test environment
- **Impact**: Tests pass but show warnings
- **Fix Optional**: Can be ignored or fixed by setting explicit dimensions in test environment

### 3. React Router Future Flag Warnings

- **Status**: Non-blocking warnings
- **Issue**: React Router v7 deprecation warnings
- **Impact**: Tests pass but show warnings
- **Fix Optional**: Can be addressed when upgrading to React Router v7

## Test Execution Time Breakdown

### Setup Time

- Average setup per test: ~1-1.5 seconds
- This includes:
  - Environment setup (jsdom)
  - Module transformation
  - Test file collection

### Actual Test Execution

- Average test execution: ~2-3 seconds per test file
- Fastest: ErrorBoundary (2.65s total)
- Slowest (excluding ProtectedRoute): Planner (6.49s total)

## Recommendations

1. **Fix ProtectedRoute.test.tsx** - Critical priority
   - Update test to properly handle Navigate component
   - Consider using a mock for Navigate or structuring routes properly

2. **Memory Optimizations** - Already optimal
   - Current memory usage is excellent
   - No additional optimizations needed

3. **Performance Optimizations** - Optional
   - Consider parallelizing tests if memory allows (currently single-threaded)
   - Fastest tests could run in parallel batches

4. **Test Coverage** - Excellent
   - All critical components and utilities are tested
   - Only one test file needs fixing

## Test Categories Breakdown

| Category      | Count | Avg Time | Avg Memory |
| ------------- | ----- | -------- | ---------- |
| UI Components | 6     | ~3.3s    | ~5.0MB     |
| Pages         | 7     | ~4.3s    | ~5.2MB     |
| Utils         | 4     | ~3.0s    | ~5.0MB     |
| Hooks         | 2     | ~3.2s    | ~5.2MB     |
| Contexts      | 2     | ~4.7s    | ~5.1MB     |
| Components    | 6     | ~3.5s    | ~5.2MB     |

## Conclusion

The test suite is in excellent shape with only one failing test (ProtectedRoute.test.tsx) that needs to be fixed. Memory usage is optimal, and test execution times are reasonable. All tests except ProtectedRoute pass successfully.
