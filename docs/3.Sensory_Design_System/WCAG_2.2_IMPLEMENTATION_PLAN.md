# WCAG 2.2 Implementation Plan

**Epic**: E13 - WCAG 2.2 Compliance Update  
**Status**: In Progress  
**Created**: 2025-01-21

## Overview

This document provides a detailed implementation plan for updating FitVibe's accessibility compliance from WCAG 2.1 AA to WCAG 2.2 AA. It specifies exact file locations, line numbers, and content changes needed.

## File Changes Summary

| File                                                                                                            | Section           | Change Type | Priority |
| --------------------------------------------------------------------------------------------------------------- | ----------------- | ----------- | -------- |
| `docs/3.Sensory_Design_System/3.b.Visual Design System.md`                                                      | Multiple sections | Update      | High     |
| `docs/2.Technical_Design_Document/2.f.Architectural_Decision_Documentation/ADR-020-accessibility-compliance.md` | Title, references | Update      | High     |
| `docs/1.Product_Requirements/Requirements/progressing/NFR-004-a11y.md`                                          | References        | Update      | High     |
| `tests/frontend/e2e/accessibility.spec.cjs`                                                                     | Test tags         | Update      | High     |

---

## Detailed Changes

### 1. Visual Design System (`docs/3.Sensory_Design_System/3.b.Visual Design System.md`)

#### Change 1.1: Update Summary Line (Line 12)

**Location**: Line 12  
**Current**: `**Summary.** This guide is the single source of truth for FitVibe's look & feel. It locks the **Option A color/vibe canon** (your original seeds), defines tokens (Tailwind-ready), and specifies patterns for key screens with WCAG 2.1 AA baked in.`  
**New**: `**Summary.** This guide is the single source of truth for FitVibe's look & feel. It locks the **Option A color/vibe canon** (your original seeds), defines tokens (Tailwind-ready), and specifies patterns for key screens with WCAG 2.2 AA baked in.`  
**Rationale**: Update to latest WCAG standard

#### Change 1.2: Update Section 9 - Accessibility Checklist

**Location**: Lines 230-238  
**Current Content**:

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

**New Content**:

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

**Rationale**: Organize by WCAG principles, add all 9 new WCAG 2.2 criteria

#### Change 1.3: Add Section 7.6 - Status Messages Pattern

**Location**: After Section 7.5 (Forms), before Section 8  
**Insert After**: Line 196  
**New Content**:

````markdown
### 7.6 Status Messages

- **Polite updates:** Use `role="status"` with `aria-live="polite"` for non-critical updates (e.g., "Session saved", "Loading...", connection status).
- **Assertive updates:** Use `role="alert"` with `aria-live="assertive"` for critical errors or urgent notifications (e.g., "Login failed", "System maintenance").
- **Implementation:** Status messages must be programmatically determinable without receiving focus (WCAG 2.2: 4.1.3).
- **Best practices:**
  - Use `aria-live="polite"` for updates that don't require immediate attention
  - Use `aria-live="assertive"` sparingly, only for critical errors
  - Always provide `aria-label` or visible text content
  - Avoid updating status messages too frequently (can overwhelm screen readers)

**Example (React):**

```tsx
// Polite status update
<div role="status" aria-live="polite" aria-label="Status: Online">
  <StatusPill status="online" />
</div>

// Assertive error message
<div role="alert" aria-live="assertive">
  Error: Invalid credentials. Please try again.
</div>
```
````

**Existing Components:**

- `StatusPill` component already implements `role="status"` and `aria-live="polite"`
- `MaintenanceBanner` uses `role="alert"` and `aria-live="assertive"`
- Form error messages should use `role="alert"` for validation errors

````

**Rationale**: Document status message patterns required by WCAG 2.2 (4.1.3)

#### Change 1.4: Update Section 8.4.8 - Accessibility & Contrast
**Location**: Lines 460-469
**Current Content**:
```markdown
#### 8.4.8 Accessibility & Contrast

- All text-to-background contrast ratios ≥ 4.5 : 1 (WCAG 2.1 AA).
- Color-blind-safe palette verified for deuteranopia and protanopia.
- Hover and focus states rely on both **color** and **shadow/glow** cues.
- Maintain a **maximum line length of 65-75 characters** for body text.
- Avoid all-caps in large blocks of text.
- Preserve at least **1.4 em vertical spacing** between paragraphs.
- Headings and UI labels must maintain **≥ 4.5 : 1** color contrast ratio.
- Typography is validated for clarity on **Retina / 4K** and **OLED** displays.
````

**New Content**:

```markdown
#### 8.4.8 Accessibility & Contrast (WCAG 2.2 AA)

- All text-to-background contrast ratios ≥ 4.5 : 1 (WCAG 2.2 AA).
- Color-blind-safe palette verified for deuteranopia and protanopia.
- Hover and focus states rely on both **color** and **shadow/glow** cues.
- **Focus Not Obscured (2.4.11):** Focus indicators must be visible and not hidden by sticky headers, modals, or overlays. Minimum 2px visibility required.
- **Target Size (2.5.8):** Pointer input targets must be at least 24×24 CSS pixels (minimum), recommend 44×44 for better usability. Exceptions: inline links, user agent controls, essential targets.
- **Status Messages (4.1.3):** All dynamic status updates must use appropriate ARIA roles (`role="status"` for polite, `role="alert"` for assertive) and be programmatically determinable.
- Maintain a **maximum line length of 65-75 characters** for body text.
- Avoid all-caps in large blocks of text.
- Preserve at least **1.4 em vertical spacing** between paragraphs.
- Headings and UI labels must maintain **≥ 4.5 : 1** color contrast ratio.
- Typography is validated for clarity on **Retina / 4K** and **OLED** displays.
```

**Rationale**: Add WCAG 2.2 specific requirements (2.4.11, 2.5.8, 4.1.3)

#### Change 1.5: Update Section 8.1 - Design Notes (Line 313)

**Location**: Line 313  
**Current**: `The tone is **minimalist**, **professional**, and **accessible**, aligning with WCAG 2.1 AA standards.`  
**New**: `The tone is **minimalist**, **professional**, and **accessible**, aligning with WCAG 2.2 AA standards.`  
**Rationale**: Update reference to latest standard

#### Change 1.6: Update Section 8.4.7.1 - Design Principles (Line 399)

**Location**: Line 399  
**Current**: `- **Accessibility:** Conforms to WCAG 2.1 AA for size and contrast; supports text scaling to 200 %.`  
**New**: `- **Accessibility:** Conforms to WCAG 2.2 AA for size and contrast; supports text scaling to 200 %.`  
**Rationale**: Update reference to latest standard

---

### 2. ADR-020 (`docs/2.Technical_Design_Document/2.f.Architectural_Decision_Documentation/ADR-020-accessibility-compliance.md`)

#### Change 2.1: Update Title

**Location**: Line 1  
**Current**: `# ADR-020: Accessibility Compliance (WCAG 2.1 AA) & Inclusive UX`  
**New**: `# ADR-020: Accessibility Compliance (WCAG 2.2 AA) & Inclusive UX`  
**Rationale**: Update to latest standard

#### Change 2.2: Update Context Section

**Location**: Line 12  
**Current**: `The product must be perceivable, operable, understandable, and robust to **WCAG 2.1 AA**.`  
**New**: `The product must be perceivable, operable, understandable, and robust to **WCAG 2.2 AA**.`  
**Rationale**: Update to latest standard

#### Change 2.3: Update Decision Section

**Location**: Line 21  
**Current**: `   - Target **WCAG 2.1 AA** for web UX.`  
**New**: `   - Target **WCAG 2.2 AA** for web UX.`  
**Rationale**: Update to latest standard

#### Change 2.4: Add WCAG 2.2 Specific Requirements

**Location**: After line 30 (after Animations bullet)  
**New Content**:

```markdown
- **WCAG 2.2 additions:**
  - **Focus Not Obscured (2.4.11):** Focus indicators must not be hidden by overlays; minimum 2px visibility.
  - **Dragging Movements (2.5.7):** All drag operations must have keyboard alternatives.
  - **Target Size (2.5.8):** Minimum 24×24 CSS pixels for pointer targets (exceptions documented).
  - **Consistent Help (3.2.6):** Help mechanisms must appear in same relative order across pages.
  - **Redundant Entry (3.3.7):** Auto-populate previously entered information where appropriate.
  - **Accessible Authentication (3.3.8):** No cognitive function tests in authentication flows.
  - **Status Messages (4.1.3):** Status messages must be programmatically determinable via ARIA roles.
```

**Rationale**: Document all 9 new WCAG 2.2 criteria

---

### 3. NFR-004 (`docs/1.Product_Requirements/Requirements/progressing/NFR-004-a11y.md`)

#### Change 3.1: Update Success Criteria

**Location**: Line 25  
**Current**: `- **Success Criteria**: WCAG 2.1 AA compliance, keyboard navigation works, and screen readers are supported.`  
**New**: `- **Success Criteria**: WCAG 2.2 AA compliance, keyboard navigation works, and screen readers are supported.`  
**Rationale**: Update to latest standard

#### Change 3.2: Update Acceptance Criterion

**Location**: Line 43  
**Current**: `**Criterion**: Color contrast ≥ 4.5:1 for text; axe checks yield 0 critical issues across key pages.`  
**New**: `**Criterion**: Color contrast ≥ 4.5:1 for text; WCAG 2.2 AA compliance; axe checks yield 0 critical issues across key pages.`  
**Rationale**: Explicitly mention WCAG 2.2

---

### 4. Accessibility Tests (`tests/frontend/e2e/accessibility.spec.cjs`)

#### Change 4.1: Update Axe Tags

**Location**: Line 67  
**Current**:

```javascript
const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
```

**New**:

```javascript
const results = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
  .analyze();
```

**Rationale**: Include WCAG 2.2 tags in automated testing

---

## Implementation Order

1. **Documentation Updates** (E13-A1, E13-A2, E13-A3)
   - Update Visual Design System (Change 1.1-1.6)
   - Update ADR-020 (Change 2.1-2.4)
   - Update NFR-004 (Change 3.1-3.2)

2. **Test Updates** (E13-A11)
   - Update accessibility tests (Change 4.1)

3. **Code Implementation** (E13-A4 through E13-A10)
   - Focus visibility audit
   - Keyboard alternatives for dragging
   - Target size verification
   - Help mechanism consistency
   - Form data persistence
   - Authentication pattern review
   - Status messages verification

4. **Validation** (E13-A12)
   - Run full accessibility audit
   - Verify all criteria pass

---

## Verification Checklist

After implementation, verify:

- [ ] All documentation references WCAG 2.2 AA
- [ ] Visual Design System includes status messages pattern
- [ ] Accessibility checklist organized by WCAG principles
- [ ] ADR-020 includes all 9 new WCAG 2.2 criteria
- [ ] NFR-004 updated to reference WCAG 2.2
- [ ] Tests include WCAG 2.2 tags
- [ ] All automated tests pass
- [ ] Manual testing confirms compliance

---

## References

- [WCAG 2.2 Release Notes](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [WCAG 2.2 Success Criteria](https://www.w3.org/WAI/WCAG22/quickref/)
- [Focus Not Obscured (2.4.11)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- [Target Size (2.5.8)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [Status Messages (4.1.3)](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
