import { defineConfig, devices } from "@playwright/test";

const light = { name: "light", colorScheme: "light" as const };
const dark = { name: "dark", colorScheme: "dark" as const };

const viewports = [
  { name: "xs", width: 360, height: 900 },
  { name: "sm", width: 640, height: 900 },
  { name: "md", width: 1024, height: 900 },
  { name: "lg", width: 1280, height: 900 },
];

export default defineConfig({
  testDir: "../",
  outputDir: "../__screenshots__",
  reporter: [
    ["html", { outputFolder: "../../playwright-report/visual", open: "never" }],
    ["list"],
    ["junit", { outputFile: "../../test-results/visual-junit.xml" }],
  ],
  use: {
    baseURL: process.env.APP_URL || "http://localhost:4173",
    timezoneId: "UTC",
    locale: "en-US",
    geolocation: { latitude: 52.52, longitude: 13.405 }, // Berlin for consistency
    colorScheme: "light",
    viewport: { width: 1024, height: 900 },
    video: "off",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    ...[light, dark].flatMap((theme) =>
      viewports.map((vp) => ({
        name: `ui:${theme.name}:${vp.name}`,
        use: {
          ...devices["Desktop Chrome"],
          colorScheme: theme.colorScheme,
          viewport: { width: vp.width, height: vp.height },
        },
      })),
    ),
  ],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002, // 0.2% as per QA Plan VIZ-SNAP-02
      threshold: 0.2,
    },
  },
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  // In CI, we build and start the server explicitly, so disable webServer
  // In local development, webServer will auto-start the preview server
  webServer: process.env.CI
    ? undefined
    : {
        command:
          "corepack pnpm --filter @fitvibe/frontend exec vite preview --host 127.0.0.1 --port 4173 --strictPort",
        url: "http://127.0.0.1:4173",
        timeout: 120_000,
        reuseExistingServer: true,
      },
});
