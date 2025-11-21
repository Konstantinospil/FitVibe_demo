---
name: api
description: Create or update API endpoints following FitVibe REST conventions
invokable: true
---

Create or update API endpoints following FitVibe conventions. For comprehensive guidance, reference the **Backend Agent** at `.cursor/agents/backend-agent.md`.

## Quick Start

When creating an API endpoint:

1. **Plan the endpoint** - Determine route, method, and validation needs
2. **Create route handler** - In appropriate module (`/modules/<domain>/routes.ts`)
3. **Add Zod validation** - Create schema for input validation
4. **Implement service logic** - Business logic in service layer
5. **Add error handling** - RFC 7807 style error responses
6. **Write tests** - Integration tests with Supertest
7. **Update documentation** - TDD API design section

## Standards

1. **REST Conventions**
   - Base path: `/api/v1`
   - Plural nouns: `/users`, `/sessions`, `/exercises`
   - Nesting only for strict ownership: `/users/{id}/sessions`
   - Use query filters otherwise

2. **Request/Response Format**
   - JSON bodies
   - camelCase in JSON
   - snake_case in database
   - UTC timestamps, RFC 3339 format

3. **Required Components**
   - Zod validation schema for input
   - Proper HTTP status codes
   - Error handling (RFC 7807 style)
   - Idempotency-Key header support for state-changing endpoints
   - Rate limiting on public endpoints

4. **Implementation Steps**
   - Create route in appropriate module (`/modules/<domain>/routes.ts`)
   - Create validation schema with Zod
   - Implement service layer logic
   - Add error handling
   - Write integration tests
   - Update API documentation (TDD)

5. **Security**
   - Authentication middleware (JWT verification)
   - Authorization checks (RBAC)
   - Input sanitization
   - SQL injection prevention (use Knex.js parameterized queries)
   - Rate limiting on public endpoints
   - CSRF protection for state-changing operations

6. **Error Handling**
   - Use RFC 7807 style error responses
   - Proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
   - Include error details in development, sanitized in production
   - Log errors for observability

7. **Testing**
   - Write integration tests with Supertest
   - Test authentication and authorization
   - Test validation and error cases
   - Use ephemeral database for tests
   - Reference test_manager agent for patterns

## Example Endpoint Structure

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { createSession } from '../services/sessionService';

const router = Router();

const createSessionSchema = z.object({
  plannedDate: z.string().datetime(),
  exercises: z.array(z.object({
    exerciseId: z.string().uuid(),
    sets: z.number().int().positive(),
  })),
});

router.post(
  '/sessions',
  authenticate,
  validate(createSessionSchema),
  async (req, res, next) => {
    try {
      const session = await createSession(req.user.id, req.body);
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

## Agent Reference

For detailed implementation guidance, see:
- **Backend Agent**: `.cursor/agents/backend-agent.md`
- **Test Manager Agent**: `.cursor/agents/test_manager.md` (for testing)

