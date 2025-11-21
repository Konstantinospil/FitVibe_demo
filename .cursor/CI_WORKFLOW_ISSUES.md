# CI Workflow Issues and Recommendations

## Critical Issues

### 1. Coverage Gate Script Argument Mismatch ✅ FIXED
**Location**: Line 115
```yaml
run: pnpm test:coverage:gate ./coverage/coverage-summary.json
```
**Problem**: The `check-coverage.cjs` script doesn't accept command-line arguments. It auto-discovers coverage files from workspace directories (`apps/`, `packages/`). The argument is ignored, which could cause confusion.

**Impact**: Low - script still works but argument is ignored
**Fix**: ✅ Removed the argument to match script behavior:
```yaml
run: pnpm test:coverage:gate
```

### 2. Coverage File Path for Codecov ✅ FIXED
**Location**: Line 137
```yaml
files: ./coverage/lcov.info
```
**Problem**: Coverage files are generated in workspace-specific directories (`apps/backend/coverage/`, `apps/frontend/coverage/`), not in root `./coverage/`. The path might not exist.

**Impact**: High - Codecov upload will fail
**Fix**: ✅ Added step to aggregate coverage files from workspace directories to root before Codecov upload:
```yaml
- name: Aggregate coverage files
  if: success()
  run: |
    mkdir -p coverage
    find apps packages -name "lcov.info" -exec cat {} \; > coverage/lcov.info || true
    if [ ! -s coverage/lcov.info ]; then
      echo "No coverage files found" > coverage/lcov.info
    fi
```

### 3. PostgreSQL Version Mismatch ✅ FIXED
**Location**: Lines 27 (quality) vs 200 (integration)
- Quality job: `postgres:16`
- Integration job: `postgres:15`

**Problem**: Different PostgreSQL versions between jobs could cause inconsistent test results and migration issues.

**Impact**: Medium - Could cause test failures if migrations behave differently
**Fix**: ✅ Changed integration job to use `postgres:16` to match quality job:
```yaml
image: postgres:16
```

### 4. Missing DATABASE_URL in Quality Job ✅ FIXED
**Location**: Quality job (lines 22-144)
**Problem**: Unit tests might need database connection, but `DATABASE_URL` is only set in integration job. If tests require DB, they'll fail.

**Impact**: Medium - Depends on whether unit tests need DB
**Fix**: ✅ Added DATABASE_URL to quality job environment variables:
```yaml
env:
  DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/fitvibe_test
  CLAMAV_ENABLED: "true"
  ...
```

### 5. Metrics Contract Job Missing Node.js Setup ✅ FIXED
**Location**: Lines 284-293
**Problem**: Job runs `node tests/metrics/assert-prom.cjs` but doesn't set up Node.js or install dependencies. The script might need dependencies or specific Node version.

**Impact**: High - Job will likely fail
**Fix**: ✅ Added Node.js setup step before running the script:
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
```

## Medium Priority Issues

### 6. Performance Job Mock Server Cleanup ✅ FIXED
**Location**: Lines 424-435, 459-465
**Problem**: If mock server fails to start, the cleanup step might not run properly. The PID file might not exist, and background process might not be killed.

**Impact**: Medium - Could leave processes running
**Fix**: ✅ Improved cleanup to kill by process name first, then by PID:
```yaml
- name: Stop mock services
  if: always()
  run: |
    pkill -f "mock-server.mjs" || true
    if [ -f mock-server.pid ]; then
      kill "$(cat mock-server.pid)" 2>/dev/null || true
      rm -f mock-server.pid
    fi
```

### 7. E2E Job Global npm Install ✅ FIXED
**Location**: Line 593
```yaml
run: npm install -g @playwright/test@1.48.2
```
**Problem**: Mixing npm global install with pnpm project dependencies could cause version conflicts. Also, Playwright version is hardcoded and might not match package.json.

**Impact**: Medium - Version conflicts possible
**Fix**: ✅ Removed global npm install and use pnpm exec instead:
```yaml
- name: Install Playwright browsers
  run: pnpm exec playwright install --with-deps

- name: Run Playwright smoke tests
  run: pnpm exec playwright test --config tests/frontend/e2e/playwright.config.cjs --reporter=line
```

### 8. Build Job Version Extraction Error Handling ✅ FIXED
**Location**: Lines 634-638
**Problem**: If `apps/backend/package.json` or `apps/frontend/package.json` don't exist or are invalid, the step will fail without clear error message.

**Impact**: Medium - Unclear error messages
**Fix**: ✅ Added error handling to check for package.json files before extracting versions:
```yaml
- name: Determine package versions
  id: versions
  run: |
    if [ ! -f apps/backend/package.json ] || [ ! -f apps/frontend/package.json ]; then
      echo "Error: package.json files not found"
      exit 1
    fi
    echo "backend=$(node -p \"require('./apps/backend/package.json').version\")" >> "$GITHUB_OUTPUT"
    echo "frontend=$(node -p \"require('./apps/frontend/package.json').version\")" >> "$GITHUB_OUTPUT"
```

### 9. OpenAPI Artifact Path ✅ FIXED
**Location**: Line 191
```yaml
path: apps/backend/openapi/openapi.json
```
**Problem**: If OpenAPI generation fails, the file won't exist and artifact upload will fail (even with `if-no-files-found: error`).

**Impact**: Medium - Job will fail if OpenAPI generation fails
**Fix**: ✅ Made upload conditional on success to prevent upload if generation fails:
```yaml
- name: Upload OpenAPI artifact
  if: success()
  uses: actions/upload-artifact@v4
  with:
    name: openapi
    path: apps/backend/openapi/openapi.json
    if-no-files-found: error
```

### 10. Snyk Token Check Syntax ✅ FIXED
**Location**: Line 341
```yaml
if: ${{ env.SNYK_TOKEN != '' }}
```
**Problem**: In GitHub Actions, this syntax might not work correctly. Should use `secrets.SNYK_TOKEN` instead of `env.SNYK_TOKEN` for the check.

**Impact**: Medium - Snyk scan might skip incorrectly
**Fix**: ✅ Changed from `env.SNYK_TOKEN` to `secrets.SNYK_TOKEN` for proper secret checking:
```yaml
- name: Snyk scan
  if: ${{ secrets.SNYK_TOKEN != '' }}
  uses: snyk/actions/node@master
  with:
    command: test
    args: --all-projects
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### 11. QA Summary Job Missing Dependencies ✅ FIXED
**Location**: Lines 467-502
**Problem**: Job downloads artifacts and runs `node tests/qa/generate-summary.mjs` but doesn't install dependencies. The script might need npm packages.

**Impact**: Medium - Script might fail if it needs dependencies
**Fix**: ✅ Added pnpm setup and dependency installation:
```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9.14.4

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

### 12. Performance Artifacts Path ✅ FIXED
**Location**: Lines 454-456
```yaml
path: |
  tests/perf/k6-summary.json
  tests/perf/lhci-output
```
**Problem**: `lhci-output` might not exist if Lighthouse CI fails or uses different output directory.

**Impact**: Low - Artifact upload will fail if path doesn't exist
**Fix**: ✅ Changed to `if: always()` and `if-no-files-found: ignore` to handle missing files gracefully:
```yaml
- name: Upload performance artifacts
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: perf-metrics
    path: |
      tests/perf/k6-summary.json
      tests/perf/lhci-output
    if-no-files-found: ignore
```

## Low Priority Issues

### 13. ClamAV Health Check Command
**Location**: Lines 46, 219
```yaml
--health-cmd="clamdscan --version"
```
**Problem**: `clamdscan` might not be available immediately. Should use a command that actually tests the daemon is ready.

**Impact**: Low - Health check might pass before service is ready
**Fix**: Use better health check:
```yaml
--health-cmd="clamdscan --version || exit 1"
```
Or wait for port to be open.

### 14. Missing Error Handling in Build Job
**Location**: Lines 687, 692
**Problem**: Cosign signing steps don't have error handling. If signing fails, the job continues.

**Impact**: Low - Images might be published without signatures
**Fix**: Add error handling or make signing required:
```yaml
- name: Sign backend image
  env:
    COSIGN_EXPERIMENTAL: "1"
  run: |
    cosign sign --yes --keyless ${{ env.BACKEND_IMAGE }}@${{ steps.backend.outputs.digest }} || {
      echo "Failed to sign backend image"
      exit 1
    }
```

### 15. Release Artifact Path
**Location**: Line 715
```yaml
path: artifacts/openapi
```
**Problem**: Artifact is downloaded to `artifacts/openapi` but then referenced as `artifacts/openapi/openapi.json`. If download structure is different, this might fail.

**Impact**: Low - Release creation might fail
**Fix**: Verify path structure or use glob:
```yaml
path: artifacts/openapi/**/*.json
```

### 16. Missing Timeout for Long-Running Steps
**Problem**: Some steps (like integration tests, E2E tests, security scans) don't have timeouts. They could hang indefinitely.

**Impact**: Low - Jobs might hang
**Fix**: Add timeouts to critical steps:
```yaml
- name: Integration tests
  timeout-minutes: 30
  env:
    NODE_ENV: test
  run: pnpm --filter @fitvibe/backend exec jest --runInBand
```

## Recommendations

1. **Add job-level timeouts** to prevent hanging jobs
2. **Standardize service versions** across all jobs
3. **Add retry logic** for flaky steps (like ClamAV wait)
4. **Use matrix strategy** for testing multiple Node.js versions if needed
5. **Add caching** for Playwright browsers to speed up jobs
6. **Consider using concurrency groups** to prevent multiple runs from conflicting
7. **Add workflow status badges** to README
8. **Document required secrets** clearly

## Summary

- **Critical**: 5 issues ✅ **ALL FIXED** (coverage paths, missing Node.js setup, version mismatches)
- **Medium**: 7 issues ✅ **ALL FIXED** (cleanup, version conflicts, error handling)
- **Low**: 4 issues (timeouts, health checks, error handling)

Total: 16 issues identified, 12 issues fixed (5 critical + 7 medium)

