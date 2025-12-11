#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const baselinePath = path.join(repoRoot, "tests/qa/baseline/qa_plan_v2.0.json");
const coverageSummaryPath = path.join(repoRoot, "coverage/coverage-summary.json");
const k6SummaryPath = path.join(repoRoot, "tests/perf/k6-summary.json");
const summaryDir = path.join(repoRoot, "tests/qa/summary");
const grafanaUrl =
  process.env.QA_GRAFANA_URL ||
  "https://grafana.example.com/d/fitvibe-qa/overview?orgId=1&viewPanel=qa-trend";

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.warn(`Failed to parse ${filePath}: ${error.message}`);
    return null;
  }
}

const baseline = readJsonSafe(baselinePath);
if (!baseline) {
  console.error("Unable to load QA baseline JSON.");
  process.exit(1);
}

const coverage = readJsonSafe(coverageSummaryPath);
const k6Summary = readJsonSafe(k6SummaryPath);

const coverageTotals = coverage?.total ?? {};
const coverageMetrics = {
  lines: coverageTotals.lines?.pct ?? null,
  statements: coverageTotals.statements?.pct ?? null,
  branches: coverageTotals.branches?.pct ?? null,
  functions: coverageTotals.functions?.pct ?? null,
};

function extractK6Metric(metric) {
  if (!metric) {
    return null;
  }
  const values = metric.values ?? metric;
  return (
    values["p(95)"] ?? values["p(99)"] ?? values["95"] ?? values["99"] ?? values["avg"] ?? null
  );
}

const perfMetrics = {
  httpP95: extractK6Metric(k6Summary?.metrics?.http_req_duration),
  errorRate:
    k6Summary?.metrics?.http_req_failed?.values?.rate ??
    k6Summary?.metrics?.http_req_failed?.rate ??
    null,
};

await fs.promises.mkdir(summaryDir, { recursive: true });

const summaryData = {
  generatedAt: new Date().toISOString(),
  coverage: coverageMetrics,
  perf: perfMetrics,
  grafanaUrl,
  objectives: baseline.objectives ?? [],
};

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>FitVibe QA Summary</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      }
      body {
        margin: 0;
        padding: 2.5rem;
        background: #050914;
        color: #e2e8f0;
        line-height: 1.5;
      }
      h1, h2 {
        margin: 0 0 0.5rem 0;
      }
      .card {
        border-radius: 20px;
        padding: 1.75rem;
        background: rgba(15, 23, 42, 0.75);
        border: 1px solid rgba(148, 163, 184, 0.18);
        box-shadow: 0 30px 60px -35px #000;
        margin-bottom: 1.5rem;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
      }
      .metric {
        padding: 1rem;
        border-radius: 16px;
        background: rgba(15, 23, 42, 0.65);
        border: 1px solid rgba(148, 163, 184, 0.14);
      }
      .metric h3 {
        margin: 0;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #94a3b8;
      }
      .metric p {
        font-size: 2rem;
        margin: 0.35rem 0 0;
        font-weight: 600;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      table th, table td {
        text-align: left;
        padding: 0.65rem 0.5rem;
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
      }
      table th {
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
      }
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.8rem;
        letter-spacing: 0.05em;
      }
      .status-green { background: rgba(16, 185, 129, 0.12); color: #34d399; }
      .status-amber { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
      .status-red { background: rgba(248, 113, 113, 0.15); color: #f87171; }
      iframe {
        width: 100%;
        border: none;
        min-height: 420px;
        border-radius: 18px;
      }
    </style>
  </head>
  <body>
    <header style="margin-bottom: 2rem;">
      <p style="letter-spacing: 0.3em; text-transform: uppercase; color: #94a3b8;">Quality Engineering</p>
      <h1>FitVibe QA Summary</h1>
      <p style="color: #94a3b8;">Generated ${summaryData.generatedAt}</p>
    </header>

    <section class="card">
      <h2>Coverage</h2>
      <div class="grid">
        ${Object.entries(coverageMetrics)
          .map(
            ([metric, value]) => `
          <div class="metric">
            <h3>${metric}</h3>
            <p>${value === null ? "–" : `${value.toFixed(1)}%`}</p>
          </div>`,
          )
          .join("")}
      </div>
    </section>

    <section class="card">
      <h2>Performance</h2>
      <div class="grid">
        <div class="metric">
          <h3>HTTP p95</h3>
          <p>${
            summaryData.perf.httpP95 == null
              ? "–"
              : `${Number(summaryData.perf.httpP95).toFixed(2)} ms`
          }</p>
        </div>
        <div class="metric">
          <h3>Error rate</h3>
          <p>${
            summaryData.perf.errorRate == null
              ? "–"
              : `${Number(summaryData.perf.errorRate * 100).toFixed(3)}%`
          }</p>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>QA Objectives</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Objective</th>
            <th>Target</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${(summaryData.objectives ?? [])
            .map((objective) => {
              const statusClass =
                objective.status === "green"
                  ? "status-green"
                  : objective.status === "amber"
                    ? "status-amber"
                    : "status-red";
              return `<tr>
                <td>${objective.id}</td>
                <td>${objective.objective}</td>
                <td>${objective.target}</td>
                <td><span class="status-pill ${statusClass}">${objective.status.toUpperCase()}</span></td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </section>

    <section class="card">
      <h2>Grafana Trend</h2>
      <p style="color:#94a3b8">Embedded link to QA scorecard in Grafana.</p>
      <iframe src="${grafanaUrl}" title="Grafana QA Trend"></iframe>
    </section>
  </body>
</html>
`;

await fs.promises.writeFile(path.join(summaryDir, "index.html"), html, "utf8");
await fs.promises.writeFile(
  path.join(summaryDir, "summary.json"),
  JSON.stringify(summaryData, null, 2),
);

console.log(`QA summary generated at ${path.relative(repoRoot, summaryDir)}`);
