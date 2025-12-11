# Development Workflow

## File Path Standards

**CRITICAL**: All files must be saved in the correct directories. This is enforced for all agents and tools.

### Documentation Files
- **All documentation**: Save in `/docs` directory
- **Reviews and implementation documentation**: Save in `/docs/6.Implementation`
  - Security reviews: `/docs/security-reviews/` (subdirectory of `/docs`)
  - Implementation reviews: `/docs/6.Implementation/`
  - Implementation guides: `/docs/6.Implementation/`
- **Product documentation**: `/docs/1.Product_Requirements/`
- **Technical documentation**: `/docs/2.Technical_Design_Document/`
- **Testing documentation**: `/docs/4.Testing_and_Quality_Assurance_Plan/`

### Test Files
- **All test files**: Save in `/tests` directory or module-specific test directories
- **Backend module tests**: `apps/backend/src/modules/<module>/__tests__/`
- **Frontend tests**: `apps/frontend/tests/` (mirrors `src/` structure)
- **E2E tests**: `tests/frontend/e2e/`
- **Integration tests**: `tests/backend/integration/`
- **Performance tests**: `tests/perf/`
- **Security tests**: `tests/security/`

### Functional Modules
- **Backend modules**: `apps/backend/src/modules/<module>/`
- **Frontend components**: `apps/frontend/src/components/`
- **Frontend pages**: `apps/frontend/src/pages/`
- **Database migrations**: `apps/backend/src/db/migrations/`
- **Database seeds**: `apps/backend/src/db/seeds/`

### Rules
- **Never save documentation in root directory** (except README.md)
- **Never save tests in root directory**
- **Never save functional code outside `/apps`**
- **Always use the correct subdirectory structure** as defined above

## Documentation

### When to Update Documentation

- Product or UX changes: update PRD (`docs/1.Product_Requirements/`)
- Technical changes: update TDD (`docs/2.Technical_Design_Document/`)
- Architecture decisions: add or update ADR in `docs/2.Technical_Design_Document/2.f.Architectural_Decision_Documentation/`
- Infrastructure updates: document in `infra/README.md`
- Module changes: update `apps/backend/src/modules/README.md`

### Documentation Standards

- Use conventional commit messages (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`)
- Link changes to relevant PRD/TDD sections
- Update RTM (Requirements Traceability Matrix) when requirements change
- Keep README files in each directory up to date

## Branching

- Branch from `develop` for new features
- Use descriptive branch names: `feat/session-planner`, `fix/auth-refresh`, `docs/i18n-guidelines`
- Sign commits if GPG key is configured
- Use conventional commits

## Quality Gates

Before submitting PR, run:

```bash
pnpm lint          # ESLint + Prettier
pnpm test          # All test suites
pnpm typecheck     # TypeScript type checking
```

## Pull Request Requirements

- Summary of change and motivation
- Screenshots/terminal output for UX changes
- Links to updated PRD/TDD sections
- Checklist covering tests, documentation, and security considerations
- Ensure all CI checks pass

## Turborepo Tasks

- `pnpm dev` - Start all apps in development mode (parallel, no cache)
- `pnpm build` - Build all apps (with dependency graph)
- `pnpm lint` - Lint all workspaces (no cache)
- `pnpm test` - Run all test suites (no cache)
- `pnpm typecheck` - Type check all workspaces (no cache)







