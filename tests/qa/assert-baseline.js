#!/usr/bin/env node
/**
 * Validates the QA Plan baseline JSON to ensure the structure and statuses
 * stay consistent with the expectations documented in
 * apps/docs/4a.Testing_and_Quality_Assurance_Plan.md.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baselinePath = path.resolve(__dirname, "baseline", "qa_plan_v2.0.json");

if (!fs.existsSync(baselinePath)) {
  console.error(`QA baseline not found at ${baselinePath}`);
  process.exit(1);
}

let baseline;
try {
  baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
} catch (error) {
  console.error("Failed to parse QA baseline JSON:", error.message);
  process.exit(1);
}

const requiredRootFields = ["version", "generatedAt", "statusLegend", "objectives"];
for (const field of requiredRootFields) {
  if (!(field in baseline)) {
    console.error(`Baseline is missing required root field "${field}".`);
    process.exit(1);
  }
}

if (!Array.isArray(baseline.objectives) || baseline.objectives.length === 0) {
  console.error("Baseline must include at least one objective entry.");
  process.exit(1);
}

const allowedStatuses = new Set(Object.keys(baseline.statusLegend));
const requiredObjectiveFields = [
  "id",
  "objective",
  "target",
  "gate",
  "status",
  "linkedTasks",
  "evidence",
];

for (const objective of baseline.objectives) {
  for (const field of requiredObjectiveFields) {
    if (!(field in objective)) {
      console.error(`Objective "${objective.id ?? "unknown"}" is missing field "${field}".`);
      process.exit(1);
    }
  }

  if (typeof objective.id !== "string" || objective.id.trim().length === 0) {
    console.error("Each objective must include a non-empty string id.");
    process.exit(1);
  }

  if (!allowedStatuses.has(objective.status)) {
    console.error(
      `Objective "${objective.id}" has invalid status "${objective.status}". Expected one of: ${[
        ...allowedStatuses,
      ].join(", ")}`,
    );
    process.exit(1);
  }

  if (!Array.isArray(objective.linkedTasks)) {
    console.error(`Objective "${objective.id}" field "linkedTasks" must be an array.`);
    process.exit(1);
  }

  if (!Array.isArray(objective.evidence)) {
    console.error(`Objective "${objective.id}" field "evidence" must be an array.`);
    process.exit(1);
  }
}

console.log(`QA baseline (${baseline.version}) validated successfully.`);
