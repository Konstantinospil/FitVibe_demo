const { test, expect } = require("@playwright/test");
const { jsonResponse, preparePage, waitForApp } = require("./helpers.cjs");

const OWNED_EXERCISE = {
  id: "ex-owned",
  name: "Bench Press",
  type_code: "strength",
  muscle_group: "chest",
  equipment: "barbell",
  tags: [],
  is_public: false,
  owner_id: "user-123",
  description_en: "Barbell bench press",
};

const GLOBAL_EXERCISE = {
  id: "ex-global",
  name: "Global Row",
  type_code: "strength",
  muscle_group: "back",
  equipment: "barbell",
  tags: [],
  is_public: true,
  owner_id: null,
  description_en: "Global exercise",
};

async function mockExerciseList(page, exercises) {
  await page.route("**/api/v1/exercises**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());

    if (method === "GET") {
      const query = (url.searchParams.get("q") ?? "").toLowerCase();
      const typeCode = url.searchParams.get("type_code") ?? "";
      const includeArchived = url.searchParams.get("include_archived") === "true";
      let data = exercises.filter((item) => !item.archived || includeArchived);
      if (query) {
        data = data.filter((item) => item.name.toLowerCase().includes(query));
      }
      if (typeCode) {
        data = data.filter((item) => item.type_code === typeCode);
      }
      await route.fulfill(jsonResponse({ data, total: data.length, limit: 100, offset: 0 }));
      return;
    }

    if (method === "POST") {
      const payload = JSON.parse(request.postData() ?? "{}");
      const created = {
        id: "ex-created",
        owner_id: "user-123",
        tags: [],
        is_public: false,
        ...payload,
      };
      exercises.push(created);
      await route.fulfill(jsonResponse(created, 201));
      return;
    }

    if (method === "PUT") {
      const payload = JSON.parse(request.postData() ?? "{}");
      const id = url.pathname.split("/").pop();
      const index = exercises.findIndex((item) => item.id === id);
      if (index >= 0) {
        exercises[index] = { ...exercises[index], ...payload };
        await route.fulfill(jsonResponse(exercises[index]));
        return;
      }
    }

    await route.fulfill(jsonResponse({ error: { code: "NOT_FOUND" } }, 404));
  });
}

test.describe("Exercise Library E2E", () => {
  test.beforeEach(async ({ page }) => {
    await preparePage(page, { authenticated: true });
  });

  test("should create a new exercise", async ({ page }) => {
    const catalog = [];
    await mockExerciseList(page, catalog);

    await page.goto("/exercises");
    await waitForApp(page);

    await page.getByRole("button", { name: /create exercise/i }).click();
    const modal = page.locator(".fixed.inset-0");
    await modal.getByRole("textbox").first().fill("Test Exercise");
    await modal.locator("select").selectOption("strength");
    await modal.getByRole("button", { name: /^save$/i }).click();

    await expect(page.getByText("Test Exercise")).toBeVisible();
  });

  test("should search for exercises", async ({ page }) => {
    await mockExerciseList(page, [OWNED_EXERCISE, GLOBAL_EXERCISE]);

    await page.goto("/exercises");
    await waitForApp(page);

    await page.getByLabel(/search exercises/i).fill("bench");
    await expect(page.getByTestId("exercise-card").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bench Press" })).toBeVisible();
  });

  test("should edit an exercise", async ({ page }) => {
    await mockExerciseList(page, [{ ...GLOBAL_EXERCISE }]);

    await page.goto("/exercises");
    await waitForApp(page);

    const firstExercise = page.getByTestId("exercise-card").first();
    await firstExercise.getByRole("button", { name: /edit/i }).click();

    const modal = page.locator(".fixed.inset-0");
    await modal.getByRole("textbox").first().fill("Updated Exercise Name");
    await modal.getByRole("button", { name: /^save$/i }).click();

    await expect(page.getByText("Updated Exercise Name")).toBeVisible();
  });

  test("should display global exercises", async ({ page }) => {
    await mockExerciseList(page, [GLOBAL_EXERCISE]);

    await page.goto("/exercises");
    await waitForApp(page);

    await expect(page.getByText("Global").first()).toBeVisible();
  });

  test("should filter exercises by type", async ({ page }) => {
    await mockExerciseList(page, [
      OWNED_EXERCISE,
      { ...GLOBAL_EXERCISE, id: "ex-cardio", name: "Easy Run", type_code: "cardio" },
    ]);

    await page.goto("/exercises");
    await waitForApp(page);

    await page.getByLabel(/filter by type/i).selectOption("strength");
    await expect(page.getByTestId("exercise-card").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bench Press" })).toBeVisible();
  });

  test("should show archived exercises when toggle is enabled", async ({ page }) => {
    await mockExerciseList(page, [
      { ...OWNED_EXERCISE, archived: true, name: "Old Press" },
      GLOBAL_EXERCISE,
    ]);

    await page.goto("/exercises");
    await waitForApp(page);

    await page.getByLabel(/show archived/i).check();
    await expect(page.getByTestId("exercise-card").first()).toBeVisible();
  });

  test("should search exercises from the planner", async ({ page }) => {
    await mockExerciseList(page, [OWNED_EXERCISE]);

    await page.goto("/planner");
    await waitForApp(page);

    await page.getByLabel("Search exercises").fill("bench");
    await expect(page.getByText("Bench Press").first()).toBeVisible();
  });
});
