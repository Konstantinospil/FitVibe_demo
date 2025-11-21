import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Home from "../../src/pages/Home";
import * as api from "../../src/services/api";
import { useAuthStore } from "../../src/store/auth.store";

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
    apiError: apiErrorSpy,
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

const mockExerciseResponse = {
  data: [
    { id: "exercise-1", name: "Bench Press", type_code: "strength" },
    { id: "exercise-2", name: "Snatch", type_code: "explosivity" },
  ],
  total: 2,
  limit: 10,
  offset: 0,
};

const mockSessionResponse = {
  data: [
    {
      id: "session-1",
      planned_at: "2024-01-01T10:00:00.000Z",
      exercises: [
        { id: "session-ex-1", exercise_id: "exercise-1" },
        { id: "session-ex-2", exercise_id: "exercise-2" },
      ],
    },
  ],
  total: 1,
  limit: 50,
  offset: 0,
};

describe("Home page", () => {
  const originalState = useAuthStore.getState();

  beforeEach(() => {
    useAuthStore.setState({
      ...originalState,
      ...authenticatedState,
    });

    mockNavigate.mockClear();
    mockedApi.listExercises.mockResolvedValue(mockExerciseResponse as any);
    mockedApi.listSessions.mockResolvedValue(mockSessionResponse as any);
    mockedApi.createExercise.mockResolvedValue({ id: "created-ex", name: "Custom" } as any);
    mockedApi.createSession.mockResolvedValue({
      id: "session-created",
      planned_at: "2024-01-01T12:00:00.000Z",
      exercises: [{ id: "session-ex-new", exercise_id: "created-ex" }],
    } as any);
    apiErrorSpy.mockClear();
  });

  afterEach(() => {
    useAuthStore.setState(originalState);
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to the login screen", () => {
    useAuthStore.setState({ ...originalState, isAuthenticated: false });

    render(<Home />);

    expect(mockNavigate).toHaveBeenCalledWith("/login", {
      replace: true,
      state: { from: { pathname: "/" } },
    });
    expect(screen.queryByText("vibesHome.title")).not.toBeInTheDocument();
  });

  it("allows creating a custom exercise session", async () => {
    render(<Home />);

    const strengthButton = await screen.findByRole("button", {
      name: "vibes.strength.name",
    });
    fireEvent.click(strengthButton);

    fireEvent.click(screen.getByText("vibesHome.addExercise.createNew"));

    fireEvent.change(screen.getByLabelText("vibesHome.addExercise.exerciseName"), {
      target: { value: "Tempo Push Press" },
    });

    fireEvent.click(screen.getByText("vibesHome.addExercise.add"));

    await waitFor(() => {
      expect(mockedApi.createExercise).toHaveBeenCalledWith({
        name: "Tempo Push Press",
        type_code: "strength",
        is_public: false,
      });
    });

    expect(mockedApi.createSession).toHaveBeenCalled();
  });

  it("shows an error message when session creation fails", async () => {
    mockedApi.createSession.mockRejectedValueOnce(new Error("network"));

    render(<Home />);

    const vibeButton = await screen.findByRole("button", { name: "vibes.strength.name" });
    fireEvent.click(vibeButton);
    fireEvent.click(screen.getByText("vibesHome.addExercise.createNew"));

    fireEvent.change(screen.getByLabelText("vibesHome.addExercise.exerciseName"), {
      target: { value: "French Press" },
    });

    fireEvent.click(screen.getByText("vibesHome.addExercise.add"));

    await waitFor(() => {
      expect(screen.getByText("Failed to add exercise")).toBeInTheDocument();
    });
    expect(apiErrorSpy).toHaveBeenCalled();
  });
});
