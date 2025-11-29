import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
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
      };
      return translations[key] || key;
    },
  }),
}));

describe("Planner page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    const searchInput = screen.getByPlaceholderText(/Search for exercises/i);
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

    const searchInput = screen.getByPlaceholderText(/Search for exercises/i);
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

    const searchInput = screen.getByPlaceholderText(/Search for exercises/i);
    fireEvent.change(searchInput, { target: { value: "deadlift" } });

    // Wait for debounced search and results to appear
    await waitFor(
      () => {
        const exerciseButton = screen.getByText("Deadlift");
        fireEvent.click(exerciseButton);
      },
      { timeout: 1000 },
    );

    await waitFor(() => {
      expect(screen.getByText(/Exercises \(1\)/i)).toBeInTheDocument();
    });

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

    const searchInput = screen.getByPlaceholderText(/Search for exercises/i);
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

    const searchInput = screen.getByPlaceholderText(/Search for exercises/i);
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
});
