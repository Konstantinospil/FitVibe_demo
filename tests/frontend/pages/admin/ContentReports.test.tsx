import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ContentReports from "../../../../apps/frontend/src/pages/admin/ContentReports";
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

describe("ContentReports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue(mockToast);
  });

  const mockReport: api.FeedReport = {
    id: "report-1",
    reporterId: "user-1",
    reporterUsername: "reporter",
    feedItemId: "item-1",
    commentId: null,
    reason: "spam",
    details: "This is spam content",
    status: "pending",
    createdAt: "2025-01-01T00:00:00Z",
    resolvedAt: null,
    resolvedBy: null,
    contentPreview: "Test content",
    contentAuthor: "author",
  };

  it("should render content reports page", () => {
    vi.mocked(api.getFeedReports).mockResolvedValue({
      data: [mockReport],
    });

    render(
      <MemoryRouter>
        <ContentReports />
      </MemoryRouter>,
    );

    expect(screen.getByText("Content Reports Queue")).toBeInTheDocument();
    expect(
      screen.getByText("Review and moderate reported feed items and comments"),
    ).toBeInTheDocument();
  });

  it("should load and display reports", async () => {
    vi.mocked(api.getFeedReports).mockResolvedValue({
      data: [mockReport],
    });

    render(
      <MemoryRouter>
        <ContentReports />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // The reason "spam" appears in "Reason: spam" text
      expect(screen.getByText(/Reason:.*spam/i)).toBeInTheDocument();
      expect(screen.getByText(/Reported by @reporter/i)).toBeInTheDocument();
      expect(screen.getByText("This is spam content")).toBeInTheDocument();
    });
  });

  it("should show loading state", () => {
    vi.mocked(api.getFeedReports).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(
      <MemoryRouter>
        <ContentReports />
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading reports...")).toBeInTheDocument();
  });

  it("should show error message when loading fails", async () => {
    vi.mocked(api.getFeedReports).mockRejectedValue(new Error("Failed to load"));

    render(
      <MemoryRouter>
        <ContentReports />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to load reports. Please try again.")).toBeInTheDocument();
    });
  });

  it("should show empty state when no reports", async () => {
    vi.mocked(api.getFeedReports).mockResolvedValue({
      data: [],
    });

    render(
      <MemoryRouter>
        <ContentReports />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("No reports to review")).toBeInTheDocument();
      expect(screen.getByText("No reports with status: pending")).toBeInTheDocument();
    });
  });

  it("should filter reports by status", async () => {
    vi.mocked(api.getFeedReports).mockResolvedValue({
      data: [mockReport],
    });

    render(
      <MemoryRouter>
        <ContentReports />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(api.getFeedReports).toHaveBeenCalledWith({
        status: "pending",
      });
    });

    const allButton = screen.getByText("all");
    fireEvent.click(allButton);

    await waitFor(() => {
      expect(api.getFeedReports).toHaveBeenCalledWith({
        status: undefined,
      });
    });
  });

  it("should show dismiss button for pending reports", async () => {
    vi.mocked(api.getFeedReports).mockResolvedValue({
      data: [mockReport],
    });

    render(
      <MemoryRouter>
        <ContentReports />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Dismiss")).toBeInTheDocument();
    });
  });

  it("should show hide and ban buttons for pending reports", async () => {
    vi.mocked(api.getFeedReports).mockResolvedValue({
      data: [mockReport],
    });

    render(
      <MemoryRouter>
        <ContentReports />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Hide Content")).toBeInTheDocument();
      expect(screen.getByText("Ban User")).toBeInTheDocument();
    });
  });

  it("should open confirmation dialog when dismissing report", async () => {
    vi.mocked(api.getFeedReports).mockResolvedValue({
      data: [mockReport],
    });
    vi.mocked(api.moderateContent).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <ContentReports />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Dismiss")).toBeInTheDocument();
    });

    const dismissButton = screen.getByText("Dismiss");
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.getByText("Dismiss Report")).toBeInTheDocument();
      expect(screen.getByText("Are you sure you want to dismiss this report?")).toBeInTheDocument();
    });
  });

  it("should dismiss report when confirmed", async () => {
    vi.mocked(api.getFeedReports)
      .mockResolvedValueOnce({
        data: [mockReport],
      })
      .mockResolvedValueOnce({
        data: [],
      });
    vi.mocked(api.moderateContent).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <ContentReports />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Dismiss")).toBeInTheDocument();
    });

    const dismissButton = screen.getByText("Dismiss");
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.getByText("Yes, Dismiss")).toBeInTheDocument();
    });

    const confirmButton = screen.getByText("Yes, Dismiss");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.moderateContent).toHaveBeenCalledWith("report-1", { action: "dismiss" });
      expect(mockToast.success).toHaveBeenCalledWith("Content dismissed successfully");
    });
  });

  it("should hide content when confirmed", async () => {
    vi.mocked(api.getFeedReports)
      .mockResolvedValueOnce({
        data: [mockReport],
      })
      .mockResolvedValueOnce({
        data: [],
      });
    vi.mocked(api.moderateContent).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <ContentReports />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const hideButtons = screen.getAllByText("Hide Content");
      expect(hideButtons.length).toBeGreaterThan(0);
    });

    const hideButtons = screen.getAllByText("Hide Content");
    // Find the actual button element (not the dialog title)
    const hideButton = hideButtons.find(
      (btn) =>
        btn.tagName === "BUTTON" || (btn.closest("button") && !btn.closest('[role="dialog"]')),
    );
    if (!hideButton) {
      // Fallback: just click the first one
      fireEvent.click(hideButtons[0]);
    } else {
      fireEvent.click(hideButton);
    }

    await waitFor(
      () => {
        // Look for the dialog message - it's more specific than the title
        expect(screen.getByText(/Are you sure you want to hide this content/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const confirmButton = screen.getByText("Yes, Hide Content");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.moderateContent).toHaveBeenCalledWith("report-1", { action: "hide" });
      expect(mockToast.success).toHaveBeenCalledWith("Content hidden successfully");
    });
  });

  it("should ban user when confirmed", async () => {
    vi.mocked(api.getFeedReports)
      .mockResolvedValueOnce({
        data: [mockReport],
      })
      .mockResolvedValueOnce({
        data: [],
      });
    vi.mocked(api.moderateContent).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <ContentReports />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const banButtons = screen.getAllByText("Ban User");
      expect(banButtons.length).toBeGreaterThan(0);
    });

    const banButtons = screen.getAllByText("Ban User");
    // Click the button (first one should be the actual button)
    fireEvent.click(banButtons[0]);

    await waitFor(() => {
      // Look for the dialog title specifically
      expect(screen.getByText("Ban User", { selector: "h3" })).toBeInTheDocument();
      expect(
        screen.getByText(
          "Are you sure you want to ban this user? This will ban the user and cannot be undone.",
        ),
      ).toBeInTheDocument();
    });

    const confirmButton = screen.getByText("Yes, Ban User");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.moderateContent).toHaveBeenCalledWith("report-1", { action: "ban" });
      expect(mockToast.success).toHaveBeenCalledWith("Content banned successfully");
    });
  });

  it("should show error when moderation fails", async () => {
    vi.mocked(api.getFeedReports).mockResolvedValue({
      data: [mockReport],
    });
    vi.mocked(api.moderateContent).mockRejectedValue(new Error("Moderation failed"));

    render(
      <MemoryRouter>
        <ContentReports />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Dismiss")).toBeInTheDocument();
    });

    const dismissButton = screen.getByText("Dismiss");
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.getByText("Yes, Dismiss")).toBeInTheDocument();
    });

    const confirmButton = screen.getByText("Yes, Dismiss");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to dismiss content. Please try again.");
    });
  });

  it("should not show action buttons for non-pending reports", async () => {
    const reviewedReport = { ...mockReport, status: "reviewed" as const };
    vi.mocked(api.getFeedReports).mockResolvedValue({
      data: [reviewedReport],
    });

    render(
      <MemoryRouter>
        <ContentReports />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByText("Dismiss")).not.toBeInTheDocument();
      expect(screen.queryByText("Hide Content")).not.toBeInTheDocument();
      expect(screen.queryByText("Ban User")).not.toBeInTheDocument();
    });
  });

  it("should cancel confirmation dialog", async () => {
    vi.mocked(api.getFeedReports).mockResolvedValue({
      data: [mockReport],
    });

    render(
      <MemoryRouter>
        <ContentReports />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Dismiss")).toBeInTheDocument();
    });

    const dismissButton = screen.getByText("Dismiss");
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText("Dismiss Report")).not.toBeInTheDocument();
    });

    expect(api.moderateContent).not.toHaveBeenCalled();
  });
});
