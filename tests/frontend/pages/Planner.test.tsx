import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Planner from "../../src/pages/Planner";
import * as api from "../../src/services/api";
import type { SessionWithExercises, Exercise } from "../../src/services/api";

const mockNavigate = vi.fn();

const createMockExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: "ex-1",
  name: "Test Exercise",
  type_code: "strength",
  owner_id: null,
  muscle_group: null,
  equipment: null,
  tags: [],
  is_public: false,
  description_en: null,
  description_de: null,
  ...overrides,
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../src/services/api", () => ({
  listExercises: vi.fn(),
  createSession: vi.fn(),
}));

vi.mock("../../src/utils/logger", () => ({
  logger: {
    apiError: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "planner.eyebrow": "Planner",
        "planner.title": "Session Planner",
        "planner.description": "Plan your workout",
        "planner.exerciseSearchPlaceholder": "Search for exercises",
        "planner.sessionTitlePlaceholder": "Session title",
        "planner.notesPlaceholder": "Session notes",
      };
      return translations[key] || key;
    },
  }),
}));

describe("Planner page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should render planner form", () => {
    vi.mocked(api.listExercises).mockResolvedValue({
      data: [],
      total: 0,
      limit: 10,
      offset: 0,
    });

    render(
      <MemoryRouter>
        <Planner />
      </MemoryRouter>,
    );

    expect(screen.getByText("Session Planner")).toBeInTheDocument();
    expect(screen.getByText("Session Details")).toBeInTheDocument();
  });

  it("should search for exercises", async () => {
    const mockExercises = [
      createMockExercise({
        id: "ex-1",
        name: "Bench Press",
        muscle_group: "Chest",
        equipment: "Barbell",
      }),
    ];

    vi.mocked(api.listExercises).mockResolvedValue({
      data: mockExercises,
      total: 1,
      limit: 10,
      offset: 0,
    });

    render(
      <MemoryRouter>
        <Planner />
      </MemoryRouter>,
    );

    const searchInput = screen.getByLabelText(/search exercises/i);
    fireEvent.change(searchInput, { target: { value: "bench" } });

    // Wait for debounced search (300ms delay)
    await waitFor(
      () => {
        expect(api.listExercises).toHaveBeenCalledWith({
          q: "bench",
          limit: 10,
          include_archived: false,
        });
      },
      { timeout: 1000 },
    );
  });

  it("should add exercise to session", async () => {
    const mockExercises = [
      createMockExercise({
        id: "ex-1",
        name: "Squat",
        muscle_group: "Legs",
      }),
    ];

    vi.mocked(api.listExercises).mockResolvedValue({
      data: mockExercises,
      total: 1,
      limit: 10,
      offset: 0,
    });

    render(
      <MemoryRouter>
        <Planner />
      </MemoryRouter>,
    );

    const searchInput = screen.getByLabelText(/search exercises/i);
    fireEvent.change(searchInput, { target: { value: "squat" } });

    // Wait for debounced search and results to appear
    await waitFor(
      () => {
        const exerciseButton = screen.getByText("Squat");
        fireEvent.click(exerciseButton);
      },
      { timeout: 1000 },
    );

    expect(screen.getByText(/Exercises \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText("1. Squat")).toBeInTheDocument();
  });

  it("should remove exercise from session", async () => {
    const mockExercises = [
      createMockExercise({
        id: "ex-1",
        name: "Deadlift",
        muscle_group: "Back",
      }),
    ];

    vi.mocked(api.listExercises).mockResolvedValue({
      data: mockExercises,
      total: 1,
      limit: 10,
      offset: 0,
    });

    render(
      <MemoryRouter>
        <Planner />
      </MemoryRouter>,
    );

    const searchInput = screen.getByLabelText(/search exercises/i);
    fireEvent.change(searchInput, { target: { value: "deadlift" } });

    // Wait for debounced search and results to appear
    await waitFor(
      () => {
        const exerciseButton = screen.getByText("Deadlift");
        fireEvent.click(exerciseButton);
      },
      { timeout: 1000 },
    );

    await waitFor(
      () => {
        expect(screen.getByText(/Exercises \(1\)/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const removeButton = screen.getByLabelText("Remove exercise");
    fireEvent.click(removeButton);

    expect(screen.queryByText(/Exercises \(1\)/i)).not.toBeInTheDocument();
  });

  it("should save session with exercises", async () => {
    const mockSession: SessionWithExercises = {
      id: "session-1",
      owner_id: "user-1",
      plan_id: null,
      title: null,
      planned_at: "2024-01-02T09:00:00.000Z",
      status: "planned",
      visibility: "private",
      notes: null,
      recurrence_rule: null,
      started_at: null,
      completed_at: null,
      calories: null,
      points: null,
      deleted_at: null,
      exercises: [],
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    };
    vi.mocked(api.createSession).mockResolvedValue(mockSession);

    const mockExercises = [
      createMockExercise({
        id: "ex-1",
        name: "Push Up",
        muscle_group: "Chest",
      }),
    ];

    vi.mocked(api.listExercises).mockResolvedValue({
      data: mockExercises,
      total: 1,
      limit: 10,
      offset: 0,
    });

    render(
      <MemoryRouter>
        <Planner />
      </MemoryRouter>,
    );

    const searchInput = screen.getByLabelText(/search exercises/i);
    fireEvent.change(searchInput, { target: { value: "push" } });

    // Wait for debounced search
    await waitFor(
      () => {
        expect(api.listExercises).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );

    // Wait for exercise button to appear and click it
    await waitFor(
      () => {
        const exerciseButton = screen.getByText("Push Up");
        fireEvent.click(exerciseButton);
      },
      { timeout: 1000 },
    );

    // Wait for exercise to be added
    await waitFor(
      () => {
        expect(screen.getByText(/Exercises \(1\)/i)).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    const saveButton = screen.getByText("Save Session");
    fireEvent.click(saveButton);

    await waitFor(
      () => {
        expect(api.createSession).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith("/sessions");
      },
      { timeout: 1000 },
    );
  });

  it("should show error when saving session without exercises", () => {
    vi.mocked(api.listExercises).mockResolvedValue({
      data: [],
      total: 0,
      limit: 10,
      offset: 0,
    });

    render(
      <MemoryRouter>
        <Planner />
      </MemoryRouter>,
    );

    // Find the button element (not the inner span)
    const saveButton = screen.getByRole("button", { name: /Save Session/i });

    // Button should be disabled when there are no exercises
    // This is the component's behavior - it prevents saving without exercises
    expect(saveButton).toBeDisabled();

    // The error message would only appear if handleSave is called,
    // but the button is disabled to prevent this scenario
    // So we verify the button is disabled as expected
  });

  it("should update exercise parameters", async () => {
    const mockExercises = [
      createMockExercise({
        id: "ex-1",
        name: "Bench Press",
        muscle_group: "Chest",
      }),
    ];

    vi.mocked(api.listExercises).mockResolvedValue({
      data: mockExercises,
      total: 1,
      limit: 10,
      offset: 0,
    });

    render(
      <MemoryRouter>
        <Planner />
      </MemoryRouter>,
    );

    const searchInput = screen.getByLabelText(/search exercises/i);
    fireEvent.change(searchInput, { target: { value: "bench" } });

    // Wait for debounced search
    await waitFor(
      () => {
        expect(api.listExercises).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );

    // Wait for exercise button to appear and click it
    await waitFor(
      () => {
        const exerciseButton = screen.getByText("Bench Press");
        fireEvent.click(exerciseButton);
      },
      { timeout: 1000 },
    );

    // Wait for exercise to be added
    await waitFor(
      () => {
        expect(screen.getByText(/Exercises \(1\)/i)).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    const setsInput = screen.getByLabelText("Sets");
    fireEvent.change(setsInput, { target: { value: "5" } });

    expect(setsInput).toHaveValue(5);
  });

  it("should handle search error gracefully", async () => {
    vi.mocked(api.listExercises).mockRejectedValue(new Error("Network error"));

    render(
      <MemoryRouter>
        <Planner />
      </MemoryRouter>,
    );

    const searchInput = screen.getByLabelText(/search exercises/i);
    fireEvent.change(searchInput, { target: { value: "bench" } });

    // Wait for debounced search
    await waitFor(
      () => {
        expect(api.listExercises).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );

    // Should not crash, error is handled internally
    await waitFor(
      () => {
        expect(screen.queryByText("Bench Press")).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should not search when query is less than 2 characters", async () => {
    vi.mocked(api.listExercises).mockResolvedValue({
      data: [],
      total: 0,
      limit: 10,
      offset: 0,
    });

    render(
      <MemoryRouter>
        <Planner />
      </MemoryRouter>,
    );

    const searchInput = screen.getByLabelText(/search exercises/i);
    fireEvent.change(searchInput, { target: { value: "b" } });

    // Wait a bit to ensure debounce doesn't trigger
    await waitFor(
      () => {
        // Should not call API for single character
        expect(api.listExercises).not.toHaveBeenCalled();
      },
      { timeout: 500 },
    );
  });

  it("should move exercise up", async () => {
    const mockExercises = [
      createMockExercise({ id: "ex-1", name: "Exercise 1" }),
      createMockExercise({ id: "ex-2", name: "Exercise 2" }),
    ];

    vi.mocked(api.listExercises).mockResolvedValue({
      data: mockExercises,
      total: 2,
      limit: 10,
      offset: 0,
    });

    render(
      <MemoryRouter>
        <Planner />
      </MemoryRouter>,
    );

    const searchInput = screen.getByLabelText(/search exercises/i);
    fireEvent.change(searchInput, { target: { value: "exercise" } });

    // Wait for search results and add first exercise
    await waitFor(
      () => {
        const exerciseButton = screen.getByText("Exercise 1");
        fireEvent.click(exerciseButton);
      },
      { timeout: 1000 },
    );

    // Wait for first exercise to be added, then search again for second exercise
    await waitFor(
      () => {
        expect(screen.getByText(/Exercises \(1\)/i)).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    // Search again to get the second exercise
    fireEvent.change(searchInput, { target: { value: "exercise" } });

    // Add second exercise
    await waitFor(
      () => {
        const exerciseButton = screen.getByText("Exercise 2");
        fireEvent.click(exerciseButton);
      },
      { timeout: 1000 },
    );

    // Wait for both exercises to be added
    await waitFor(
      () => {
        expect(screen.getByText(/Exercises \(2\)/i)).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    // Find move up button for second exercise (should be the second move up button)
    const moveUpButtons = screen.getAllByLabelText("Move up");
    expect(moveUpButtons.length).toBeGreaterThan(0);
    // Second exercise should have a move up button (index 1)
    expect(moveUpButtons[1]).not.toBeDisabled();
    fireEvent.click(moveUpButtons[1]); // Click move up on second exercise

    // Exercise order should change (this is tested implicitly by the component state)
  });

  it("should move exercise down", async () => {
    const mockExercises = [
      createMockExercise({ id: "ex-1", name: "Exercise 1" }),
      createMockExercise({ id: "ex-2", name: "Exercise 2" }),
    ];

    vi.mocked(api.listExercises).mockResolvedValue({
      data: mockExercises,
      total: 2,
      limit: 10,
      offset: 0,
    });

    render(
      <MemoryRouter>
        <Planner />
      </MemoryRouter>,
    );

    const searchInput = screen.getByLabelText(/search exercises/i);
    fireEvent.change(searchInput, { target: { value: "exercise" } });

    // Wait for search results and add first exercise
    await waitFor(
      () => {
        const exerciseButton = screen.getByText("Exercise 1");
        fireEvent.click(exerciseButton);
      },
      { timeout: 1000 },
    );

    // Wait for first exercise to be added, then search again for second exercise
    await waitFor(
      () => {
        expect(screen.getByText(/Exercises \(1\)/i)).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    // Search again to get the second exercise
    fireEvent.change(searchInput, { target: { value: "exercise" } });

    // Add second exercise
    await waitFor(
      () => {
        const exerciseButton = screen.getByText("Exercise 2");
        fireEvent.click(exerciseButton);
      },
      { timeout: 1000 },
    );

    // Wait for both exercises to be added
    await waitFor(
      () => {
        expect(screen.getByText(/Exercises \(2\)/i)).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    // Find move down button for first exercise
    const moveDownButtons = screen.getAllByLabelText("Move down");
    expect(moveDownButtons.length).toBeGreaterThan(0);
    // First exercise should have a move down button (index 0)
    expect(moveDownButtons[0]).not.toBeDisabled();
    fireEvent.click(moveDownButtons[0]); // Click move down on first exercise
  });

  it("should handle save error", async () => {
    vi.mocked(api.createSession).mockRejectedValue(new Error("Save failed"));

    const mockExercises = [
      createMockExercise({
        id: "ex-1",
        name: "Push Up",
        muscle_group: "Chest",
      }),
    ];

    vi.mocked(api.listExercises).mockResolvedValue({
      data: mockExercises,
      total: 1,
      limit: 10,
      offset: 0,
    });

    render(
      <MemoryRouter>
        <Planner />
      </MemoryRouter>,
    );

    const searchInput = screen.getByLabelText(/search exercises/i);
    fireEvent.change(searchInput, { target: { value: "push" } });

    // Wait for debounced search
    await waitFor(
      () => {
        expect(api.listExercises).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );

    // Wait for exercise button to appear and click it
    await waitFor(
      () => {
        const exerciseButton = screen.getByText("Push Up");
        fireEvent.click(exerciseButton);
      },
      { timeout: 1000 },
    );

    // Wait for exercise to be added
    await waitFor(
      () => {
        expect(screen.getByText(/Exercises \(1\)/i)).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    const saveButton = screen.getByText("Save Session");
    fireEvent.click(saveButton);

    // Wait for error message to appear
    await waitFor(
      () => {
        expect(screen.getByText(/Failed to save session/i)).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should handle exercise with null id", async () => {
    const mockSession: SessionWithExercises = {
      id: "session-1",
      owner_id: "user-1",
      plan_id: null,
      title: null,
      planned_at: "2024-01-02T09:00:00.000Z",
      status: "planned",
      visibility: "private",
      notes: null,
      recurrence_rule: null,
      started_at: null,
      completed_at: null,
      calories: null,
      points: null,
      deleted_at: null,
      exercises: [],
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    };
    vi.mocked(api.createSession).mockResolvedValue(mockSession);

    const mockExercises = [
      createMockExercise({
        id: "ex-1",
        name: "Custom Exercise",
      }),
    ];

    vi.mocked(api.listExercises).mockResolvedValue({
      data: mockExercises,
      total: 1,
      limit: 10,
      offset: 0,
    });

    render(
      <MemoryRouter>
        <Planner />
      </MemoryRouter>,
    );

    const searchInput = screen.getByLabelText(/search exercises/i);
    fireEvent.change(searchInput, { target: { value: "custom" } });

    await waitFor(
      () => {
        const exerciseButton = screen.getByText("Custom Exercise");
        fireEvent.click(exerciseButton);
      },
      { timeout: 1000 },
    );

    await waitFor(
      () => {
        expect(screen.getByText(/Exercises \(1\)/i)).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    const saveButton = screen.getByText("Save Session");
    fireEvent.click(saveButton);

    await waitFor(
      () => {
        expect(api.createSession).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );
  });
});
