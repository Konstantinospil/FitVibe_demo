---
name: lint
description: Lint and fix code issues in the current file or selection
invokable: true
---

Run linting and auto-fix issues to ensure code quality and consistency.

## Commands

### Check Linting

```bash
# Check all files
pnpm lint

# Check specific workspace
pnpm --filter @fitvibe/backend lint
pnpm --filter @fitvibe/frontend lint

# Check with zero warnings (CI mode)
pnpm lint:check
```

### Auto-Fix Issues

```bash
# Auto-fix all fixable issues
pnpm lint --fix

# Fix specific workspace
pnpm --filter @fitvibe/backend lint --fix
pnpm --filter @fitvibe/frontend lint --fix
```

### Type Checking

```bash
# TypeScript type checking
pnpm typecheck

# Check specific workspace
pnpm --filter @fitvibe/backend typecheck
pnpm --filter @fitvibe/frontend typecheck
```

## Coding Standards

### TypeScript

- **Strict mode enabled** - no `any` types in public surfaces
- Explicit types for public APIs
- Use interfaces for object shapes, types for unions/intersections
- Prefer type inference where possible

### ESLint Rules

- Recommended ESLint rules
- Security plugins (OWASP guidelines)
- React hooks rules (frontend)
- Import boundaries (no cross-layer imports bypassing public APIs)

### Prettier Formatting

- Automatic code formatting
- Consistent style across codebase
- Integrated with ESLint

### Import Boundaries

- Backend: Folder-by-module structure, no cross-module imports bypassing public APIs
- Frontend: Feature-sliced architecture, respect layer boundaries

## Workflow

1. **Before committing**: Always run `pnpm lint --fix` and `pnpm typecheck`
2. **Fix issues**: Address all linting errors and warnings
3. **Verify**: Re-run linting to ensure all issues are resolved
4. **CI check**: Use `pnpm lint:check` to verify zero warnings (matches CI)

## Common Issues

- **Unused imports**: Remove unused imports
- **Type errors**: Add proper types, avoid `any`
- **Formatting**: Run Prettier to fix formatting
- **Import boundaries**: Fix cross-layer imports
- **Security issues**: Address security plugin warnings

Fix any issues found before committing code.
