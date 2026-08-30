# Untracked local files review

Temporary checklist after collapsing branches onto `main`. These files are on disk but **not** in Git. Tick keep/drop, then we can add the keepers in a follow-up commit. Delete this file when you are done.

Darwin Playwright PNGs (~36 MB) and unused Inter static fonts (~18 MB) were already deleted. They are not listed here.

## Recommended keep

Documented by the repo but missing from `main` after the merge.

| Keep? | Path                                | Why                                                                 |
| ----- | ----------------------------------- | ------------------------------------------------------------------- |
| [ ]   | `scripts/secrets-scan.sh`           | Referenced by `docs/5.Policies/5.b.Security/SAFE_GIT_PUSH_GUIDE.md` |
| [ ]   | `scripts/dependency-audit.sh`       | Same guide                                                          |
| [ ]   | `scripts/security-scan.sh`          | Referenced by `infra/security/README.md`                            |
| [ ]   | `scripts/gdpr-compliance-check.sh`  | Local GDPR check helper                                             |
| [ ]   | `scripts/run-integration-tests.sh`  | Local integration runner                                            |
| [ ]   | `scripts/run-integration-tests.bat` | Windows counterpart                                                 |

## Likely keep

Matching app components/pages exist. Visual README lists these screens as in-scope; only auth/dashboard/navbar specs are on `main` today.

| Keep? | Path                                             | Why                                                          |
| ----- | ------------------------------------------------ | ------------------------------------------------------------ |
| [ ]   | `tests/frontend/components/VibeSidebar.test.tsx` | `apps/frontend/src/components/layout/VibeSidebar.tsx` exists |
| [ ]   | `tests/frontend/pages/Contact.test.tsx`          | `apps/frontend/src/pages/Contact.tsx` exists                 |
| [ ]   | `tests/frontend/pages/Cookie.test.tsx`           | `apps/frontend/src/pages/Cookie.tsx` exists                  |
| [ ]   | `tests/frontend/pages/Logger.test.tsx`           | `apps/frontend/src/pages/Logger.tsx` exists                  |
| [ ]   | `tests/frontend/visual/pages/feed.spec.ts`       | Visual coverage listed in `tests/frontend/visual/README.md`  |
| [ ]   | `tests/frontend/visual/pages/logger.spec.ts`     | Same                                                         |
| [ ]   | `tests/frontend/visual/pages/planner.spec.ts`    | Same                                                         |
| [ ]   | `tests/frontend/visual/pages/profile.spec.ts`    | Same                                                         |
| [ ]   | `tests/frontend/visual/pages/settings.spec.ts`   | Same                                                         |
| [ ]   | `tests/frontend/visual/helpers/mockApi.ts`       | Helper used by the extra visual specs                        |

Darwin snapshots for those specs were deleted. If you keep the specs, regenerate Linux/Windows baselines with `pnpm test:visual:update` before committing them.

## Likely drop

One-shot tools, Cursor-local helpers, or dangerous git wrappers.

| Drop? | Path                                                 | Why                                 |
| ----- | ---------------------------------------------------- | ----------------------------------- |
| [ ]   | `scripts/add_return_types.py`                        | One-shot TypeScript codemod         |
| [ ]   | `scripts/fix_controller_returns.py`                  | One-shot TypeScript codemod         |
| [ ]   | `scripts/analyze_cursor_chats.py`                    | Local Cursor chat parser            |
| [ ]   | `scripts/check_cursor_rules_compliance.py`           | Cursor-rules checker                |
| [ ]   | `scripts/check_story_implementation.py`              | One-shot story audit                |
| [ ]   | `scripts/create_issues.sh`                           | Requirements-to-issues pipeline     |
| [ ]   | `scripts/create_issues_via_api.py`                   | Same pipeline                       |
| [ ]   | `scripts/generate_github_issues.py`                  | Same pipeline                       |
| [ ]   | `scripts/generate_acceptance_criteria.py`            | Same pipeline                       |
| [ ]   | `scripts/generate_requirements.py`                   | Same pipeline                       |
| [ ]   | `scripts/organize_requirements.py`                   | Same pipeline                       |
| [ ]   | `scripts/project_planning_agent.py`                  | Same pipeline                       |
| [ ]   | `scripts/requirements_to_issues_pipeline.py`         | Same pipeline                       |
| [ ]   | `scripts/git-commit-and-push.sh`                     | Runs `git add -A` then push         |
| [ ]   | `scripts/git-push-branch.sh`                         | Companion to the wrapper above      |
| [ ]   | `tests/qa/test-manager-qa-plan-alignment-updates.md` | Jan 2025 agent note, not product QA |

## Already removed

- 180 untracked `*-darwin.png` visual snapshots under `tests/frontend/visual/pages/`
- 54 unused Inter static `.ttf` files under `apps/frontend/public/fonts/Inter/static/`
- `scripts/generated/create_github_issues.sh` (and the empty `scripts/generated/` directory)
