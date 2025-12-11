# Testing Requirements

## Testing Standards

- Unit and integration tests live under `apps/*/tests/` and `tests/` workspace
- Use test doubles (mocks, stubs, spies, fakes) for external services
- Do not hit live third-party APIs in tests
- Use FakeClock for time-dependent code testing
- Use PRNG for deterministic test data generation
- Use deterministic UUIDs in tests
- Avoid flaky tests - ensure deterministic behavior
- Coverage targets: ≥80% repo-wide, ≥90% for critical paths (auth/session/points)

## Testing Tools

- **Backend**: Jest with Supertest for HTTP assertions, ts-jest, pg-mem for in-memory DB
- **Frontend**: Vitest with React Testing Library, @testing-library/user-event
- **E2E**: Playwright across Chromium/WebKit/Firefox
- **Performance**: k6 for load testing
- **Accessibility**: @axe-core/playwright for E2E a11y tests
- **Security**: Custom security checks in `tests/security/`

## Test Structure

- Backend: `apps/backend/src/modules/<module>/__tests__/` for module tests
- Frontend: `apps/frontend/tests/` with mirror structure of `src/`
- E2E: `tests/frontend/e2e/` for Playwright tests
- Integration: `tests/backend/integration/` for cross-module tests
- Performance: `tests/perf/` for k6 scripts

## Testing Best Practices

- Use test doubles (mocks, stubs) for external dependencies
- Test happy paths, error cases, and edge cases
- Use deterministic test data (fake clocks, seeded PRNG, deterministic UUIDs)
- Maintain ≥80% coverage repo-wide, ≥90% for critical paths
- Use `describe` blocks to group related tests
- Use descriptive test names: `should [expected behavior] when [condition]`
- Clean up after tests (use `beforeEach`/`afterEach` for setup/teardown)
- Test accessibility with React Testing Library queries


















