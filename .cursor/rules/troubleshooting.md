# Troubleshooting Common Issues

This document provides guidance for resolving common development issues in the FitVibe project.

## Dependency Version Errors

If you encounter errors like `es-errors: 1.3.0`, `debug: 4.4.3`, or `http-errors: 2.0.0`:

1. Check `package.json` for version conflicts
2. Run `pnpm update` to update dependencies
3. Check for peer dependency warnings: `pnpm install --strict-peer-dependencies`
4. Review migration guides for breaking changes
5. Use `pnpm why <package>` to understand dependency tree

## Common Error Patterns

- **404 errors**: Check route registration and middleware order
- **400 errors**: Validate input with Zod schemas before processing
- **409 errors**: Check for unique constraint violations
- **Type errors**: Ensure TypeScript strict mode compliance, no `any` types
- **Test failures**: Verify test data setup, check for flaky tests

## Framework-Specific Issues

### React
- Use React Query for server state, Zustand for client state
- Ensure proper hook dependencies in useEffect
- Use React.memo for expensive components
- Follow feature-sliced architecture

### Knex.js
- Always use parameterized queries (automatic), use transactions for multi-step operations
- Check migration order if migrations fail
- Verify database connection string format
- Use `returning("*")` for INSERT operations to get created records

### Express.js
- Use `asyncHandler` wrapper for all route handlers
- Validate input with Zod schemas
- Use `HttpError` utility for consistent error responses
- Check middleware order if routes aren't working
- Verify route registration in main app file

## Debugging Tips

1. **Check logs**: Review structured logs (Pino) for detailed error information
2. **Verify environment variables**: Ensure all required env vars are set
3. **Database connection**: Verify PostgreSQL connection string and database exists
4. **Type checking**: Run `pnpm typecheck` to catch TypeScript errors early
5. **Test isolation**: Ensure tests clean up after themselves (use `beforeEach`/`afterEach`)





