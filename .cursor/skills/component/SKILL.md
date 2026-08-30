---
name: component
description: Create or update React components with i18n, ui primitives, and tests. Use when the user types /component or asks to add a FitVibe UI component.
disable-model-invocation: true
---

# React component

1. Pages in `pages/`, reusable UI in `components/`. Reuse `components/ui/` first. Not feature-sliced.
2. `useTranslation` for copy. Keys in every locale under `apps/frontend/src/i18n/locales/{en,de,el,es,fr}/`.
3. Use `FormField` for inputs. Keyboard and labels required.
4. TanStack Query / Zustand. Cookie auth is already in `apps/frontend/src/services/api.ts`.
5. Tests in `tests/frontend/`.
