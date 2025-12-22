import React from "react";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "../../src/pages/Home";
import * as api from "../../src/services/api";
import { useAuthStore } from "../../src/store/auth.store";
import type {
  ExercisesListResponse,
  SessionsListResponse,
  Exercise,
  SessionWithExercises,
} from "../../src/services/api";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../../src/utils/idleScheduler", () => ({
  scheduleIdleTask: (cb: () => void) => {
    cb();
    return { cancel: vi.fn() };
  },
}));

const apiErrorSpy = vi.fn();

vi.mock("../../src/utils/logger", () => ({
  logger: {
    get apiError() {
      return apiErrorSpy;
    },
  },
}));

vi.mock("../../src/services/api", async () => {
  const actual = await vi.importActual("../../src/services/api");
  return {
    ...actual,
    listExercises: vi.fn(),
    listSessions: vi.fn(),
    createExercise: vi.fn(),
    createSession: vi.fn(),
  };
});

const mockedApi = {
  listExercises: vi.mocked(api.listExercises),
  listSessions: vi.mocked(api.listSessions),
  createExercise: vi.mocked(api.createExercise),
  createSession: vi.mocked(api.createSession),
};

const authenticatedState = {
  isAuthenticated: true,
  user: { id: "user-1", username: "demo", email: "demo@test.dev" },
};

const mockExerciseResponse: ExercisesListResponse = {
  data: [
    {
      id: "exercise-1",
      name: "Bench Press",
      type_code: "strength",
      owner_id: null,
      muscle_group: null,
      equipment: null,
      tags: [],
      is_public: false,
      description_en: null,
      description_de: null,
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      archived_at: null,
    },
    {
      id: "exercise-2",
      name: "Snatch",
      type_code: "explosivity",
      owner_id: null,
      muscle_group: null,
      equipment: null,
      tags: [],
      is_public: false,
      description_en: null,
      description_de: null,
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      archived_at: null,
    },
  ],
  total: 2,
  limit: 10,
  offset: 0,
};

const mockSessionResponse: SessionsListResponse = {
  data: [
    {
      id: "session-1",
      owner_id: "user-1",
      plan_id: null,
      title: null,
      planned_at: "2024-01-01T10:00:00.000Z",
      status: "planned" as const,
      visibility: "private" as const,
      notes: null,
      recurrence_rule: null,
      started_at: null,
      completed_at: null,
      calories: null,
      points: null,
      deleted_at: null,
      exercises: [
        {
          id: "session-ex-1",
          session_id: "session-1",
          exercise_id: "exercise-1",
          order_index: 0,
          notes: null,
          planned: null,
          actual: null,
          sets: [],
        },
        {
          id: "session-ex-2",
          session_id: "session-1",
          exercise_id: "exercise-2",
          order_index: 1,
          notes: null,
          planned: null,
          actual: null,
          sets: [],
        },
      ],
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    },
  ],
  total: 1,
  limit: 50,
  offset: 0,
};

// Create a test query client
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
};

describe("Home page", () => {
  const originalState = useAuthStore.getState();
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    useAuthStore.setState({
      ...originalState,
      ...authenticatedState,
    });

    mockNavigate.mockClear();
    mockedApi.listExercises.mockResolvedValue(mockExerciseResponse);
    mockedApi.listSessions.mockResolvedValue(mockSessionResponse);
    mockedApi.createExercise.mockResolvedValue({
      id: "created-ex",
      name: "Custom",
      type_code: "strength",
      owner_id: null,
      muscle_group: null,
      equipment: null,
      tags: [],
      is_public: false,
      description_en: null,
      description_de: null,
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      archived_at: null,
    } satisfies Exercise);
    mockedApi.createSession.mockResolvedValue({
      id: "session-created",
      owner_id: "user-1",
      plan_id: null,
      title: null,
      planned_at: "2024-01-01T12:00:00.000Z",
      status: "planned" as const,
      visibility: "private" as const,
      notes: null,
      recurrence_rule: null,
      started_at: null,
      completed_at: null,
      calories: null,
      points: null,
      deleted_at: null,
      exercises: [
        {
          id: "session-ex-new",
          session_id: "session-created",
          exercise_id: "created-ex",
          order_index: 0,
          notes: null,
          planned: null,
          actual: null,
          sets: [],
        },
      ],
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    } satisfies SessionWithExercises);
    apiErrorSpy.mockClear();
  });

  afterEach(() => {
    cleanup();
    useAuthStore.setState(originalState);
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("redirects unauthenticated users to the login screen", () => {
    useAuthStore.setState({ ...originalState, isAuthenticated: false });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(mockNavigate).toHaveBeenCalledWith("/login", {
      replace: true,
      state: { from: { pathname: "/" } },
    });
    expect(screen.queryByText("vibesHome.title")).not.toBeInTheDocument();
  });

  it("allows creating a custom exercise session", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const strengthButton = await screen.findByRole("button", {
      name: "vibes.strength.name",
    });
    fireEvent.click(strengthButton);

    // Wait for modal to appear
    await waitFor(
      () => {
        expect(screen.getByText("vibesHome.addExercise.createNew")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    fireEvent.click(screen.getByText("vibesHome.addExercise.createNew"));

    await waitFor(
      () => {
        expect(screen.getByLabelText("vibesHome.addExercise.exerciseName")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    fireEvent.change(screen.getByLabelText("vibesHome.addExercise.exerciseName"), {
      target: { value: "Tempo Push Press" },
    });

    await waitFor(
      () => {
        expect(screen.getByText("vibesHome.addExercise.add")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    fireEvent.click(screen.getByText("vibesHome.addExercise.add"));

    await waitFor(
      () => {
        expect(mockedApi.createExercise).toHaveBeenCalled();
        const callArgs = mockedApi.createExercise.mock.calls[0];
        expect(callArgs[0]).toEqual({
          name: "Tempo Push Press",
          type_code: "strength",
          is_public: false,
        });
      },
      { timeout: 5000 },
    );

    expect(mockedApi.createSession).toHaveBeenCalled();
  });

  it("shows an error message when session creation fails", async () => {
    mockedApi.createSession.mockRejectedValueOnce(new Error("network"));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const vibeButton = await screen.findByRole("button", { name: "vibes.strength.name" });
    fireEvent.click(vibeButton);

    // Wait for modal to appear
    await waitFor(
      () => {
        expect(screen.getByText("vibesHome.addExercise.createNew")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    fireEvent.click(screen.getByText("vibesHome.addExercise.createNew"));

    await waitFor(
      () => {
        expect(screen.getByLabelText("vibesHome.addExercise.exerciseName")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    fireEvent.change(screen.getByLabelText("vibesHome.addExercise.exerciseName"), {
      target: { value: "French Press" },
    });

    await waitFor(
      () => {
        expect(screen.getByText("vibesHome.addExercise.add")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    fireEvent.click(screen.getByText("vibesHome.addExercise.add"));

    await waitFor(
      () => {
        expect(screen.getByText("Failed to add exercise")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
    expect(apiErrorSpy).toHaveBeenCalled();
  });
});
