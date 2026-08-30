# ADR-025: Lower Lighthouse CI Thresholds by 15%

**Date:** 2025-12-27  
**Status:** Accepted  
**Author:** Konstantinos Pilpilidis  
**Cross-References:** CI workflow; Lighthouse configuration

---

## Context

The Lighthouse CI run in the GitHub Actions workflow fails on the login page because the
performance score is sensitive to shared CI hardware and background variability. Local
runs are more consistent and can meet stricter thresholds. We need CI to detect genuine
regressions without failing for hardware-related variance.

---

## Decision

Lower Lighthouse CI thresholds by 15% compared to local thresholds to account for
worst-case CI hardware and runtime variance. This applies consistently to category
minimum scores and numeric budgets in the CI-specific Lighthouse configuration.

---

## Consequences

- CI becomes more stable while still enforcing quality gates.
- Local thresholds remain strict, keeping the target bar high for developers.
- Very small regressions that only manifest under ideal conditions may be missed in CI.

---

## Alternatives Considered

| Option   | Description                                    | Reason Rejected                                       |
| -------- | ---------------------------------------------- | ----------------------------------------------------- |
| Option A | Keep identical thresholds in CI and local runs | CI failures were frequent due to hardware variability |
| Option B | Disable Lighthouse assertions in CI            | Removes performance guardrails entirely               |
| Option C | Increase runs and average results              | Higher CI time and cost, still variable               |

---

## References

- CI workflow: `.github/workflows/ci.yml`
- CI Lighthouse config: `tests/perf/lighthouserc.ci.json`
- Local Lighthouse config: `tests/perf/lighthouserc.json`

---

## Status Log

| Version | Date       | Change        | Author                  |
| ------- | ---------- | ------------- | ----------------------- |
| v1.0    | 2025-12-27 | Initial draft | Konstantinos Pilpilidis |
