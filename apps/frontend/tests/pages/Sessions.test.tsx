import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Sessions from "../../src/pages/Sessions";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as api from "../../src/services/api";
import type { SessionWithExercises } from "../../src/services/api";
import { ToastProvider } from "../../src/contexts/ToastContext";

// Mock API
vi.mock("../../src/services/api", async () => {
  const actual = await vi.importActual("../../src/services/api");
  return {
    ...actual,
    listSessions: vi.fn(),
    deleteSession: vi.fn(),
  };
});

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Initialize i18n for tests
const testI18n = i18n.createInstance();
void testI18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        "sessions.eyebrow": "Workouts",
        "sessions.title": "My Sessions",
        "sessions.description": "Manage your workout sessions",
        "sessions.plannerTab": "Planner",
        "sessions.loggerTab": "Logger",
        "common.loading": "Loading...",
      },
    },
  },
});

const renderWithProviders = () => {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <I18nextProvider i18n={testI18n}>
          <Sessions />
        </I18nextProvider>
      </MemoryRouter>
    </ToastProvider>,
  );
};

const mockSession = {
  id: "session-1",
  owner_id: "user-1",
  title: "Morning Workout",
  planned_at: "2024-01-15T10:00:00Z",
  status: "planned" as const,
  visibility: "private" as const,
  notes: "Chest and triceps",
  exercises: [
    { exercise_id: "bench-press", sets: [] },
    { exercise_id: "tricep-dips", sets: [] },
  ],
};

describe("Sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    vi.mocked(api.listSessions).mockResolvedValue({ data: [], total: 0, limit: 50, offset: 0 });
  });

  it("renders sessions page with tabs", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("My Sessions")).toBeInTheDocument();
    });

    expect(screen.getByRole("tab", { name: /planner/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /logger/i })).toBeInTheDocument();
  });

  it("loads planned sessions on mount", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(api.listSessions).toHaveBeenCalledWith({
        status: "planned",
        limit: 50,
      });
    });
  });

  it("loads active sessions on mount", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(api.listSessions).toHaveBeenCalledWith({
        status: "in_progress",
        limit: 20,
      });
    });
  });

  it("shows loading state while fetching planned sessions", () => {
    renderWithProviders();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("displays empty state when no planned sessions", async () => {
    vi.mocked(api.listSessions).mockResolvedValue({ data: [], total: 0, limit: 50, offset: 0 });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("No planned sessions")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Create your first workout session to get started"),
    ).toBeInTheDocument();
  });

  it("displays planned sessions list", async () => {
    vi.mocked(api.listSessions).mockImplementation((params) => {
      if (params?.status === "planned") {
        return Promise.resolve({
          data: [mockSession as SessionWithExercises],
          total: 1,
          limit: 50,
          offset: 0,
        });
      }
      return Promise.resolve({ data: [], total: 0, limit: 50, offset: 0 });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Morning Workout")).toBeInTheDocument();
    });

    expect(screen.getByText("Chest and triceps")).toBeInTheDocument();
    expect(screen.getByText("2 exercises")).toBeInTheDocument();
  });

  it("switches to logger tab when clicked", async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /planner/i })).toBeInTheDocument();
    });

    const loggerTab = screen.getByRole("tab", { name: /logger/i });
    fireEvent.click(loggerTab);

    await waitFor(() => {
      expect(loggerTab).toHaveAttribute("aria-selected", "true");
    });
  });

  it("displays empty state for active sessions", async () => {
    vi.mocked(api.listSessions).mockResolvedValue({ data: [], total: 0, limit: 50, offset: 0 });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /logger/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: /logger/i }));

    await waitFor(() => {
      expect(screen.getByText("No active sessions")).toBeInTheDocument();
    });
  });

  it("displays active sessions in logger tab", async () => {
    const activeSession = {
      ...mockSession,
      id: "active-1",
      title: "Active Workout",
      status: "in_progress" as const,
      started_at: "2024-01-15T10:30:00Z",
    };

    vi.mocked(api.listSessions).mockImplementation((params) => {
      if (params?.status === "in_progress") {
        return Promise.resolve({
          data: [activeSession as SessionWithExercises],
          total: 1,
          limit: 20,
          offset: 0,
        });
      }
      return Promise.resolve({ data: [], total: 0, limit: 50, offset: 0 });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /logger/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: /logger/i }));

    await waitFor(() => {
      expect(screen.getByText("Active Workout")).toBeInTheDocument();
    });

    expect(screen.getByText(/In Progress/i)).toBeInTheDocument();
  });

  it("navigates to planner when create button clicked", async () => {
    vi.mocked(api.listSessions).mockResolvedValue({ data: [], total: 0, limit: 50, offset: 0 });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Create New Session")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Create New Session"));

    expect(mockNavigate).toHaveBeenCalledWith("/planner");
  });

  it("navigates to logger when start button clicked", async () => {
    vi.mocked(api.listSessions).mockImplementation((params) => {
      if (params?.status === "planned") {
        return Promise.resolve({
          data: [mockSession as SessionWithExercises],
          total: 1,
          limit: 50,
          offset: 0,
        });
      }
      return Promise.resolve({ data: [], total: 0, limit: 50, offset: 0 });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Morning Workout")).toBeInTheDocument();
    });

    const startButton = screen.getByLabelText("Start session");
    fireEvent.click(startButton);

    expect(mockNavigate).toHaveBeenCalledWith("/logger/session-1");
  });

  it("navigates to session detail when view button clicked", async () => {
    vi.mocked(api.listSessions).mockImplementation((params) => {
      if (params?.status === "planned") {
        return Promise.resolve({
          data: [mockSession as SessionWithExercises],
          total: 1,
          limit: 50,
          offset: 0,
        });
      }
      return Promise.resolve({ data: [], total: 0, limit: 50, offset: 0 });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Morning Workout")).toBeInTheDocument();
    });

    const viewButton = screen.getByLabelText("View session");
    fireEvent.click(viewButton);

    expect(mockNavigate).toHaveBeenCalledWith("/sessions/session-1");
  });

  it("deletes session when delete button clicked and confirmed", async () => {
    vi.mocked(api.deleteSession).mockResolvedValue(undefined);

    vi.mocked(api.listSessions).mockImplementation((params) => {
      if (params?.status === "planned") {
        return Promise.resolve({
          data: [mockSession as SessionWithExercises],
          total: 1,
          limit: 50,
          offset: 0,
        });
      }
      return Promise.resolve({ data: [], total: 0, limit: 50, offset: 0 });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Morning Workout")).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText("Delete session");
    fireEvent.click(deleteButton);

    // Wait for confirmation dialog to appear
    await waitFor(() => {
      expect(screen.getByText("Delete Session")).toBeInTheDocument();
    });

    // Click the confirm button in the dialog
    const confirmButtons = screen.getAllByText("Yes, Delete Session");
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(api.deleteSession).toHaveBeenCalledWith("session-1");
    });

    await waitFor(() => {
      expect(screen.queryByText("Morning Workout")).not.toBeInTheDocument();
    });

    // Verify success toast appears
    await waitFor(() => {
      expect(screen.getByText("Session deleted successfully")).toBeInTheDocument();
    });
  });

  it("does not delete session when delete is cancelled", async () => {
    vi.mocked(api.listSessions).mockImplementation((params) => {
      if (params?.status === "planned") {
        return Promise.resolve({
          data: [mockSession as SessionWithExercises],
          total: 1,
          limit: 50,
          offset: 0,
        });
      }
      return Promise.resolve({ data: [], total: 0, limit: 50, offset: 0 });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Morning Workout")).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText("Delete session");
    fireEvent.click(deleteButton);

    // Wait for confirmation dialog to appear
    await waitFor(() => {
      expect(screen.getByText("Delete Session")).toBeInTheDocument();
    });

    // Click the cancel button in the dialog
    fireEvent.click(screen.getByText("Cancel"));

    // Verify dialog is closed
    await waitFor(() => {
      expect(screen.queryByText("Delete Session")).not.toBeInTheDocument();
    });

    expect(api.deleteSession).not.toHaveBeenCalled();
    expect(screen.getByText("Morning Workout")).toBeInTheDocument();
  });

  it("shows toast when delete fails", async () => {
    vi.mocked(api.deleteSession).mockRejectedValue(new Error("Delete failed"));

    vi.mocked(api.listSessions).mockImplementation((params) => {
      if (params?.status === "planned") {
        return Promise.resolve({
          data: [mockSession as SessionWithExercises],
          total: 1,
          limit: 50,
          offset: 0,
        });
      }
      return Promise.resolve({ data: [], total: 0, limit: 50, offset: 0 });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("Morning Workout")).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText("Delete session");
    fireEvent.click(deleteButton);

    // Wait for confirmation dialog to appear
    await waitFor(() => {
      expect(screen.getByText("Delete Session")).toBeInTheDocument();
    });

    // Click the confirm button in the dialog
    const confirmButtons = screen.getAllByText("Yes, Delete Session");
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    // Verify error toast appears
    await waitFor(() => {
      expect(screen.getByText("Failed to delete session. Please try again.")).toBeInTheDocument();
    });
  });

  it("displays exercise count for sessions", async () => {
    vi.mocked(api.listSessions).mockImplementation((params) => {
      if (params?.status === "planned") {
        return Promise.resolve({
          data: [mockSession as SessionWithExercises],
          total: 1,
          limit: 50,
          offset: 0,
        });
      }
      return Promise.resolve({ data: [], total: 0, limit: 50, offset: 0 });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("2 exercises")).toBeInTheDocument();
    });
  });

  it("shows up to 5 exercise names", async () => {
    const sessionWithManyExercises: typeof mockSession = {
      ...mockSession,
      exercises: [
        { exercise_id: "exercise-1", sets: [] },
        { exercise_id: "exercise-2", sets: [] },
        { exercise_id: "exercise-3", sets: [] },
        { exercise_id: "exercise-4", sets: [] },
        { exercise_id: "exercise-5", sets: [] },
        { exercise_id: "exercise-6", sets: [] },
      ],
    };

    vi.mocked(api.listSessions).mockImplementation((params) => {
      if (params?.status === "planned") {
        return Promise.resolve({
          data: [sessionWithManyExercises as SessionWithExercises],
          total: 1,
          limit: 50,
          offset: 0,
        });
      }
      return Promise.resolve({ data: [], total: 0, limit: 50, offset: 0 });
    });

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("+1 more")).toBeInTheDocument();
    });
  });
});
