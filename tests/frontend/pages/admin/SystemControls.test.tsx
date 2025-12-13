import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import SystemControls from "../../../../apps/frontend/src/pages/admin/SystemControls";
import * as api from "../../../../apps/frontend/src/services/api";
import { useToast } from "../../../../apps/frontend/src/contexts/ToastContext";

vi.mock("../../../../apps/frontend/src/services/api");
vi.mock("../../../../apps/frontend/src/contexts/ToastContext");
vi.mock("../../../../apps/frontend/src/utils/logger", () => ({
  logger: {
    apiError: vi.fn(),
  },
}));

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

describe("SystemControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue(mockToast);
  });

  const mockReadOnlyStatus: api.SystemReadOnlyStatus = {
    readOnlyMode: false,
    message: null,
    enabledAt: null,
    enabledBy: null,
    reason: null,
    estimatedDuration: null,
  };

  const mockHealthStatus: api.HealthStatusResponse = {
    status: "ok",
    uptime: 86400,
    version: "1.0.0",
    timestamp: "2025-01-01T00:00:00Z",
  };

  it("should render system controls page", async () => {
    vi.mocked(api.getSystemReadOnlyStatus).mockResolvedValue(mockReadOnlyStatus);
    vi.mocked(api.getHealthStatus).mockResolvedValue(mockHealthStatus);

    render(
      <MemoryRouter>
        <SystemControls />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(screen.getByText("System Health")).toBeInTheDocument();
        expect(screen.getByText("Read-Only Mode")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("should show loading state", () => {
    vi.mocked(api.getSystemReadOnlyStatus).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );
    vi.mocked(api.getHealthStatus).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(
      <MemoryRouter>
        <SystemControls />
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading system status...")).toBeInTheDocument();
  });

  it("should display system health status", async () => {
    vi.mocked(api.getSystemReadOnlyStatus).mockResolvedValue(mockReadOnlyStatus);
    vi.mocked(api.getHealthStatus).mockResolvedValue(mockHealthStatus);

    render(
      <MemoryRouter>
        <SystemControls />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(screen.getByText("Healthy")).toBeInTheDocument();
        expect(screen.getByText("1d 0h")).toBeInTheDocument();
        expect(screen.getByText("Normal")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("should display degraded health status", async () => {
    vi.mocked(api.getSystemReadOnlyStatus).mockResolvedValue(mockReadOnlyStatus);
    vi.mocked(api.getHealthStatus).mockResolvedValue({
      ...mockHealthStatus,
      status: "degraded",
    });

    render(
      <MemoryRouter>
        <SystemControls />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(screen.getByText("Degraded")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("should format uptime correctly", async () => {
    vi.mocked(api.getSystemReadOnlyStatus).mockResolvedValue(mockReadOnlyStatus);
    vi.mocked(api.getHealthStatus).mockResolvedValue({
      ...mockHealthStatus,
      uptime: 3600, // 1 hour
    });

    render(
      <MemoryRouter>
        <SystemControls />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(screen.getByText("1h 0m")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("should show enable read-only mode button when not in read-only mode", async () => {
    vi.mocked(api.getSystemReadOnlyStatus).mockResolvedValue(mockReadOnlyStatus);
    vi.mocked(api.getHealthStatus).mockResolvedValue(mockHealthStatus);

    render(
      <MemoryRouter>
        <SystemControls />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(screen.getByText("Enable Read-Only Mode")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("should show enable form when enable button is clicked", async () => {
    vi.mocked(api.getSystemReadOnlyStatus).mockResolvedValue(mockReadOnlyStatus);
    vi.mocked(api.getHealthStatus).mockResolvedValue(mockHealthStatus);

    render(
      <MemoryRouter>
        <SystemControls />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(screen.getByText("Enable Read-Only Mode")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const enableButton = screen.getByText("Enable Read-Only Mode");
    fireEvent.click(enableButton);

    await waitFor(
      () => {
        expect(screen.getByText("Warning")).toBeInTheDocument();
        expect(screen.getByLabelText("Reason (optional)")).toBeInTheDocument();
        expect(screen.getByLabelText("Estimated Duration (optional)")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("should enable read-only mode when confirmed", async () => {
    vi.mocked(api.getSystemReadOnlyStatus)
      .mockResolvedValueOnce(mockReadOnlyStatus)
      .mockResolvedValueOnce({
        ...mockReadOnlyStatus,
        readOnlyMode: true,
        message: "Maintenance mode",
      });
    vi.mocked(api.getHealthStatus).mockResolvedValue(mockHealthStatus);
    vi.mocked(api.enableReadOnlyMode).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <SystemControls />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(screen.getByText("Enable Read-Only Mode")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const enableButton = screen.getByText("Enable Read-Only Mode");
    fireEvent.click(enableButton);

    await waitFor(
      () => {
        expect(screen.getByLabelText("Reason (optional)")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const reasonInput = screen.getByLabelText("Reason (optional)");
    fireEvent.change(reasonInput, { target: { value: "Emergency maintenance" } });

    const confirmButton = screen.getByText("Confirm Enable");
    fireEvent.click(confirmButton);

    await waitFor(
      () => {
        expect(api.enableReadOnlyMode).toHaveBeenCalledWith({
          reason: "Emergency maintenance",
          estimatedDuration: undefined,
        });
        expect(mockToast.success).toHaveBeenCalledWith("Read-only mode enabled successfully");
      },
      { timeout: 5000 },
    );
  });

  it("should show error when enabling read-only mode fails", async () => {
    vi.mocked(api.getSystemReadOnlyStatus).mockResolvedValue(mockReadOnlyStatus);
    vi.mocked(api.getHealthStatus).mockResolvedValue(mockHealthStatus);
    vi.mocked(api.enableReadOnlyMode).mockRejectedValue(new Error("Failed to enable"));

    render(
      <MemoryRouter>
        <SystemControls />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(screen.getByText("Enable Read-Only Mode")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const enableButton = screen.getByText("Enable Read-Only Mode");
    fireEvent.click(enableButton);

    await waitFor(
      () => {
        expect(screen.getByText("Confirm Enable")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const confirmButton = screen.getByText("Confirm Enable");
    fireEvent.click(confirmButton);

    await waitFor(
      () => {
        expect(
          screen.getByText("Failed to enable read-only mode. Please try again."),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("should show disable button when in read-only mode", async () => {
    vi.mocked(api.getSystemReadOnlyStatus).mockResolvedValue({
      ...mockReadOnlyStatus,
      readOnlyMode: true,
      message: "Maintenance mode",
    });
    vi.mocked(api.getHealthStatus).mockResolvedValue(mockHealthStatus);

    render(
      <MemoryRouter>
        <SystemControls />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(screen.getByText("Read-Only Mode Active")).toBeInTheDocument();
        expect(screen.getByText("Disable Read-Only Mode")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("should disable read-only mode when confirmed", async () => {
    vi.mocked(api.getSystemReadOnlyStatus)
      .mockResolvedValueOnce({
        ...mockReadOnlyStatus,
        readOnlyMode: true,
        message: "Maintenance mode",
      })
      .mockResolvedValueOnce(mockReadOnlyStatus);
    vi.mocked(api.getHealthStatus).mockResolvedValue(mockHealthStatus);
    vi.mocked(api.disableReadOnlyMode).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <SystemControls />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Disable Read-Only Mode");
        expect(buttons.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const disableButtons = screen.getAllByText("Disable Read-Only Mode");
    // Click the button (first one should be the actual button)
    fireEvent.click(disableButtons[0]);

    await waitFor(
      () => {
        // Look for the dialog title specifically
        expect(screen.getByText("Disable Read-Only Mode", { selector: "h3" })).toBeInTheDocument();
        expect(
          screen.getByText(
            "Are you sure you want to disable read-only mode and restore normal operations?",
          ),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const confirmButton = screen.getByText("Yes, Disable");
    fireEvent.click(confirmButton);

    await waitFor(
      () => {
        expect(api.disableReadOnlyMode).toHaveBeenCalledWith({
          notes: undefined,
        });
        expect(mockToast.success).toHaveBeenCalledWith("Read-only mode disabled successfully");
      },
      { timeout: 5000 },
    );
  });

  it("should set up polling interval on mount", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(api.getSystemReadOnlyStatus).mockResolvedValue(mockReadOnlyStatus);
    vi.mocked(api.getHealthStatus).mockResolvedValue(mockHealthStatus);

    const { unmount } = render(
      <MemoryRouter>
        <SystemControls />
      </MemoryRouter>,
    );

    // Wait for initial load
    await waitFor(
      () => {
        expect(api.getSystemReadOnlyStatus).toHaveBeenCalledTimes(1);
        expect(api.getHealthStatus).toHaveBeenCalledTimes(1);
      },
      { timeout: 3000 },
    );

    // Clear call history to verify polling
    vi.clearAllMocks();
    vi.mocked(api.getSystemReadOnlyStatus).mockResolvedValue(mockReadOnlyStatus);
    vi.mocked(api.getHealthStatus).mockResolvedValue(mockHealthStatus);

    // Advance time by 30 seconds - but limit to avoid infinite loops
    vi.advanceTimersByTime(30000);

    // Unmount immediately to prevent infinite polling
    unmount();
    vi.useRealTimers();

    // Just verify the component rendered and set up the interval
    // Full polling behavior is better tested in integration tests
    expect(api.getSystemReadOnlyStatus).toHaveBeenCalled();
  });

  it("should cancel enable read-only mode", async () => {
    vi.mocked(api.getSystemReadOnlyStatus).mockResolvedValue(mockReadOnlyStatus);
    vi.mocked(api.getHealthStatus).mockResolvedValue(mockHealthStatus);

    render(
      <MemoryRouter>
        <SystemControls />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(screen.getByText("Enable Read-Only Mode")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const enableButton = screen.getByText("Enable Read-Only Mode");
    fireEvent.click(enableButton);

    await waitFor(
      () => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    await waitFor(
      () => {
        expect(screen.queryByText("Warning")).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(api.enableReadOnlyMode).not.toHaveBeenCalled();
  });
});
