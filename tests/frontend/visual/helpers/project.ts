import { test, type TestInfo } from "@playwright/test";

export type VisualTheme = "light" | "dark";
export type VisualViewport = "xs" | "sm" | "md" | "lg";

/**
 * Parses the project name to extract theme and viewport.
 * Project names follow the format: ui:{theme}:{viewport}
 * e.g., "ui:light:xs", "ui:dark:lg"
 */
export function parseProjectName(projectName: string): {
  theme: VisualTheme;
  viewport: VisualViewport;
} {
  const parts = projectName.split(":");
  if (parts.length !== 3 || parts[0] !== "ui") {
    throw new Error(
      `Invalid project name format: ${projectName}. Expected format: ui:{theme}:{viewport}`,
    );
  }

  const theme = parts[1] as VisualTheme;
  const viewport = parts[2] as VisualViewport;

  if (!["light", "dark"].includes(theme)) {
    throw new Error(`Invalid theme in project name: ${theme}. Expected 'light' or 'dark'`);
  }

  if (!["xs", "sm", "md", "lg"].includes(viewport)) {
    throw new Error(
      `Invalid viewport in project name: ${viewport}. Expected 'xs', 'sm', 'md', or 'lg'`,
    );
  }

  return { theme, viewport };
}

/**
 * Checks if the current test should run for the given project configuration.
 * Use this to skip tests that don't match the current project's theme/viewport.
 */
export function shouldRunForProject(
  testInfo: TestInfo,
  expectedTheme: VisualTheme,
  expectedViewport: VisualViewport,
): boolean {
  const { theme, viewport } = parseProjectName(testInfo.project.name);
  return theme === expectedTheme && viewport === expectedViewport;
}

/**
 * Skip this test unless the Playwright project matches the visual matrix.
 * Per QA Plan D.3 — not every page is snapshotted at every breakpoint.
 */
export function skipUnlessMatrix(
  testInfo: TestInfo,
  allowed: { themes?: VisualTheme[]; viewports?: VisualViewport[] },
): void {
  const { theme, viewport } = parseProjectName(testInfo.project.name);
  if (allowed.themes && !allowed.themes.includes(theme)) {
    test.skip();
  }
  if (allowed.viewports && !allowed.viewports.includes(viewport)) {
    test.skip();
  }
}

/**
 * Gets the current project's theme and viewport.
 * Useful for conditional logic based on project configuration.
 */
export function getCurrentProject(testInfo: TestInfo): {
  theme: VisualTheme;
  viewport: VisualViewport;
} {
  return parseProjectName(testInfo.project.name);
}
