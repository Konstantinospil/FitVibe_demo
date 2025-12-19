import type { TestInfo } from "@playwright/test";

/**
 * Parses the project name to extract theme and viewport.
 * Project names follow the format: ui:{theme}:{viewport}
 * e.g., "ui:light:xs", "ui:dark:lg"
 */
export function parseProjectName(projectName: string): {
  theme: "light" | "dark";
  viewport: "xs" | "sm" | "md" | "lg";
} {
  const parts = projectName.split(":");
  if (parts.length !== 3 || parts[0] !== "ui") {
    throw new Error(
      `Invalid project name format: ${projectName}. Expected format: ui:{theme}:{viewport}`,
    );
  }

  const theme = parts[1] as "light" | "dark";
  const viewport = parts[2] as "xs" | "sm" | "md" | "lg";

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
  expectedTheme: "light" | "dark",
  expectedViewport: "xs" | "sm" | "md" | "lg",
): boolean {
  const projectName = testInfo.project.name;
  const { theme, viewport } = parseProjectName(projectName);
  return theme === expectedTheme && viewport === expectedViewport;
}

/**
 * Gets the current project's theme and viewport.
 * Useful for conditional logic based on project configuration.
 */
export function getCurrentProject(testInfo: TestInfo): {
  theme: "light" | "dark";
  viewport: "xs" | "sm" | "md" | "lg";
} {
  return parseProjectName(testInfo.project.name);
}

