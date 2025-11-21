---
name: refactor
description: Refactor code following FitVibe coding standards and best practices
invokable: true
---

Refactor the selected code following FitVibe coding standards and best practices. Maintain existing functionality while improving code quality, maintainability, and performance.

## Principles

1. **TypeScript Strict Mode**
   - Remove any `any` types
   - Add proper type annotations for public APIs
   - Use interfaces for object shapes, types for unions/intersections

2. **Code Organization**
   - Backend: Follow folder-by-module structure (`/modules/<domain>`)
   - Frontend: Follow feature-sliced architecture
   - Co-locate related files (routes, services, schemas, tests)

3. **Best Practices**
   - DRY (Don't Repeat Yourself) - eliminate duplication
   - Single Responsibility Principle
   - Descriptive naming (variables, functions, files)
   - Proper error handling
   - Input validation with Zod (backend)

4. **Security & Performance**
   - Validate all inputs
   - Use parameterized queries (Knex.js)
   - Implement rate limiting where needed
   - Optimize database queries

5. **Accessibility** (frontend)
   - Add ARIA labels where needed
   - Ensure keyboard navigation
   - Use semantic HTML
   - Maintain WCAG 2.1 AA compliance

6. **Performance**
   - Optimize database queries (add indexes, avoid N+1)
   - Reduce bundle size (code splitting, tree shaking)
   - Optimize re-renders (React.memo, useMemo, useCallback)
   - Lazy load heavy components

7. **Testing**
   - Ensure tests still pass after refactoring
   - Update tests if behavior changes
   - Maintain or improve test coverage
   - Reference test_manager agent for testing patterns

## Refactoring Checklist

- [ ] All existing tests pass
- [ ] No functionality removed
- [ ] TypeScript strict mode passes
- [ ] ESLint passes with zero warnings
- [ ] Performance maintained or improved
- [ ] Documentation updated if needed
- [ ] Code is more maintainable

## Common Refactoring Patterns

- **Extract functions** - Break down large functions
- **Extract components** - Split large components
- **Remove duplication** - Apply DRY principle
- **Improve naming** - Use descriptive names
- **Simplify logic** - Reduce complexity
- **Add types** - Improve type safety
- **Optimize imports** - Remove unused imports

Maintain existing functionality while improving code quality.

