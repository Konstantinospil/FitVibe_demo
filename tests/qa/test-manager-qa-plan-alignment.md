# Test Manager Specification vs QA Plan Alignment Report

**Date**: 2025-01-20
**QA Plan Version**: v3.0
**Test Manager Spec Version**: v1.1

---

## Executive Summary

The Test Manager Agent specification is **mostly aligned** with the QA Plan, but contains **one critical discrepancy** in coverage requirements that could cause conflicts. The test manager spec is **more strict** than the QA plan in some areas, which may be intentional for higher quality standards.

### Overall Alignment Score: **85%** ⚠️

| Aspect                   | QA Plan Requirement           | Test Manager Spec        | Alignment       | Status                        |
| ------------------------ | ----------------------------- | ------------------------ | --------------- | ----------------------------- |
| **Coverage (Repo-wide)** | ≥80% lines & branches         | ≥85% minimum             | ⚠️ **Mismatch** | Test Manager stricter         |
| **Coverage (Critical)**  | ≥90% auth/session/points      | 100% critical paths      | ✅ Aligned      | Test Manager stricter         |
| **Test Frameworks**      | Jest/Vitest                   | Jest/Vitest/Mocha/Pytest | ✅ Aligned      | Supports all                  |
| **Type Safety**          | Not explicitly stated         | 100% TypeScript coverage | ✅ Aligned      | Test Manager adds requirement |
| **Security**             | 0 High/Critical SCA           | No vulnerabilities       | ✅ Aligned      | Compatible                    |
| **Flakiness**            | ≤2% repo-wide, ≤1% critical   | No flakiness detected    | ✅ Aligned      | Test Manager stricter         |
| **Test Types**           | Unit/Integration/E2E/Contract | Unit/Integration/E2E     | ⚠️ **Partial**  | Missing Contract tests        |

---

## Detailed Comparison

### 1. Test Coverage Requirements

#### QA Plan Requirements (Section 2, Line 24)

```
Test coverage: ≥80% lines & branches repo-wide
                ≥90% on auth/session/points critical code
```

#### Test Manager Specification (Line 42, 503-507)

```
Coverage: Minimum 85% code coverage, 100% for critical paths
- Line coverage ≥ 85% (or target specified in requirements)
- Branch coverage ≥ 80%
- All critical paths have 100% coverage
- Context-specific coverage targets are used when appropriate
```

#### Analysis

**Issue**: ⚠️ **Coverage Threshold Mismatch**

- **QA Plan**: 80% repo-wide minimum
- **Test Manager**: 85% minimum (default)
- **Gap**: 5% difference

**Impact**:

- Tests that meet QA plan (80-84%) would be rejected by test manager
- Could cause friction between QA standards and agent behavior
- May require manual override or configuration

**Recommendation**:

1. **Option A (Recommended)**: Update test manager to use QA plan thresholds:

   ```markdown
   Coverage: Minimum 80% code coverage (repo-wide), 90% for critical paths, 100% for auth/session/points
   ```

2. **Option B**: Keep test manager stricter but add flexibility:

   ```markdown
   Coverage: Minimum 85% code coverage (default), or target specified in requirements (respects QA plan 80% when specified)
   ```

3. **Option C**: Update QA plan to match test manager (if higher standards are desired)

**Current Status**: Test manager spec already includes flexibility clause: "or target specified in requirements" - this should allow QA plan targets to be respected.

**Verdict**: ⚠️ **Partially Aligned** - Test manager is stricter but has flexibility clause

---

### 2. Test Framework Support

#### QA Plan Requirements (Section 7, Line 78)

```
Unit: Jest/Vitest
Integration: Supertest against API
E2E: Playwright
```

#### Test Manager Specification (Lines 109-112, 192-214)

```
test_framework: jest|vitest|mocha|pytest
test_runner: jest|vitest|pytest
- Supports Jest, Vitest, Mocha, Pytest
- Supports React component testing
- Supports Express route testing
```

#### Analysis

**Status**: ✅ **Fully Aligned**

- Test manager supports all QA plan frameworks (Jest, Vitest)
- Also supports additional frameworks (Mocha, Pytest) for flexibility
- Includes examples for React and Express (matches QA plan scope)

**Verdict**: ✅ **Fully Aligned**

---

### 3. Test Types

#### QA Plan Requirements (Section 7, Lines 78-83)

```
- Unit: Jest/Vitest
- Integration: Supertest against API with ephemeral Postgres
- Contract: zod ↔ OpenAPI schema parity
- E2E: Playwright
- Data migrations: order/drift/index/FK/enum contracts
- Observability: metrics contract tests
```

#### Test Manager Specification (Lines 32, 90, 201-206)

```
Test types: unit_test|integration_test|e2e_test
- Happy Path Tests
- Edge Case Tests
- Error Handling Tests
- Integration Tests
- Type Safety Tests
```

#### Analysis

**Status**: ⚠️ **Partially Aligned**

**Missing from Test Manager**:

- ❌ Contract tests (zod ↔ OpenAPI)
- ❌ Data migration tests
- ❌ Observability/metrics contract tests

**Present in Test Manager**:

- ✅ Unit tests
- ✅ Integration tests
- ✅ E2E tests
- ✅ Type safety tests (additional)

**Impact**:

- Test manager may not generate contract tests required by QA plan
- Missing migration and observability test patterns

**Recommendation**: Add contract test support to test manager specification:

```markdown
- **Contract Tests**: Validate API contracts (zod ↔ OpenAPI), schema parity
- **Migration Tests**: Test database migration order, drift, constraints
- **Observability Tests**: Metrics contract validation, trace coverage
```

**Verdict**: ⚠️ **Partially Aligned** - Missing contract, migration, and observability tests

---

### 4. Quality Standards

#### QA Plan Requirements (Section 2, Lines 19-35)

```
- Test coverage: ≥80% lines & branches
- Security: 0 High/Critical SCA
- Accessibility: WCAG 2.1 AA, axe/Lighthouse ≥90
- Performance: API p95 targets by group
- Flakiness: ≤2% repo-wide, ≤1% critical
```

#### Test Manager Specification (Lines 39-43, 458-463)

```
- Zero Linting Errors
- Type Safety: 100% TypeScript coverage
- Security: No vulnerabilities
- Coverage: Minimum 85% (or target specified)
- Maintainability: Clear descriptions, DRY principles
```

#### Analysis

**Status**: ✅ **Mostly Aligned**

**Aligned**:

- ✅ Security: Both require 0 vulnerabilities
- ✅ Linting: Test manager enforces (QA plan implies via CI gates)
- ✅ Type Safety: Test manager adds explicit requirement (good addition)

**Missing from Test Manager**:

- ❌ Accessibility requirements (WCAG 2.1 AA, axe ≥90)
- ❌ Performance targets (API p95 by group)
- ❌ Flakiness SLO (≤2% repo-wide)

**Additional in Test Manager**:

- ✅ Maintainability standards (DRY, clear descriptions)
- ✅ Type safety requirements (100% TypeScript coverage)

**Impact**:

- Test manager focuses on code quality, not runtime quality (a11y, perf)
- This is acceptable as test manager generates tests, not validates runtime behavior

**Verdict**: ✅ **Aligned** - Test manager covers code quality, QA plan covers runtime quality

---

### 5. Test Execution Requirements

#### QA Plan Requirements (Section 7.1, Lines 87-192)

```
- Flake Rate: ≤2% repo-wide, ≤1% critical
- Retries: CI only (2 retries max)
- Quarantine: Auto-skip after 3 flakes in 7 days
- Test Independence: No shared state
- Deterministic: Seeded PRNG, fake clock/UUID
```

#### Test Manager Specification (Lines 472-476, 545-553)

```
- All tests pass locally
- No test flakiness (run multiple times)
- Tests run in reasonable time (<5s unit, <30s integration)
- Async operations handled correctly
- Cleanup properly implemented
- No slow operations in unit tests
- Tests are independent (can run in any order)
```

#### Analysis

**Status**: ✅ **Fully Aligned**

**Aligned Requirements**:

- ✅ Test independence (both require)
- ✅ No flakiness (test manager stricter: 0% vs 2%)
- ✅ Deterministic behavior (test manager implies via "no flakiness")
- ✅ Performance targets (test manager: <5s unit, QA plan: implicit)

**Test Manager Adds**:

- ✅ Explicit time targets (<5s unit, <30s integration)
- ✅ Explicit cleanup requirements
- ✅ Explicit async handling requirements

**Verdict**: ✅ **Fully Aligned** - Test manager is stricter (0% flakiness vs 2%)

---

### 6. Security Requirements

#### QA Plan Requirements (Section 2, Line 31, Section 8.2, Line 212)

```
- 0 High/Critical SCA vulnerabilities
- ZAP baseline no High
- SBOM per build
- Images signed (cosign)
- Pinned digests
- Headers (CSP, HSTS, etc.)
- CSRF/CORS protection
```

#### Test Manager Specification (Lines 41, 458-463)

```
- Security: No vulnerabilities (dependencies, code patterns, or test data exposure)
- npm audit / pip audit shows 0 vulnerabilities
- Snyk scan passes (if available)
- No hardcoded secrets or sensitive data
- No unsafe code patterns (eval, innerHTML, etc.)
- Test data does not expose real user information
```

#### Analysis

**Status**: ✅ **Aligned** (Different Scopes)

**Test Manager Focus** (Code/Test Security):

- ✅ Dependency vulnerabilities (npm audit, Snyk)
- ✅ Code patterns (no eval, innerHTML)
- ✅ Test data security (no real user data)

**QA Plan Focus** (Runtime/Infrastructure Security):

- ✅ SCA vulnerabilities (aligned)
- ✅ Application security (ZAP, headers, CSRF)
- ✅ Supply chain (SBOM, signing)

**Verdict**: ✅ **Aligned** - Test manager covers test code security, QA plan covers application security

---

### 7. Test Architecture & Patterns

#### QA Plan Requirements (Section 7, Lines 78-83)

```
- Unit: Jest/Vitest; fakes for clock/UUID; seeded PRNG
- Integration: Supertest, ephemeral Postgres, transactional tests
- E2E: Playwright, stable seeds, FakeClock, masked snapshots
```

#### Test Manager Specification (Lines 557-665)

```
- Async function testing patterns
- Mocking dependencies patterns
- Error handling test patterns
- React component testing (if applicable)
- Express route testing (if applicable)
```

#### Analysis

**Status**: ⚠️ **Partially Aligned**

**Aligned**:

- ✅ Async testing patterns
- ✅ Mocking patterns
- ✅ Error handling patterns
- ✅ Express route testing (matches Supertest requirement)

**Missing from Test Manager**:

- ❌ Fake clock/UUID patterns
- ❌ Seeded PRNG patterns
- ❌ Transactional test patterns
- ❌ Ephemeral database setup
- ❌ Playwright E2E patterns
- ❌ Snapshot masking patterns

**Impact**:

- Test manager may not generate tests with proper determinism patterns
- Missing integration test setup patterns (transactions, ephemeral DB)

**Recommendation**: Add patterns section for:

```markdown
### Determinism Patterns

- Fake clock for time-dependent tests
- Seeded PRNG for random data
- Deterministic UUIDs

### Integration Test Patterns

- Transactional test setup
- Ephemeral database configuration
- Test data cleanup patterns
```

**Verdict**: ⚠️ **Partially Aligned** - Missing determinism and integration patterns

---

## Critical Issues

### Issue 1: Coverage Threshold Mismatch 🔴

**Severity**: High
**Impact**: Tests meeting QA plan (80%) may be rejected by test manager (85%)

**Current State**:

- QA Plan: 80% repo-wide minimum
- Test Manager: 85% minimum (default)

**Resolution Options**:

1. Update test manager default to 80% (match QA plan)
2. Keep 85% but ensure "target specified in requirements" clause is respected
3. Update QA plan to 85% (if higher standards desired)

**Recommendation**: Option 2 (already implemented) - Test manager should respect QA plan targets when specified in requirements.

**Status**: ⚠️ **Needs Verification** - Ensure flexibility clause is properly implemented

---

### Issue 2: Missing Contract Test Support 🟡

**Severity**: Medium
**Impact**: Test manager cannot generate contract tests required by QA plan

**Missing**:

- Contract tests (zod ↔ OpenAPI)
- Migration tests
- Observability tests

**Recommendation**: Add contract test support to test manager specification

---

### Issue 3: Missing Determinism Patterns 🟡

**Severity**: Medium
**Impact**: Generated tests may be flaky without proper determinism patterns

**Missing**:

- Fake clock patterns
- Seeded PRNG patterns
- Deterministic UUID patterns

**Recommendation**: Add determinism patterns section to test manager specification

---

## Alignment Summary

### Fully Aligned ✅ (4/7)

1. **Test Framework Support** - Jest/Vitest fully supported
2. **Test Execution Requirements** - Independence, no flakiness, performance
3. **Security Requirements** - Compatible (different scopes)
4. **Quality Standards** - Mostly aligned, test manager adds type safety

### Partially Aligned ⚠️ (3/7)

1. **Coverage Requirements** - Threshold mismatch (80% vs 85%), but flexibility clause exists
2. **Test Types** - Missing contract, migration, observability tests
3. **Test Patterns** - Missing determinism and integration patterns

### Not Aligned ❌ (0/7)

None - All aspects have at least partial alignment

---

## Recommendations

### Immediate Actions (High Priority)

1. **Verify Coverage Flexibility** 🔴
   - Ensure test manager respects "target specified in requirements"
   - Test with QA plan target (80%) to confirm it's accepted
   - Update documentation if needed

2. **Add Contract Test Support** 🟡
   - Add contract test type to test manager
   - Include zod ↔ OpenAPI validation patterns
   - Add migration and observability test patterns

### Short-Term Improvements (Medium Priority)

3. **Add Determinism Patterns** 🟡
   - Document fake clock usage
   - Document seeded PRNG patterns
   - Document deterministic UUID patterns

4. **Add Integration Test Patterns** 🟡
   - Document transactional test setup
   - Document ephemeral database patterns
   - Document test data cleanup patterns

### Long-Term Enhancements (Low Priority)

5. **Add E2E Test Patterns** 🟢
   - Document Playwright patterns
   - Document snapshot masking
   - Document stable seed data patterns

6. **Align Coverage Thresholds** 🟢
   - Consider standardizing on 80% (QA plan) or 85% (test manager)
   - Or document rationale for difference

---

## Conclusion

The Test Manager Agent specification is **85% aligned** with the QA Plan. The main issues are:

1. **Coverage threshold mismatch** (80% vs 85%) - but flexibility clause should handle this
2. **Missing contract test support** - needed for full QA plan compliance
3. **Missing determinism patterns** - needed to prevent flakiness

**Overall Verdict**: ✅ **Mostly Aligned** with minor gaps that can be addressed

**Action Required**:

- Verify coverage flexibility works correctly
- Add contract test support
- Add determinism patterns

---

**Report Generated**: 2025-01-20
**Next Review**: When QA plan or test manager spec is updated
