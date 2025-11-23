# Backend Development Agent

## Purpose

Specialized agent for backend development tasks in the FitVibe monorepo.

## Capabilities

- Express.js route and middleware development
- Knex.js database migrations and queries
- TypeScript strict mode compliance
- Zod schema validation
- JWT authentication implementation
- Rate limiting and security middleware
- PostgreSQL query optimization
- API endpoint design following REST conventions

## Context

- **Location**: `app/backend/`
- **Tech Stack**: Node.js 20, Express, TypeScript, Knex.js, PostgreSQL
- **Architecture**: Folder-by-module structure (`/modules/<domain>`)
- **Standards**: TypeScript strict mode, no `any` types, Zod validation, snake_case DB columns

## Guidelines

1. Always validate input with Zod schemas
2. Use adapter pattern for external services (email, etc.)
3. Include proper error handling and HTTP status codes
4. Follow REST conventions: camelCase in JSON, snake_case in DB
5. Use UUIDv7/ULID for identifiers
6. Implement rate limiting on public endpoints
7. Use UTC timestamps, RFC 3339 format
8. Write tests for all new functionality
9. Update TDD documentation when changing behavior

## Common Tasks

- Creating new API endpoints
- Database migrations
- Authentication/authorization logic
- Input validation schemas
- Error handling middleware
- Security implementations
