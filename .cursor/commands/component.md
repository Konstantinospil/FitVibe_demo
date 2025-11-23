---
name: component
description: Create React components following FitVibe frontend standards
invokable: true
---

Create React components following FitVibe standards. For comprehensive guidance, reference the **Senior Frontend Developer** agent at `.cursor/agents/senior-frontend-developer.md`.

## Quick Start

When creating a component, follow these steps:

1. **Plan the component** - Determine props, state, and accessibility needs
2. **Create component file** - Use TypeScript with proper types
3. **Add i18n tokens** - All user-facing text must use i18next
4. **Implement accessibility** - WCAG 2.1 AA compliance required
5. **Write tests** - Vitest unit tests with React Testing Library
6. **Verify quality** - Run lint, typecheck, and tests

## Standards

1. **Component Structure**
   - Use TypeScript with strict mode
   - Follow feature-sliced architecture
   - Co-locate component, styles, and tests
   - Use functional components with hooks

2. **Accessibility (WCAG 2.1 AA)**
   - Add ARIA labels for interactive elements
   - Ensure keyboard navigation
   - Use semantic HTML elements
   - Maintain proper heading hierarchy
   - Ensure color contrast meets AA standards
   - Test with screen readers

3. **Internationalization**
   - Use i18n for all user-facing text
   - No hardcoded strings
   - Support locale switching

4. **Styling**
   - Use consistent design system tokens
   - Responsive design (mobile-first)
   - Follow visual design system in `docs/3.Sensory_Design_System/`

5. **State Management**
   - Use React hooks (useState, useEffect, useContext)
   - Consider context for shared state
   - Optimize re-renders

6. **Testing**
   - Write Vitest unit tests
   - Test accessibility with Playwright
   - Test user interactions

7. **State Management**
   - Use Zustand for global client state
   - Use React Query for server state
   - Prefer local state (useState) when possible
   - Optimize re-renders with useMemo/useCallback

8. **Performance**
   - Lazy load heavy components with React.lazy()
   - Code split route-based components
   - Optimize images (lazy loading, proper sizing)
   - Meet performance budgets (LCP < 2.5s, CLS ≤ 0.1)

9. **Testing**
   - Write Vitest unit tests (≥80% coverage, ≥90% for critical paths)
   - Use React Testing Library for component tests
   - Test accessibility with @testing-library/jest-dom
   - Test keyboard navigation and screen reader compatibility
   - Reference test_manager agent for testing patterns

10. **Documentation**
    - Add JSDoc comments for props and usage
    - Document accessibility features
    - Update PRD if UX changes
    - Include usage examples

## Example Component Structure

```typescript
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

interface ComponentNameProps {
  id: string;
  onAction?: () => void;
}

export function ComponentName({ id, onAction }: ComponentNameProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div
      role="region"
      aria-labelledby={`component-${id}`}
      className="component-name"
    >
      <h2 id={`component-${id}`} className="sr-only">
        {t('component.name.title')}
      </h2>
      {/* Component content */}
    </div>
  );
}
```

## Agent Reference

For detailed implementation guidance, patterns, and examples, see:

- **Senior Frontend Developer Agent**: `.cursor/agents/senior-frontend-developer.md`
- **Test Manager Agent**: `.cursor/agents/test_manager.md` (for testing)
