#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const coverageFile = path.join(projectRoot, "apps/backend/coverage/coverage-final.json");

if (!fs.existsSync(coverageFile)) {
  console.error("Coverage file not found:", coverageFile);
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coverageFile, "utf8"));

// Calculate coverage for each file
const fileCoverage = [];

for (const [filePath, data] of Object.entries(coverage)) {
  // Skip test files and ignored patterns
  if (
    filePath.includes("__tests__") ||
    filePath.includes("node_modules") ||
    filePath.includes(".d.ts") ||
    filePath.includes("migrations") ||
    filePath.includes("scripts") ||
    !filePath.includes("src/modules")
  ) {
    continue;
  }

  const s = data.s || {}; // statements
  const b = data.b || {}; // branches
  const f = data.f || {}; // functions

  const coveredStatements = Object.values(s).filter((v) => v > 0).length;
  const totalStatements = Object.keys(s).length;
  const coveredBranches = Object.values(b).filter((v) => v > 0).length;
  const totalBranches = Object.keys(b).length;
  const coveredFunctions = Object.values(f).filter((v) => v > 0).length;
  const totalFunctions = Object.keys(f).length;

  const statementCoverage = totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 100;
  const branchCoverage = totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 100;
  const functionCoverage = totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 100;

  // Use statement coverage as primary metric (closest to line coverage)
  const overallCoverage = statementCoverage;

  if (totalStatements > 0) {
    const relativePath = filePath.replace(projectRoot + path.sep, "");
    fileCoverage.push({
      file: relativePath,
      coverage: overallCoverage,
      statements: `${coveredStatements}/${totalStatements}`,
      branches: `${coveredBranches}/${totalBranches}`,
      functions: `${coveredFunctions}/${totalFunctions}`,
      statementPct: statementCoverage,
      branchPct: branchCoverage,
      functionPct: functionCoverage,
    });
  }
}

// Sort by coverage (lowest first)
fileCoverage.sort((a, b) => a.coverage - b.coverage);

console.log("\n=== Files with Lowest Coverage (below 80%) ===\n");
const lowCoverage = fileCoverage.filter((f) => f.coverage < 80);

if (lowCoverage.length === 0) {
  console.log("All files have ≥80% coverage! 🎉");
} else {
  console.log(`Found ${lowCoverage.length} files with coverage below 80%:\n`);
  lowCoverage.slice(0, 30).forEach((item, idx) => {
    console.log(
      `${idx + 1}. ${item.file}\n   Coverage: ${item.coverage.toFixed(2)}% (${item.statements} statements, ${item.branches} branches, ${item.functions} functions)\n`,
    );
  });
}

// Summary statistics
const avgCoverage = fileCoverage.reduce((sum, f) => sum + f.coverage, 0) / fileCoverage.length;
const below80 = fileCoverage.filter((f) => f.coverage < 80).length;
const below90 = fileCoverage.filter((f) => f.coverage < 90).length;

console.log(`\n=== Summary ===`);
console.log(`Total files analyzed: ${fileCoverage.length}`);
console.log(`Average coverage: ${avgCoverage.toFixed(2)}%`);
console.log(`Files below 80%: ${below80}`);
console.log(`Files below 90%: ${below90}`);



