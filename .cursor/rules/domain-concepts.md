# Domain Concepts & Troubleshooting

## Observability

- Use OpenTelemetry (OTEL) for distributed tracing
- Structured JSON logs via Pino to Loki or filebeat-compatible sink
- Prometheus metrics (prom-client) for SLI/SLO monitoring
- Grafana dashboards for visualization
- Correlation IDs for request tracing

## Troubleshooting Common Issues

### Dependency Version Errors

If you encounter errors like `es-errors: 1.3.0`, `debug: 4.4.3`, or `http-errors: 2.0.0`:

1. Check `package.json` for version conflicts
2. Run `pnpm update` to update dependencies
3. Check for peer dependency warnings: `pnpm install --strict-peer-dependencies`
4. Review migration guides for breaking changes
5. Use `pnpm why <package>` to understand dependency tree

### Common Error Patterns

- **404 errors**: Check route registration and middleware order
- **400 errors**: Validate input with Zod schemas before processing
- **409 errors**: Check for unique constraint violations
- **Type errors**: Ensure TypeScript strict mode compliance, no `any` types
- **Test failures**: Verify test data setup, check for flaky tests

### React/Knex/Express Specific Issues

- **React**: Use React Query for server state, Zustand for client state
- **Knex**: Always use parameterized queries (automatic), use transactions for multi-step operations
- **Express**: Use `asyncHandler` wrapper, validate with Zod, use `HttpError` for errors

## Technology-Specific Guidance

### React

- Use functional components with hooks
- Implement React Query for server state management
- Use Zustand for global client state
- Follow feature-sliced architecture
- Ensure WCAG 2.1 AA compliance
- Use i18next for all user-facing text

### Knex.js

- Use migrations for all schema changes
- Always use transactions for multi-step operations
- Use `snake_case` for database columns
- Add indexes for foreign keys and frequently queried columns
- Use parameterized queries (automatic with Knex)
- Use `returning("*")` for INSERT operations

### Express.js

- Use `asyncHandler` wrapper for all route handlers
- Validate input with Zod schemas
- Use `HttpError` utility for consistent error responses
- Implement idempotency for state-changing operations
- Use middleware for cross-cutting concerns
- Follow REST conventions with `/api/v1/` prefix

### TypeScript

- Strict mode enabled - no `any` types in public surfaces
- Use interfaces for object shapes, types for unions/intersections
- Use `import type` for type-only imports
- Use `.js` extensions in import statements (ESM compatibility)
- Prefer type inference, but be explicit for public APIs

### Docker

- Use multi-stage builds for optimization
- Follow `.dockerignore` patterns
- Use health checks in Dockerfiles
- Document required environment variables
- Use Docker Compose for local development

## References

- **PRD**: `docs/1.Product_Requirements/1.Product_Requirements_Document.md`
- **TDD**: `docs/2.Technical_Design_Document/`
- **ADRs**: `docs/2.Technical_Design_Document/2.f.Architectural_Decision_Documentation/`
- **Glossary**: `docs/0.Glossary.md`
- **Contributing**: `CONTRIBUTING.md`
- **Backend Modules**: `apps/backend/src/modules/README.md`
- **Project Epics**: `PROJECT_EPICS_AND_ACTIVITIES.md`
- **Chat Analysis**: `docs/6.Implementation/cursor_chat_analysis.md` (updated based on actual usage patterns)
- **Implementation Principles**: `docs/6.Implementation/implementation_principles.md` (core implementation principles and preferences)


















