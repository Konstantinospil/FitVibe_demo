# WCAG 2.2 Update Plan for Visual Design System

## Current Status

The Visual Design System currently references **WCAG 2.1 AA** but should be updated to **WCAG 2.2 AA** (released October 2023). This document outlines the gaps and required updates.

## New WCAG 2.2 Success Criteria (AA Level)

### 1. **2.4.11 Focus Not Obscured (Minimum)** (AA)

**Requirement:** When a component receives keyboard focus, it must not be entirely hidden by author-created content (e.g., sticky headers, modals, popovers).

**Current Status:**

- ✅ Focus rings are implemented (`--focus-glow` in design system)
- ⚠️ Need to verify: sticky headers, modals, and tooltips don't obscure focused elements
- ⚠️ Need to ensure focus indicators are at least partially visible

**Action Items:**

- Add z-index guidelines for focusable elements
- Document focus trap patterns for modals
- Specify minimum focus indicator visibility (2px outline minimum)

### 2. **2.5.7 Dragging Movements** (AA)

**Requirement:** All functionality that uses dragging must be achievable with a single pointer without dragging, unless dragging is essential.

**Current Status:**

- ⚠️ Planner has drag-and-drop functionality
- ❓ Need to verify keyboard alternatives exist for all drag operations

**Action Items:**

- Document keyboard alternatives for drag-and-drop in Planner
- Ensure all draggable items have keyboard navigation (arrow keys, Enter to activate)
- Add pattern: "Drag operations must have keyboard equivalents"

### 3. **2.5.8 Target Size (Minimum)** (AA)

**Requirement:** Pointer input targets must be at least 24×24 CSS pixels, with exceptions for inline links, user agent controls, and essential targets.

**Current Status:**

- ✅ Design system specifies 44×44px minimum (exceeds requirement)
- ✅ Forms section mentions "Tappable controls ≥44px"
- ✅ Button guidelines specify "min target 44×44"

**Action Items:**

- Update guide to explicitly mention 24×24px as WCAG 2.2 minimum
- Note that 44×44px is recommended for better usability
- Document exceptions (inline links, essential targets)

### 4. **3.2.6 Consistent Help** (A)

**Requirement:** If a help mechanism (e.g., help link, contact form) is repeated across pages, it must appear in the same relative order.

**Current Status:**

- ❓ Help mechanisms not explicitly documented
- ❓ Need to verify help links/forms are consistently placed

**Action Items:**

- Document help mechanism placement patterns
- Specify consistent location (e.g., footer, settings page)
- Add to navigation guidelines

### 5. **3.3.7 Redundant Entry** (A)

**Requirement:** Information previously entered by the user must be auto-populated or available for selection, except when re-entry is essential for security or the data is no longer valid.

**Current Status:**

- ✅ Forms use browser autocomplete attributes
- ⚠️ Need to verify: registration forms, multi-step forms preserve data
- ⚠️ Need to check: session planner, logger preserve entered data

**Action Items:**

- Document form data persistence patterns
- Specify when auto-population is required vs. optional
- Add to form guidelines: "Preserve user input on validation errors"

### 6. **3.3.8 Accessible Authentication (Minimum)** (AA)

**Requirement:** Cognitive function tests (e.g., remembering a password, solving a puzzle) must not be required for any step in an authentication process unless at least one of the following is true:

- The cognitive function test is to recognize objects
- The cognitive function test is to identify non-text content the user provided
- Alternative authentication is available

**Current Status:**

- ✅ No CAPTCHA currently implemented
- ✅ 2FA uses TOTP (time-based, not cognitive test)
- ⚠️ Need to verify: password reset flows don't require cognitive tests
- ⚠️ Need to document: if CAPTCHA is added, must provide alternatives

**Action Items:**

- Document authentication patterns
- Specify: "No cognitive function tests in authentication"
- Add exception handling if CAPTCHA is required (must provide alternative)

### 7. **4.1.3 Status Messages** (AA)

**Requirement:** Status messages must be programmatically determinable through role or properties, without receiving focus.

**Current Status:**

- ✅ StatusPill component uses `role="status"` and `aria-live="polite"`
- ✅ MaintenanceBanner uses `role="alert"` and `aria-live="assertive"`
- ✅ Form errors use `role="alert"` in components
- ⚠️ Need to verify: all dynamic status updates use appropriate ARIA

**Action Items:**

- Document status message patterns (role="status" for polite, role="alert" for assertive)
- Specify when to use `aria-live="polite"` vs `aria-live="assertive"`
- Add to component guidelines: "All status messages must be programmatically determinable"

## Additional WCAG 2.2 Enhancements (AAA Level - Optional)

### 8. **2.4.12 Focus Not Obscured (Enhanced)** (AAA)

**Requirement:** When a component receives keyboard focus, no part of the focus indicator is hidden by author-created content.

**Note:** This is AAA level, but good practice to follow where possible.

### 9. **3.3.9 Accessible Authentication (Enhanced)** (AAA)

**Requirement:** Cognitive function tests must not be required for any step in an authentication process.

**Note:** Already covered by 3.3.8 (AA), but AAA removes all exceptions.

## Recommended Updates to Visual Design System

### Section 9: Accessibility Checklist (AA) - Update to WCAG 2.2

**Current:**

```markdown
## 9) Accessibility Checklist (AA)

- [ ] All text/background pairs ≥ **4.5:1** (check light & dark).
- [ ] Focus styles: visible ring + non-color cue (glow/outline).
- [ ] Keyboard path: login → planner → logger → export (no traps).
- [ ] Form errors announced via ARIA; labels bound to inputs.
- [ ] Charts include data table toggle + textual summary.
- [ ] Pointer targets ≥44×44; spacing ≥8px between adjacent controls.
- [ ] `prefers-reduced-motion` respected.
```

**Proposed Update:**

```markdown
## 9) Accessibility Checklist (WCAG 2.2 AA)

### Perceivable

- [ ] All text/background pairs ≥ **4.5:1** (check light & dark).
- [ ] Status messages programmatically determinable (role="status" or role="alert").
- [ ] Charts include data table toggle + textual summary.

### Operable

- [ ] Focus styles: visible ring + non-color cue (glow/outline).
- [ ] Focus not obscured by sticky headers, modals, or overlays (2.4.11).
- [ ] Keyboard path: login → planner → logger → export (no traps).
- [ ] All drag operations have keyboard alternatives (2.5.7).
- [ ] Pointer targets ≥24×24 CSS pixels (2.5.8); recommend 44×44 for better usability.
- [ ] Spacing ≥8px between adjacent controls.

### Understandable

- [ ] Form errors announced via ARIA; labels bound to inputs.
- [ ] Help mechanisms appear in consistent location across pages (3.2.6).
- [ ] Previously entered information auto-populated where appropriate (3.3.7).
- [ ] No cognitive function tests in authentication (3.3.8).

### Robust

- [ ] `prefers-reduced-motion` respected.
- [ ] Semantic HTML with ARIA only when necessary.
```

### New Section: Status Messages Pattern

Add after Section 7.5 (Forms):

````markdown
### 7.6 Status Messages

- **Polite updates:** Use `role="status"` with `aria-live="polite"` for non-critical updates (e.g., "Session saved", "Loading...").
- **Assertive updates:** Use `role="alert"` with `aria-live="assertive"` for critical errors or urgent notifications.
- **Implementation:** Status messages must be programmatically determinable without receiving focus (WCAG 2.2: 4.1.3).

**Example:**

```html
<div role="status" aria-live="polite" aria-label="Status: Online">Online</div>
<div role="alert" aria-live="assertive">Error: Invalid credentials</div>
```
````

````

### Update Section 8.4.8: Accessibility & Contrast

**Add:**
- Focus Not Obscured: Ensure focus indicators are visible and not hidden by overlays
- Target Size: Minimum 24×24 CSS pixels (WCAG 2.2), recommend 44×44 for better usability
- Status Messages: All dynamic status updates must use appropriate ARIA roles

## Implementation Verification Checklist

- [ ] Update all references from "WCAG 2.1 AA" to "WCAG 2.2 AA"
- [ ] Verify focus indicators are not obscured by sticky headers
- [ ] Verify all drag operations have keyboard alternatives
- [ ] Verify help mechanisms are consistently placed
- [ ] Verify form data persistence on errors
- [ ] Verify authentication doesn't require cognitive tests
- [ ] Verify all status messages use appropriate ARIA roles
- [ ] Update accessibility tests to include WCAG 2.2 tags
- [ ] Update ADR-020 to reference WCAG 2.2
- [ ] Update NFR-004 to reference WCAG 2.2

## Testing Updates

Update `tests/frontend/e2e/accessibility.spec.cjs` to include WCAG 2.2 tags:

```javascript
const results = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag22aa"]) // Add WCAG 2.2 tags
  .analyze();
````

## References

- [WCAG 2.2 Release Notes](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [WCAG 2.2 Success Criteria](https://www.w3.org/WAI/WCAG22/quickref/)
- [Focus Not Obscured (2.4.11)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- [Target Size (2.5.8)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [Status Messages (4.1.3)](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)



