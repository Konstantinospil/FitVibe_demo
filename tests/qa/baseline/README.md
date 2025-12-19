# QA Plan Baseline

This directory stores the canonical snapshot of the QA Plan (v2.0) quality
objectives. The baseline mirrors the targets defined in
`docs/4.Testing_and_Quality_Assurance_Plan/4a.Testing_and_Quality_Assurance_Plan.md` and records the current
measurement status for each objective.

- `qa_plan_v2.0.json` &mdash; structured baseline data (targets, gates, status).
- `../assert-baseline.js` &mdash; sanity-check script that validates the baseline
  schema and status values during CI.

Update the JSON file whenever a gate obtains evidence (e.g. new tests land) and
append links to those artifacts in the `evidence` array. Status values must be
one of the legend entries in the JSON (`met`, `not_met`, `not_measured`,
`waived`). Waivers require the mitigation and expiry to be documented alongside
the evidence links.
