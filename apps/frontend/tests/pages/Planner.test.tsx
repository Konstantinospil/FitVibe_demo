import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Planner from "../../src/pages/Planner";
import * as api from "../../src/services/api";
import type { SessionWithExercises } from "../../src/services/api";

const mockNavigate = vi.fn();

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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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
      {
        id: "ex-1",
        name: "Bench Press",
        muscle_group: "Chest",
        equipment: "Barbell",
      },
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

    await waitFor(
      () => {
        vi.advanceTimersByTime(300);
      },
      { timeout: 1000 },
    );

    await waitFor(() => {
      expect(api.listExercises).toHaveBeenCalledWith({
        q: "bench",
        limit: 10,
        include_archived: false,
      });
    });
  });

  it("should add exercise to session", async () => {
    const mockExercises = [
      {
        id: "ex-1",
        name: "Squat",
        muscle_group: "Legs",
      },
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

    await waitFor(
      () => {
        vi.advanceTimersByTime(300);
      },
      { timeout: 1000 },
    );

    await waitFor(() => {
      const exerciseButton = screen.getByText("Squat");
      fireEvent.click(exerciseButton);
    });

    expect(screen.getByText(/Exercises \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText("1. Squat")).toBeInTheDocument();
  });

  it("should remove exercise from session", async () => {
    const mockExercises = [
      {
        id: "ex-1",
        name: "Deadlift",
        muscle_group: "Back",
      },
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

    await waitFor(
      () => {
        vi.advanceTimersByTime(300);
      },
      { timeout: 1000 },
    );

    await waitFor(() => {
      const exerciseButton = screen.getByText("Deadlift");
      fireEvent.click(exerciseButton);
    });

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
      planned_at: "2024-01-02T09:00:00.000Z",
      exercises: [],
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    };
    vi.mocked(api.createSession).mockResolvedValue(mockSession);

    const mockExercises = [
      {
        id: "ex-1",
        name: "Push Up",
        muscle_group: "Chest",
      },
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

    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(api.listExercises).toHaveBeenCalled();
    });

    await waitFor(() => {
      const exerciseButton = screen.getByText("Push Up");
      fireEvent.click(exerciseButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Exercises \(1\)/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByText("Save Session");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.createSession).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/sessions");
    });
  });

  it("should show error when saving session without exercises", async () => {
    render(
      <MemoryRouter>
        <Planner />
      </MemoryRouter>,
    );

    const saveButton = screen.getByText("Save Session");
    fireEvent.click(saveButton);

    await waitFor(
      () => {
        const errorText = screen.queryByText("Add at least one exercise to your session");
        const alert = screen.queryByRole("alert");
        expect(errorText || alert).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });

  it("should update exercise parameters", async () => {
    const mockExercises = [
      {
        id: "ex-1",
        name: "Bench Press",
        muscle_group: "Chest",
      },
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

    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(api.listExercises).toHaveBeenCalled();
    });

    await waitFor(() => {
      const exerciseButton = screen.getByText("Bench Press");
      fireEvent.click(exerciseButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Exercises \(1\)/i)).toBeInTheDocument();
    });

    const setsInput = screen.getByLabelText("Sets");
    fireEvent.change(setsInput, { target: { value: "5" } });

    expect(setsInput).toHaveValue(5);
  });
});
