---
name: test
description: Run tests for the current file or selected code, or create tests if missing
invokable: true
---

Run the appropriate test suite based on the context. For comprehensive testing guidance, reference the **Test Manager** agent at `.cursor/agents/test_manager.md`.

## Running Tests

### By Context
1. **Backend files**: `pnpm test -- app/backend` (Jest)
2. **Frontend files**: `pnpm test -- app/frontend` (Vitest)
3. **E2E tests**: `pnpm test:e2e` (Playwright)
4. **Performance tests**: `pnpm test:perf` (k6)
5. **All tests**: `pnpm test` (runs all test suites)

### With Coverage
- `pnpm test -- --coverage` - Generate coverage report
- `pnpm test:coverage:gate` - Check coverage gates (≥80% repo-wide, ≥90% critical)

### Watch Mode
- `pnpm test -- --watch` - Watch mode for development
- `pnpm --filter @fitvibe/frontend test:watch` - Frontend watch mode

## Creating Tests

If no tests exist for the selected code, create appropriate tests following:

### Testing Standards
- **Backend**: Jest with Supertest for HTTP assertions
- **Frontend**: Vitest with React Testing Library
- **E2E**: Playwright across Chromium/WebKit/Firefox
- **Coverage**: ≥80% repo-wide, ≥90% for critical paths (auth/session/points)

### Test Requirements
- Use test doubles (mocks, stubs, spies, fakes) for external services
- Use FakeClock for time-dependent code
- Use seeded PRNG for deterministic test data
- Use deterministic UUIDs in tests
- Ensure zero flakiness (tests must pass consistently)
- Never hit live third-party APIs in tests

### Test Patterns
- **Unit tests**: Test individual functions/components in isolation
- **Integration tests**: Test with ephemeral database, transactional setup
- **E2E tests**: Test complete user flows with deterministic seeds
- **Contract tests**: Validate API contracts (zod ↔ OpenAPI)

## Agent Reference

For detailed testing patterns, examples, and best practices, see:
- **Test Manager Agent**: `.cursor/agents/test_manager.md`
- **Testing & QA Plan**: `docs/4.Testing_and_Quality_Assurance_Plan/`

