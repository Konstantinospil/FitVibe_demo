const { defineConfig } = require("@playwright/test");
const DEFAULT_BASE_URL = "http://127.0.0.1:4173";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE_URL;

module.exports = defineConfig({
  testDir: __dirname,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command:
      "corepack pnpm --filter @fitvibe/frontend exec vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  reporter: [
    ["line"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],
});
