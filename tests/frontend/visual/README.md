# Visual Regression Tests

Visual regression tests ensure UI consistency across themes, breakpoints, and locales. These tests capture screenshots and compare them against baseline images to detect visual regressions.

## Overview

Per QA Plan Section 16 (VIZ-SNAP-02), visual regression tests:

- Test critical screens: Auth, Planner, Logger, Dashboard, Feed, Profile, Settings
- Cover themes: light and dark
- Cover breakpoints: xs (360px), sm (640px), md (1024px), lg (1280px)
- Use deterministic time (frozen clock) and masked dynamic regions
- Enforce maxDiffPixelRatio ≤ 0.2%

## Running Tests

### Local Development

```bash
# Build frontend first
pnpm --filter @fitvibe/frontend run build

# Run visual tests
pnpm test:visual

# Or directly with Playwright
pnpm exec playwright test --config tests/frontend/visual/config/playwright.config.ts
```

### Updating Baselines

When UI changes are intentional, update the baseline screenshots:

```bash
# Update all baselines (recommended)
pnpm test:visual:update

# Or directly with Playwright
pnpm exec playwright test --config tests/frontend/visual/config/playwright.config.ts --update-snapshots

# Update specific test
pnpm exec playwright test --config tests/frontend/visual/config/playwright.config.ts --update-snapshots tests/frontend/visual/pages/auth.spec.ts
```

**Important**: Baseline updates require design approval and should include before/after screenshots in PR description.

## Test Structure

```
tests/frontend/visual/
├── config/
│   └── playwright.config.ts    # Playwright configuration for visual tests
├── helpers/
│   ├── auth.ts                 # Authentication helpers for protected pages
│   ├── fakeClock.ts            # Freezes time for deterministic tests
│   ├── mask.ts                 # Masks dynamic regions (timestamps, avatars, etc.)
│   └── responsive.ts           # Responsive design validation helpers
├── pages/
│   ├── auth.spec.ts            # Auth page visual tests
│   └── dashboard.spec.ts       # Dashboard page visual tests (authenticated & unauthenticated)
└── components/
    └── navbar.spec.ts          # Component-level visual tests
```

## Determinism Controls

- **Fake Clock**: All tests use frozen time (`2025-10-01T12:00:00.000Z`) via `freezeTime()` helper
- **Dynamic Masking**: Timestamps, avatars, charts, and animated elements are masked
- **Seeded Data**: Tests use deterministic fixtures
- **Network Stability**: Analytics and external requests are mocked

## CI Integration

Visual regression tests run automatically in CI:

- Job: `visual_regression`
- Runs after: `quality` and `frontend_tests`
- Fails if: maxDiffPixelRatio > 0.2% or any unapproved visual diff
- Artifacts: Screenshots and diffs uploaded for review

## Adding New Visual Tests

1. Create test file in appropriate directory (`pages/` or `components/`)
2. Import helpers: `freezeTime`, `getDynamicMasks`, `assertNoHorizontalOverflow`
3. For protected pages, use `gotoAuthenticated` from `auth.ts` helper
4. Set explicit timeouts: `page.setDefaultTimeout(30000)` for network operations
5. Use `toHaveScreenshot()` with appropriate masks
6. Test across required themes and breakpoints
7. Update baseline screenshots and commit them

Example:

```typescript
import { test, expect } from "@playwright/test";
import { freezeTime } from "../helpers/fakeClock.js";
import { getDynamicMasks } from "../helpers/mask.js";
import { gotoAuthenticated } from "../helpers/auth.js";

test.describe("My Page Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await freezeTime(page);
    page.setDefaultTimeout(30000); // 30s for network operations
  });

  test("my page - light theme - md", async ({ page }) => {
    await gotoAuthenticated(page, "/my-page");
    const masks = await getDynamicMasks(page);
    await expect(page).toHaveScreenshot("my-page/light-md.png", {
      mask: masks,
      fullPage: true,
    });
  });
});
```

## Troubleshooting

### Tests Fail with Visual Differences

1. Review the diff images in CI artifacts
2. If change is intentional:
   - Get design approval
   - Update baselines: `pnpm exec playwright test --update-snapshots`
   - Commit updated baselines with PR
3. If change is unintentional:
   - Investigate CSS/styling changes
   - Check for layout shifts or responsive breakage

### Screenshots Not Matching

- Ensure `freezeTime()` is called in `beforeEach`
- Verify dynamic regions are properly masked
- Check that theme is set correctly (light/dark)
- Ensure viewport matches expected breakpoint

## References

- QA Plan Section 16: Visual Design QA
- Playwright Visual Comparisons: https://playwright.dev/docs/test-screenshots
