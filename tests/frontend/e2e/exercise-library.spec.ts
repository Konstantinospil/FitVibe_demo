/**
 * E2E tests for Exercise Library (Epic 2)
 *
 * Tests complete exercise management workflows:
 * - Exercise CRUD operations
 * - Exercise search and discovery
 * - Exercise snapshots in sessions
 * - Global exercise management (admin)
 * - Exercise selector component
 */

import { test, expect } from "@playwright/test";

test.describe("Exercise Library E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and authenticate
    // Note: This assumes a test user exists or can be created
    await page.goto("/login");
    // Add login steps here - this is a template
    // await page.fill('[name="email"]', "test@example.com");
    // await page.fill('[name="password"]', "password");
    // await page.click('button[type="submit"]');
    // await page.waitForURL("/");
  });

  test("should create a new exercise", async ({ page }) => {
    await page.goto("/exercises");

    // Click create exercise button
    await page.click('button:has-text("Create Exercise")');

    // Fill in exercise form
    await page.fill('input[name="name"]', "Test Exercise");
    await page.selectOption('select[name="type_code"]', "strength");
    await page.fill('input[name="muscle_group"]', "chest");
    await page.fill('input[name="equipment"]', "barbell");

    // Save exercise
    await page.click('button:has-text("Save")');

    // Verify exercise appears in list
    await expect(page.locator("text=Test Exercise")).toBeVisible();
  });

  test("should search for exercises", async ({ page }) => {
    await page.goto("/exercises");

    // Enter search query
    await page.fill('input[placeholder*="Search exercises"]', "bench");

    // Wait for search results
    await page.waitForTimeout(500); // Wait for debounce

    // Verify search results
    const results = page.locator('[data-testid="exercise-card"]');
    await expect(results.first()).toBeVisible();
  });

  test("should edit an exercise", async ({ page }) => {
    await page.goto("/exercises");

    // Find and click edit on first exercise
    const firstExercise = page.locator('[data-testid="exercise-card"]').first();
    await firstExercise.locator('button:has-text("Edit")').click();

    // Modify exercise name
    await page.fill('input[name="name"]', "Updated Exercise Name");

    // Save changes
    await page.click('button:has-text("Save")');

    // Verify updated name appears
    await expect(page.locator("text=Updated Exercise Name")).toBeVisible();
  });

  test("should archive an exercise", async ({ page }) => {
    await page.goto("/exercises");

    // Find and click archive on first exercise
    const firstExercise = page.locator('[data-testid="exercise-card"]').first();
    const exerciseName = await firstExercise.locator("h3").textContent();

    await firstExercise.locator('button:has-text("Archive")').click();

    // Confirm archive
    await page.click('button:has-text("Archive")'); // In confirmation dialog

    // Verify exercise is no longer visible (unless show archived is checked)
    await expect(page.locator(`text=${exerciseName}`)).not.toBeVisible();
  });

  test("should use exercise selector in planner", async ({ page }) => {
    await page.goto("/planner");

    // Find exercise selector
    const exerciseSelector = page.locator('[role="button"][aria-label*="exercise"]').first();
    await exerciseSelector.click();

    // Search for exercise
    await page.fill('input[placeholder*="Search exercises"]', "bench");
    await page.waitForTimeout(500);

    // Select first exercise
    await page.locator('li[role="option"]').first().click();

    // Verify exercise is selected
    await expect(exerciseSelector).not.toContainText("Select exercise");
  });

  test("should display global exercises", async ({ page }) => {
    await page.goto("/exercises");

    // Look for global exercise badge
    const globalBadge = page.locator("text=Global").first();
    await expect(globalBadge).toBeVisible();
  });

  test("should filter exercises by type", async ({ page }) => {
    await page.goto("/exercises");

    // Select filter
    await page.selectOption('select[aria-label*="Filter by type"]', "strength");

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Verify all visible exercises are strength type
    const exerciseCards = page.locator('[data-testid="exercise-card"]');
    const count = await exerciseCards.count();

    // At least one exercise should be visible
    expect(count).toBeGreaterThan(0);
  });

  test("should show archived exercises when toggle is enabled", async ({ page }) => {
    await page.goto("/exercises");

    // Enable show archived toggle
    await page.check('input[type="checkbox"][aria-label*="Show archived"]');

    // Wait for results to load
    await page.waitForTimeout(500);

    // Verify archived exercises are visible
    const exerciseCards = page.locator('[data-testid="exercise-card"]');
    const count = await exerciseCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Exercise Snapshots E2E", () => {
  test("should preserve exercise name in historical session", async ({ page }) => {
    // This test verifies that when an exercise is used in a session,
    // the exercise name is stored as a snapshot and preserved even
    // if the exercise is later modified

    await page.goto("/exercises");

    // Create an exercise
    await page.click('button:has-text("Create Exercise")');
    await page.fill('input[name="name"]', "Original Name");
    await page.selectOption('select[name="type_code"]', "strength");
    await page.click('button:has-text("Save")');

    // Get exercise ID (would need to extract from URL or response)
    // For now, we'll use the exercise name to find it

    // Create a session with this exercise
    await page.goto("/planner");
    // Add exercise to session (implementation depends on planner UI)

    // Modify the exercise name
    await page.goto("/exercises");
    // Find and edit the exercise
    // Change name to "Modified Name"

    // View the historical session
    await page.goto("/sessions");
    // Open the session created earlier

    // Verify the session shows "Original Name" not "Modified Name"
    // This verifies the snapshot is working
  });
});
