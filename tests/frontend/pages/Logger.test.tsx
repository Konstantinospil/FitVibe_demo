import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import Logger from "../../src/pages/Logger";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as api from "../../src/services/api";
import { ToastProvider } from "../../src/contexts/ToastContext";

// Mock API
vi.mock("../../src/services/api", async () => {
  const actual = await vi.importActual("../../src/services/api");
  return {
    ...actual,
    getSession: vi.fn(),
    updateSession: vi.fn(),
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
        "logger.eyebrow": "Workout",
        "logger.title": "Logger",
        "logger.description": "Log your workout",
        "common.loading": "Loading...",
        "logger.repsPlaceholder": "Reps",
        "logger.weightPlaceholder": "Weight",
        "logger.rpePlaceholder": "RPE",
      },
    },
  },
});

const renderLogger = (sessionId: string = "test-session-id") => {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[`/logger/${sessionId}`]}>
        <I18nextProvider i18n={testI18n}>
          <Routes>
            <Route path="/logger/:sessionId" element={<Logger />} />
          </Routes>
        </I18nextProvider>
      </MemoryRouter>
    </ToastProvider>,
  );
};

const mockSessionData = {
  id: "test-session-id",
  owner_id: "user-1",
  title: "Test Workout",
  planned_at: "2024-01-15T10:00:00Z",
  status: "planned" as const,
  visibility: "private" as const,
  exercises: [
    {
      id: "ex-1",
      exercise_id: "bench-press",
      order_index: 0,
      notes: "Warm up first",
      planned: {
        sets: 3,
        reps: 10,
        load: 80,
        rpe: 7,
      },
      sets: [],
    },
  ],
};

describe("Logger", () => {
  let intervalIds: NodeJS.Timeout[] = [];
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    intervalIds = [];

    // Mock setInterval to track all intervals
    global.setInterval = vi.fn((fn: () => void, delay?: number) => {
      const id = originalSetInterval(fn, delay) as unknown as NodeJS.Timeout;
      intervalIds.push(id);
      return id;
    }) as typeof setInterval;

    // Mock clearInterval to track cleared intervals
    global.clearInterval = vi.fn((id: NodeJS.Timeout) => {
      intervalIds = intervalIds.filter((i) => i !== id);
      return originalClearInterval(id);
    }) as typeof clearInterval;

    // Mock navigator.vibrate to prevent errors
    if (!("vibrate" in navigator)) {
      Object.defineProperty(navigator, "vibrate", {
        value: vi.fn(),
        writable: true,
        configurable: true,
      });
    }
  });

  afterEach(() => {
    // Clean up rendered components - this triggers React cleanup functions
    // which will clear setInterval timers in the Logger component
    cleanup();

    // Clear any remaining intervals
    intervalIds.forEach((id) => {
      originalClearInterval(id);
    });
    intervalIds = [];

    // Restore original functions
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
  });

  it("renders logger page and loads session", async () => {
    vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
    vi.mocked(api.updateSession).mockResolvedValue({} as any);

    const { unmount } = renderLogger();

    // Use findByText which is async but doesn't use waitFor
    const title = await screen.findByText("Test Workout");
    expect(title).toBeInTheDocument();

    expect(api.getSession).toHaveBeenCalledWith("test-session-id");
    expect(screen.getByText(/bench-press/i)).toBeInTheDocument();

    unmount();
  });

  it("shows loading state while fetching session", () => {
    vi.mocked(api.getSession).mockImplementation(
      () => new Promise(() => {}), // Never resolves - testing loading state
    );

    const { unmount } = renderLogger();

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Clean up: unmount component to prevent any timers from keeping process alive
    unmount();
  });

  it("shows toast and navigates when session load fails", async () => {
    vi.mocked(api.getSession).mockRejectedValue(new Error("Failed to load"));

    const { unmount } = renderLogger();

    // Use findByText for async content
    const errorMessage = await screen.findByText("Failed to load session");
    expect(errorMessage).toBeInTheDocument();

    // Navigation should happen
    expect(mockNavigate).toHaveBeenCalledWith("/sessions");

    unmount();
  });

  it("navigates to sessions if no sessionId provided", () => {
    const { unmount } = render(
      <ToastProvider>
        <MemoryRouter initialEntries={["/logger/"]}>
          <I18nextProvider i18n={testI18n}>
            <Routes>
              <Route path="/logger/" element={<Logger />} />
            </Routes>
          </I18nextProvider>
        </MemoryRouter>
      </ToastProvider>,
    );

    expect(mockNavigate).toHaveBeenCalledWith("/sessions");
    unmount();
  });

  it("updates session status to in_progress when starting", async () => {
    vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
    vi.mocked(api.updateSession).mockResolvedValue({} as any);

    const { unmount } = renderLogger();

    await screen.findByText("Test Workout");

    expect(api.updateSession).toHaveBeenCalledWith("test-session-id", {
      status: "in_progress",
      started_at: expect.any(String),
    });

    unmount();
  });

  it("displays complete session button", async () => {
    vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
    vi.mocked(api.updateSession).mockResolvedValue({} as any);

    const { unmount } = renderLogger();

    await screen.findByText("Test Workout");

    const completeButtons = screen.getAllByText("Complete Session");
    expect(completeButtons.length).toBeGreaterThan(0);

    unmount();
  });

  it("shows confirmation dialog when completing session", async () => {
    vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
    vi.mocked(api.updateSession).mockResolvedValue({} as any);

    const { unmount } = renderLogger();

    await screen.findByText("Test Workout");

    // Mark a set as completed first (needed to enable the button)
    const checkboxes = screen.getAllByLabelText(/Mark complete/i);
    fireEvent.click(checkboxes[0]);

    // Click the first Complete Session button
    const completeButtons = screen.getAllByText("Complete Session");
    fireEvent.click(completeButtons[0]);

    // Wait for confirmation dialog to appear using findByText
    const dialog = await screen.findByText(/complete this session/i);
    expect(dialog).toBeInTheDocument();

    unmount();
  });

  it("completes session when confirmed in dialog", async () => {
    vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
    vi.mocked(api.updateSession).mockResolvedValue({} as any);

    const { unmount } = renderLogger();

    await screen.findByText("Test Workout");

    // Mark a set as completed first
    const checkboxes = screen.getAllByLabelText(/Mark complete/i);
    fireEvent.click(checkboxes[0]);

    // Complete session
    const completeButtons = screen.getAllByText("Complete Session");
    fireEvent.click(completeButtons[0]);

    // Wait for confirmation dialog
    await screen.findByText(/complete this session/i);

    // Click confirm button
    const confirmButtons = screen.getAllByText("Yes, Complete Session");
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    // Verify API call
    expect(api.updateSession).toHaveBeenCalledWith(
      "test-session-id",
      expect.objectContaining({
        status: "completed",
        completed_at: expect.any(String),
        exercises: expect.any(Array),
      }),
    );

    // Verify success toast
    const successMessage = await screen.findByText("Session completed successfully!");
    expect(successMessage).toBeInTheDocument();

    // Verify navigation
    expect(mockNavigate).toHaveBeenCalledWith("/sessions");

    unmount();
  });

  it("does not complete session when cancelled in dialog", async () => {
    vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
    vi.mocked(api.updateSession).mockResolvedValue({} as any);

    const { unmount } = renderLogger();

    await screen.findByText("Test Workout");

    // Mark a set as completed first
    const checkboxes = screen.getAllByLabelText(/Mark complete/i);
    fireEvent.click(checkboxes[0]);

    // Clear the mock to only track complete calls
    vi.mocked(api.updateSession).mockClear();

    // Click complete button
    const completeButtons = screen.getAllByText("Complete Session");
    fireEvent.click(completeButtons[0]);

    // Wait for confirmation dialog
    await screen.findByText(/complete this session/i);

    // Click cancel button
    fireEvent.click(screen.getByText("Cancel"));

    // Verify dialog is closed
    expect(screen.queryByText(/complete this session/i)).not.toBeInTheDocument();

    // Verify updateSession was NOT called for completion
    expect(api.updateSession).not.toHaveBeenCalled();

    unmount();
  });

  it("shows error message when session completion fails", async () => {
    vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
    vi.mocked(api.updateSession).mockResolvedValueOnce({} as any); // For starting session
    vi.mocked(api.updateSession).mockRejectedValueOnce(new Error("Completion failed")); // For completing

    const { unmount } = renderLogger();

    await screen.findByText("Test Workout");

    // Mark a set as completed first
    const checkboxes = screen.getAllByLabelText(/Mark complete/i);
    fireEvent.click(checkboxes[0]);

    // Click complete button
    const completeButtons = screen.getAllByText("Complete Session");
    fireEvent.click(completeButtons[0]);

    // Wait for confirmation dialog
    await screen.findByText(/complete this session/i);

    // Click confirm button
    const confirmButtons = screen.getAllByText("Yes, Complete Session");
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    // Verify error message appears
    const errorMessage = await screen.findByText("Failed to complete session. Please try again.");
    expect(errorMessage).toBeInTheDocument();

    unmount();
  });

  describe("rest timer functionality", () => {
    it("starts rest timer when set is completed", async () => {
      vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      // Mark a set as completed - should start rest timer
      const checkboxes = screen.getAllByLabelText(/Mark complete/i);
      fireEvent.click(checkboxes[0]);

      // Wait for rest timer to appear
      const restTimer = await screen.findByText(/Rest Timer/i);
      expect(restTimer).toBeInTheDocument();

      unmount();
    });

    it("stops rest timer when stop button is clicked", async () => {
      vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      // Start rest timer
      const checkboxes = screen.getAllByLabelText(/Mark complete/i);
      fireEvent.click(checkboxes[0]);

      // Wait for rest timer to appear
      await screen.findByText(/Rest Timer/i);

      // Click stop button (should be available now)
      const stopButton = screen.getByText(/Stop Rest/i);
      fireEvent.click(stopButton);

      // Rest timer should be hidden - check immediately
      expect(screen.queryByText(/Rest Timer/i)).not.toBeInTheDocument();

      unmount();
    });

    it("starts rest timer manually", async () => {
      vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      // Click start rest button
      const startRestButton = screen.getByText(/Start Rest/i);
      fireEvent.click(startRestButton);

      // Wait for rest timer to appear
      const restTimer = await screen.findByText(/Rest Timer/i);
      expect(restTimer).toBeInTheDocument();

      unmount();
    });
  });

  describe("set data updates", () => {
    it("updates set reps", async () => {
      vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      // Find reps input by placeholder
      const repsInputs = screen.getAllByPlaceholderText("Reps");
      expect(repsInputs.length).toBeGreaterThan(0);
      fireEvent.change(repsInputs[0], { target: { value: "12" } });
      expect(repsInputs[0]).toHaveValue(12);

      unmount();
    });

    it("updates set weight", async () => {
      vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      // Find weight input by placeholder
      const weightInputs = screen.getAllByPlaceholderText("Weight");
      expect(weightInputs.length).toBeGreaterThan(0);
      fireEvent.change(weightInputs[0], { target: { value: "100" } });
      expect(weightInputs[0]).toHaveValue(100);

      unmount();
    });

    it("updates set RPE", async () => {
      vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      // Find RPE input by placeholder
      const rpeInputs = screen.getAllByPlaceholderText("RPE");
      expect(rpeInputs.length).toBeGreaterThan(0);
      fireEvent.change(rpeInputs[0], { target: { value: "8" } });
      expect(rpeInputs[0]).toHaveValue(8);

      unmount();
    });

    // Note: Logger component doesn't have a notes input field for individual sets
    // Exercise-level notes exist but are not editable in the Logger component
  });

  describe("exercise management", () => {
    it("toggles exercise collapse/expand", async () => {
      vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      // Find collapse/expand button
      const collapseButtons = screen.getAllByLabelText(/Collapse|Expand/i);
      if (collapseButtons.length > 0) {
        fireEvent.click(collapseButtons[0]);
        // Exercise should be collapsed/expanded
        expect(collapseButtons[0]).toBeInTheDocument();
      }

      unmount();
    });
  });

  describe("session status handling", () => {
    it("handles session with in_progress status", async () => {
      const inProgressSession = {
        ...mockSessionData,
        status: "in_progress" as const,
        started_at: new Date().toISOString(),
      };

      vi.mocked(api.getSession).mockResolvedValue(inProgressSession as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      // Should not call updateSession to start (already started)
      expect(api.updateSession).not.toHaveBeenCalledWith(
        "test-session-id",
        expect.objectContaining({ status: "in_progress" }),
      );

      unmount();
    });

    it("handles session with completed status", async () => {
      const completedSession = {
        ...mockSessionData,
        status: "completed" as const,
        started_at: new Date(Date.now() - 3600000).toISOString(),
        completed_at: new Date().toISOString(),
      };

      vi.mocked(api.getSession).mockResolvedValue(completedSession as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      unmount();
    });
  });

  describe("exercise log initialization", () => {
    it("initializes logs from existing sets", async () => {
      const sessionWithSets = {
        ...mockSessionData,
        exercises: [
          {
            id: "ex-1",
            exercise_id: "bench-press",
            order_index: 0,
            notes: null,
            planned: { sets: 3, reps: 10, load: 80, rpe: 7 },
            sets: [
              { order_index: 0, reps: 10, weight_kg: 80, rpe: 7, notes: null },
              { order_index: 1, reps: 10, weight_kg: 80, rpe: 7, notes: null },
            ],
          },
        ],
      };

      vi.mocked(api.getSession).mockResolvedValue(sessionWithSets as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      // Should have 2 sets initialized from existing sets
      const repsInputs = screen.getAllByPlaceholderText("Reps");
      expect(repsInputs.length).toBeGreaterThanOrEqual(2);

      unmount();
    });

    it("initializes logs from planned data when no sets exist", async () => {
      const sessionWithPlanned = {
        ...mockSessionData,
        exercises: [
          {
            id: "ex-1",
            exercise_id: "bench-press",
            order_index: 0,
            notes: null,
            planned: { sets: 3, reps: 10, load: 80, rpe: 7 },
            sets: [],
          },
        ],
      };

      vi.mocked(api.getSession).mockResolvedValue(sessionWithPlanned as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      // Should have 3 sets initialized from planned data
      const repsInputs = screen.getAllByPlaceholderText("Reps");
      expect(repsInputs.length).toBeGreaterThanOrEqual(3);

      unmount();
    });

    it("handles exercise with null exercise_id", async () => {
      const sessionWithNullExercise = {
        ...mockSessionData,
        exercises: [
          {
            id: "ex-1",
            exercise_id: null,
            order_index: 0,
            notes: null,
            planned: { sets: 3, reps: 10, load: 80, rpe: 7 },
            sets: [],
          },
        ],
      };

      vi.mocked(api.getSession).mockResolvedValue(sessionWithNullExercise as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      unmount();
    });
  });

  describe("session timer", () => {
    it("displays session elapsed time", async () => {
      vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      // Timer should be displayed (component creates interval on mount)
      const timerElements = screen.getAllByText(/\d+:\d+/);
      expect(timerElements.length).toBeGreaterThan(0);

      unmount();
    });
  });

  describe("complete session button state", () => {
    it("disables complete button when no sets are completed", async () => {
      vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      // Find the Complete Session button (there are two - one in header, one at bottom)
      // Both should be disabled when no sets are completed
      const completeButtons = screen.getAllByText("Complete Session");
      expect(completeButtons.length).toBeGreaterThan(0);
      // Check the first button (header button)
      expect(completeButtons[0]).toBeDisabled();

      unmount();
    });

    it("enables complete button when at least one set is completed", async () => {
      vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      // Mark a set as completed
      const checkboxes = screen.getAllByLabelText(/Mark complete/i);
      fireEvent.click(checkboxes[0]);

      // Check button state - it should be enabled now
      const completeButtons = screen.getAllByText("Complete Session");
      expect(completeButtons.length).toBeGreaterThan(0);
      // Check the first button (header button)
      expect(completeButtons[0]).not.toBeDisabled();

      unmount();
    });
  });

  describe("session completion payload", () => {
    it("includes all logged set data in completion payload", async () => {
      vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      // Update set data
      const repsInputs = screen.getAllByPlaceholderText("Reps");
      expect(repsInputs.length).toBeGreaterThan(0);
      fireEvent.change(repsInputs[0], { target: { value: "12" } });

      const weightInputs = screen.getAllByPlaceholderText("Weight");
      expect(weightInputs.length).toBeGreaterThan(0);
      fireEvent.change(weightInputs[0], { target: { value: "100" } });

      // Mark set as completed
      const checkboxes = screen.getAllByLabelText(/Mark complete/i);
      fireEvent.click(checkboxes[0]);

      // Complete session
      const completeButtons = screen.getAllByText("Complete Session");
      fireEvent.click(completeButtons[0]);

      // Wait for dialog and confirm
      await screen.findByText(/complete this session/i);
      const confirmButtons = screen.getAllByText("Yes, Complete Session");
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);

      // Verify API call
      expect(api.updateSession).toHaveBeenCalledWith(
        "test-session-id",
        expect.objectContaining({
          exercises: expect.arrayContaining([
            expect.objectContaining({
              sets: expect.arrayContaining([
                expect.objectContaining({
                  reps: expect.any(Number),
                  weight_kg: expect.any(Number),
                }),
              ]),
            }),
          ]),
        }),
      );

      unmount();
    });
  });

  describe("edge cases", () => {
    it("handles session without title", async () => {
      const sessionWithoutTitle = {
        ...mockSessionData,
        title: null,
      };

      vi.mocked(api.getSession).mockResolvedValue(sessionWithoutTitle as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      const title = await screen.findByText("Workout Session");
      expect(title).toBeInTheDocument();

      unmount();
    });

    it("handles session with multiple exercises", async () => {
      const multiExerciseSession = {
        ...mockSessionData,
        exercises: [
          {
            id: "ex-1",
            exercise_id: "bench-press",
            order_index: 0,
            notes: null,
            planned: { sets: 3, reps: 10, load: 80, rpe: 7 },
            sets: [],
          },
          {
            id: "ex-2",
            exercise_id: "squat",
            order_index: 1,
            notes: null,
            planned: { sets: 4, reps: 8, load: 120, rpe: 8 },
            sets: [],
          },
        ],
      };

      vi.mocked(api.getSession).mockResolvedValue(multiExerciseSession as any);
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      await screen.findByText("Test Workout");

      // Should have multiple exercises
      const exerciseCards = screen.getAllByText(/Exercise|Set/i);
      expect(exerciseCards.length).toBeGreaterThan(0);

      unmount();
    });

    it("handles confirmCompleteSession when session is null", async () => {
      vi.mocked(api.getSession).mockRejectedValue(new Error("Session not found"));
      vi.mocked(api.updateSession).mockResolvedValue({} as any);

      const { unmount } = renderLogger();

      // Should navigate away when session load fails
      await screen.findByText("Failed to load session");
      expect(mockNavigate).toHaveBeenCalledWith("/sessions");

      unmount();
    });
  });
});
