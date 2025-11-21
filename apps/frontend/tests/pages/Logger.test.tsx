import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it("renders logger page and loads session", async () => {
    vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
    vi.mocked(api.updateSession).mockResolvedValue({} as any);

    renderLogger();

    await waitFor(() => {
      expect(screen.getByText("Test Workout")).toBeInTheDocument();
    });

    expect(api.getSession).toHaveBeenCalledWith("test-session-id");
    expect(screen.getByText(/bench-press/i)).toBeInTheDocument();
  });

  it("shows loading state while fetching session", () => {
    vi.mocked(api.getSession).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    renderLogger();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows toast and navigates when session load fails", async () => {
    vi.mocked(api.getSession).mockRejectedValue(new Error("Failed to load"));

    renderLogger();

    await waitFor(() => {
      expect(screen.getByText("Failed to load session")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/sessions");
    });
  });

  it("navigates to sessions if no sessionId provided", () => {
    render(
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
  });

  it("updates session status to in_progress when starting", async () => {
    vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
    vi.mocked(api.updateSession).mockResolvedValue({} as any);

    renderLogger();

    await waitFor(() => {
      expect(screen.getByText("Test Workout")).toBeInTheDocument();
    });

    expect(api.updateSession).toHaveBeenCalledWith("test-session-id", {
      status: "in_progress",
      started_at: expect.any(String),
    });
  });

  it("displays complete session button", async () => {
    vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
    vi.mocked(api.updateSession).mockResolvedValue({} as any);

    renderLogger();

    await waitFor(() => {
      expect(screen.getByText("Test Workout")).toBeInTheDocument();
    });

    const completeButtons = screen.getAllByText("Complete Session");
    expect(completeButtons.length).toBeGreaterThan(0);
  });

  it("shows confirmation dialog when completing session", async () => {
    vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
    vi.mocked(api.updateSession).mockResolvedValue({} as any);

    renderLogger();

    await waitFor(() => {
      expect(screen.getByText("Test Workout")).toBeInTheDocument();
    });

    // Mark a set as completed first (needed to enable the button)
    const checkboxes = screen.getAllByLabelText(/Mark complete/i);
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      const completeButtons = screen.getAllByText("Complete Session");
      // Click the first Complete Session button
      fireEvent.click(completeButtons[0]);
    });

    // Wait for confirmation dialog to appear
    await waitFor(() => {
      expect(screen.getByText(/complete this session/i)).toBeInTheDocument();
    });
  });

  it("completes session when confirmed in dialog", async () => {
    vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
    vi.mocked(api.updateSession).mockResolvedValue({} as any);

    renderLogger();

    await waitFor(() => {
      expect(screen.getByText("Test Workout")).toBeInTheDocument();
    });

    // Mark a set as completed first
    const checkboxes = screen.getAllByLabelText(/Mark complete/i);
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      const completeButtons = screen.getAllByText("Complete Session");
      fireEvent.click(completeButtons[0]);
    });

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/complete this session/i)).toBeInTheDocument();
    });

    // Click confirm button
    const confirmButtons = screen.getAllByText("Yes, Complete Session");
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    // Verify API call
    await waitFor(() => {
      expect(api.updateSession).toHaveBeenCalledWith(
        "test-session-id",
        expect.objectContaining({
          status: "completed",
          completed_at: expect.any(String),
          exercises: expect.any(Array),
        }),
      );
    });

    // Verify success toast
    await waitFor(() => {
      expect(screen.getByText("Session completed successfully!")).toBeInTheDocument();
    });

    // Verify navigation
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/sessions");
    });
  });

  it("does not complete session when cancelled in dialog", async () => {
    vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
    vi.mocked(api.updateSession).mockResolvedValue({} as any);

    renderLogger();

    await waitFor(() => {
      expect(screen.getByText("Test Workout")).toBeInTheDocument();
    });

    // Mark a set as completed first
    const checkboxes = screen.getAllByLabelText(/Mark complete/i);
    fireEvent.click(checkboxes[0]);

    // Clear the mock to only track complete calls
    vi.mocked(api.updateSession).mockClear();

    await waitFor(() => {
      const completeButtons = screen.getAllByText("Complete Session");
      fireEvent.click(completeButtons[0]);
    });

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/complete this session/i)).toBeInTheDocument();
    });

    // Click cancel button
    fireEvent.click(screen.getByText("Cancel"));

    // Verify dialog is closed
    await waitFor(() => {
      expect(screen.queryByText(/complete this session/i)).not.toBeInTheDocument();
    });

    // Verify updateSession was NOT called for completion
    expect(api.updateSession).not.toHaveBeenCalled();
  });

  it("shows error message when session completion fails", async () => {
    vi.mocked(api.getSession).mockResolvedValue(mockSessionData as any);
    vi.mocked(api.updateSession).mockResolvedValueOnce({} as any); // For starting session
    vi.mocked(api.updateSession).mockRejectedValueOnce(new Error("Completion failed")); // For completing

    renderLogger();

    await waitFor(() => {
      expect(screen.getByText("Test Workout")).toBeInTheDocument();
    });

    // Mark a set as completed first
    const checkboxes = screen.getAllByLabelText(/Mark complete/i);
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      const completeButtons = screen.getAllByText("Complete Session");
      fireEvent.click(completeButtons[0]);
    });

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/complete this session/i)).toBeInTheDocument();
    });

    // Click confirm button
    const confirmButtons = screen.getAllByText("Yes, Complete Session");
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText("Failed to complete session. Please try again.")).toBeInTheDocument();
    });
  });
});
