#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const allowlistPath = path.resolve(__dirname, "allowed-skips.json");
const allowlist = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
const patterns = (allowlist.namePatterns ?? []).map((source) => new RegExp(source));
const allowedNames = new Set(allowlist.fullNames ?? []);

function isAllowed(fullName) {
  if (allowedNames.has(fullName)) {
    return true;
  }
  return patterns.some((pattern) => pattern.test(fullName));
}

function collectFromJestOrVitest(report) {
  const skipped = [];

  const visitAssertion = (assertion, ancestors = []) => {
    const status = assertion.status ?? assertion.result ?? assertion.mode;
    const title = assertion.fullName ?? assertion.name ?? assertion.title ?? "";
    const ancestorTitles = assertion.ancestorTitles ?? ancestors;
    const fullName =
      title && title.includes(" ")
        ? title
        : [...ancestorTitles, title].filter(Boolean).join(" ").trim();
    if (status === "pending" || status === "todo" || status === "skipped" || status === "skip") {
      skipped.push(fullName || title);
    }
    for (const child of assertion.tasks ?? assertion.assertionResults ?? []) {
      visitAssertion(child, [...ancestorTitles, title].filter(Boolean));
    }
  };

  const suites = report.testResults ?? report.testGraph ?? [];
  for (const suite of suites) {
    const assertions = suite.assertionResults ?? suite.testResults ?? suite.tasks ?? [];
    for (const assertion of assertions) {
      visitAssertion(assertion, suite.ancestorTitles ?? []);
    }
  }
  return skipped;
}

function collectSkipped(report) {
  if (Array.isArray(report)) {
    return report.flatMap((entry) => collectFromJestOrVitest(entry));
  }
  return collectFromJestOrVitest(report);
}

const inputs = process.argv.slice(2);
if (inputs.length === 0) {
  console.error("Usage: node tests/qa/assert-no-unexpected-skips.cjs <jest-or-vitest-json>...");
  process.exit(2);
}

const unexpected = [];
for (const file of inputs) {
  if (!fs.existsSync(file)) {
    console.error(`Skip report not found: ${file}`);
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const fullName of collectSkipped(report)) {
    if (!isAllowed(fullName)) {
      unexpected.push(`${file}: ${fullName}`);
    }
  }
}

if (unexpected.length > 0) {
  console.error("Unexpected skipped tests (add to tests/qa/allowed-skips.json if quarantined):");
  for (const name of unexpected) {
    console.error(`  - ${name}`);
  }
  process.exit(1);
}

console.log("No unexpected skipped tests.");
