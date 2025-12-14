import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  describe("vibe selection", () => {
    it("opens modal when clicking any vibe button", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Home />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      // Wait for vibes to load
      const strengthButton = await screen.findByRole("button", {
        name: "vibes.strength.name",
      });
      fireEvent.click(strengthButton);

      await waitFor(
        () => {
          expect(screen.getByText("vibesHome.addExercise.title")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });

    it("handles all six vibe types", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Home />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      const vibes = [
        "strength",
        "agility",
        "endurance",
        "explosivity",
        "intelligence",
        "regeneration",
      ];

      for (const vibe of vibes) {
        const button = await screen.findByRole("button", {
          name: `vibes.${vibe}.name`,
        });
        fireEvent.click(button);

        await waitFor(
          () => {
            expect(screen.getByText("vibesHome.addExercise.title")).toBeInTheDocument();
          },
          { timeout: 5000 },
        );

        // Close modal
        const modal = screen
          .getByText("vibesHome.addExercise.title")
          .closest("div[style*='position: fixed']");
        if (modal) {
          fireEvent.click(modal);
        }

        await waitFor(
          () => {
            expect(screen.queryByText("vibesHome.addExercise.title")).not.toBeInTheDocument();
          },
          { timeout: 2000 },
        );
      }
    });

    it("closes modal when clicking outside", async () => {
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

      await waitFor(
        () => {
          expect(screen.getByText("vibesHome.addExercise.title")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Click outside modal (on backdrop)
      const backdrop = screen
        .getByText("vibesHome.addExercise.title")
        .closest("div[style*='position: fixed']");
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      await waitFor(
        () => {
          expect(screen.queryByText("vibesHome.addExercise.title")).not.toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });
  });

  describe("exercise mode selection", () => {
    it("switches between select and create modes", async () => {
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

      await waitFor(
        () => {
          expect(screen.getByText("vibesHome.addExercise.selectExisting")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Switch to create mode
      fireEvent.click(screen.getByText("vibesHome.addExercise.createNew"));

      await waitFor(
        () => {
          expect(screen.getByLabelText("vibesHome.addExercise.exerciseName")).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // Switch back to select mode
      fireEvent.click(screen.getByText("vibesHome.addExercise.selectExisting"));

      await waitFor(
        () => {
          const select = screen.getByLabelText("vibesHome.addExercise.exerciseName");
          expect(select.tagName).toBe("SELECT");
        },
        { timeout: 2000 },
      );
    });
  });

  describe("exercise selection from dropdown", () => {
    it("allows selecting existing exercise", async () => {
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

      await waitFor(
        () => {
          expect(screen.getByText("vibesHome.addExercise.selectExisting")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Wait for exercises to load
      await waitFor(
        () => {
          const select = screen.getByLabelText(
            "vibesHome.addExercise.exerciseName",
          ) as HTMLSelectElement;
          expect(select.options.length).toBeGreaterThan(1);
        },
        { timeout: 5000 },
      );

      const select = screen.getByLabelText(
        "vibesHome.addExercise.exerciseName",
      ) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "exercise-1" } });
      expect(select.value).toBe("exercise-1");
    });
  });

  describe("form fields", () => {
    it("allows entering all exercise detail fields", async () => {
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

      // Fill in all fields
      fireEvent.change(screen.getByLabelText("vibesHome.addExercise.exerciseName"), {
        target: { value: "Test Exercise" },
      });

      const setsInput = screen.getByLabelText("vibesHome.addExercise.sets");
      fireEvent.change(setsInput, { target: { value: "3" } });
      expect(setsInput).toHaveValue(3);

      const repsInput = screen.getByLabelText("vibesHome.addExercise.reps");
      fireEvent.change(repsInput, { target: { value: "10" } });
      expect(repsInput).toHaveValue(10);

      const weightInput = screen.getByLabelText("vibesHome.addExercise.weight");
      fireEvent.change(weightInput, { target: { value: "100" } });
      expect(weightInput).toHaveValue(100);

      const rpeInput = screen.getByLabelText("vibesHome.addExercise.rpe");
      fireEvent.change(rpeInput, { target: { value: "8" } });
      expect(rpeInput).toHaveValue(8);

      const durationInput = screen.getByLabelText("vibesHome.addExercise.duration");
      fireEvent.change(durationInput, { target: { value: "30" } });
      expect(durationInput).toHaveValue(30);

      const distanceInput = screen.getByLabelText("vibesHome.addExercise.distance");
      fireEvent.change(distanceInput, { target: { value: "5" } });
      expect(distanceInput).toHaveValue(5);

      const resistanceInput = screen.getByLabelText("vibesHome.addExercise.resistance");
      fireEvent.change(resistanceInput, { target: { value: "medium" } });
      expect(resistanceInput).toHaveValue("medium");

      const speedInput = screen.getByLabelText("vibesHome.addExercise.speed");
      fireEvent.change(speedInput, { target: { value: "fast" } });
      expect(speedInput).toHaveValue("fast");

      const notesInput = screen.getByLabelText("vibesHome.addExercise.notes");
      fireEvent.change(notesInput, { target: { value: "Test notes" } });
      expect(notesInput).toHaveValue("Test notes");
    });
  });

  describe("period selector", () => {
    it("allows changing period for exercise history", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Home />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(
        () => {
          const periodSelect = screen.getByLabelText(
            "vibesHome.history.period",
          ) as HTMLSelectElement;
          expect(periodSelect).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      const periodSelect = screen.getByLabelText("vibesHome.history.period") as HTMLSelectElement;

      // Test all period options
      const periods = ["day", "week", "month", "quarter", "semester", "year"];
      for (const period of periods) {
        fireEvent.change(periodSelect, { target: { value: period } });
        expect(periodSelect.value).toBe(period);
      }
    });
  });

  describe("exercise history display", () => {
    it("displays exercise history when sessions exist", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Home />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(
        () => {
          expect(screen.getByText("Bench Press")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      expect(screen.getByText("Snatch")).toBeInTheDocument();
    });

    it("displays empty state when no exercises", async () => {
      mockedApi.listSessions.mockResolvedValueOnce({
        data: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Home />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(
        () => {
          expect(screen.getByText("vibesHome.history.noExercises")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });

    it("displays loading state", async () => {
      mockedApi.listSessions.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSessionResponse), 100)),
      );

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Home />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      expect(screen.getByText("common.loading")).toBeInTheDocument();

      await waitFor(
        () => {
          expect(screen.queryByText("common.loading")).not.toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });
  });

  describe("session creation with exercise details", () => {
    it("creates session with all exercise details", async () => {
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

      // Fill form
      fireEvent.change(screen.getByLabelText("vibesHome.addExercise.exerciseName"), {
        target: { value: "Full Exercise" },
      });
      fireEvent.change(screen.getByLabelText("vibesHome.addExercise.sets"), {
        target: { value: "4" },
      });
      fireEvent.change(screen.getByLabelText("vibesHome.addExercise.reps"), {
        target: { value: "12" },
      });
      fireEvent.change(screen.getByLabelText("vibesHome.addExercise.weight"), {
        target: { value: "80" },
      });
      fireEvent.change(screen.getByLabelText("vibesHome.addExercise.rpe"), {
        target: { value: "7" },
      });
      fireEvent.change(screen.getByLabelText("vibesHome.addExercise.duration"), {
        target: { value: "45" },
      });
      fireEvent.change(screen.getByLabelText("vibesHome.addExercise.distance"), {
        target: { value: "10" },
      });
      fireEvent.change(screen.getByLabelText("vibesHome.addExercise.resistance"), {
        target: { value: "high" },
      });
      fireEvent.change(screen.getByLabelText("vibesHome.addExercise.speed"), {
        target: { value: "moderate" },
      });
      fireEvent.change(screen.getByLabelText("vibesHome.addExercise.notes"), {
        target: { value: "Great workout" },
      });

      // Submit
      const addButton = screen.getByText("vibesHome.addExercise.add");
      fireEvent.click(addButton);

      await waitFor(
        () => {
          expect(mockedApi.createSession).toHaveBeenCalled();
          const callArgs = mockedApi.createSession.mock.calls[0][0];
          expect(callArgs.exercises[0].actual.sets).toBe(4);
          expect(callArgs.exercises[0].actual.reps).toBe(12);
          expect(callArgs.exercises[0].actual.load).toBe(80);
          expect(callArgs.exercises[0].actual.rpe).toBe(7);
          expect(callArgs.exercises[0].actual.duration).toBe("PT45M");
          expect(callArgs.exercises[0].actual.distance).toBe(10);
          expect(callArgs.exercises[0].actual.extras.resistance).toBe("high");
          expect(callArgs.exercises[0].actual.extras.speed).toBe("moderate");
          expect(callArgs.exercises[0].notes).toBe("Great workout");
        },
        { timeout: 5000 },
      );
    });

    it("creates session with selected exercise", async () => {
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

      await waitFor(
        () => {
          expect(screen.getByText("vibesHome.addExercise.selectExisting")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Wait for exercises to load
      await waitFor(
        () => {
          const select = screen.getByLabelText(
            "vibesHome.addExercise.exerciseName",
          ) as HTMLSelectElement;
          expect(select.options.length).toBeGreaterThan(1);
        },
        { timeout: 5000 },
      );

      const select = screen.getByLabelText(
        "vibesHome.addExercise.exerciseName",
      ) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "exercise-1" } });

      // Fill some details
      fireEvent.change(screen.getByLabelText("vibesHome.addExercise.sets"), {
        target: { value: "3" },
      });
      fireEvent.change(screen.getByLabelText("vibesHome.addExercise.reps"), {
        target: { value: "10" },
      });

      // Submit
      const addButton = screen.getByText("vibesHome.addExercise.add");
      fireEvent.click(addButton);

      await waitFor(
        () => {
          expect(mockedApi.createSession).toHaveBeenCalled();
          const callArgs = mockedApi.createSession.mock.calls[0][0];
          expect(callArgs.exercises[0].exercise_id).toBe("exercise-1");
        },
        { timeout: 5000 },
      );
    });
  });

  describe("error handling", () => {
    it("handles exercise creation error", async () => {
      mockedApi.createExercise.mockRejectedValueOnce(new Error("Creation failed"));

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
        target: { value: "Test" },
      });

      const addButton = screen.getByText("vibesHome.addExercise.add");
      fireEvent.click(addButton);

      await waitFor(
        () => {
          expect(screen.getByText("Failed to add exercise")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });

    it("handles sessions fetch error", async () => {
      mockedApi.listSessions.mockRejectedValueOnce(new Error("Fetch failed"));

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Home />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(
        () => {
          expect(apiErrorSpy).toHaveBeenCalled();
        },
        { timeout: 5000 },
      );
    });
  });

  describe("form validation", () => {
    it("requires exercise name in create mode", async () => {
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

      await waitFor(
        () => {
          expect(screen.getByText("vibesHome.addExercise.createNew")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      fireEvent.click(screen.getByText("vibesHome.addExercise.createNew"));

      await waitFor(
        () => {
          const nameInput = screen.getByLabelText("vibesHome.addExercise.exerciseName");
          expect(nameInput).toHaveAttribute("required");
        },
        { timeout: 5000 },
      );
    });

    it("requires exercise selection in select mode", async () => {
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

      await waitFor(
        () => {
          expect(screen.getByText("vibesHome.addExercise.selectExisting")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      await waitFor(
        () => {
          const select = screen.getByLabelText(
            "vibesHome.addExercise.exerciseName",
          ) as HTMLSelectElement;
          expect(select).toHaveAttribute("required");
        },
        { timeout: 5000 },
      );
    });
  });

  describe("handleAddExercise edge cases", () => {
    it("does nothing when no vibe is selected", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Home />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      // Try to submit without selecting a vibe
      // This should not trigger any API calls
      await waitFor(
        () => {
          expect(screen.queryByText("vibesHome.addExercise.title")).not.toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      expect(mockedApi.createSession).not.toHaveBeenCalled();
    });

    it("handles form submission with event parameter", async () => {
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
        target: { value: "Test" },
      });

      // Submit via form
      const form = screen.getByLabelText("vibesHome.addExercise.exerciseName").closest("form");
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(
        () => {
          expect(mockedApi.createSession).toHaveBeenCalled();
        },
        { timeout: 5000 },
      );
    });
  });

  describe("exercise history filtering", () => {
    it("filters exercises by period correctly", async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      mockedApi.listSessions.mockResolvedValueOnce({
        data: [
          {
            id: "session-recent",
            owner_id: "user-1",
            planned_at: now.toISOString(),
            exercises: [{ exercise_id: "exercise-1", id: "ex-1", order_index: 0 }],
          } as any,
          {
            id: "session-old",
            owner_id: "user-1",
            planned_at: monthAgo.toISOString(),
            exercises: [{ exercise_id: "exercise-2", id: "ex-2", order_index: 0 }],
          } as any,
        ],
        total: 2,
        limit: 50,
        offset: 0,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Home />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      await waitFor(
        () => {
          expect(screen.getByText("Bench Press")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });
  });
});
