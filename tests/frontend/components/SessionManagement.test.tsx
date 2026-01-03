import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionManagement } from "../../src/components/SessionManagement";
import * as api from "../../src/services/api";
import { useToast } from "../../src/contexts/ToastContext";

vi.mock("../../src/services/api");
vi.mock("../../src/contexts/ToastContext");
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: () => "",
  }),
}));
vi.mock("../../src/utils/logger", () => ({
  logger: {
    apiError: vi.fn(),
  },
}));

const toast = {
  success: vi.fn(),
  error: vi.fn(),
};

describe("SessionManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue(toast);
  });

  it("renders sessions and handles revoke actions", async () => {
    const sessions: api.SessionInfo[] = [
      {
        id: "current",
        userAgent: "Mozilla/5.0 Chrome/120.0.0.0",
        ip: "127.0.0.1",
        createdAt: "2025-01-01T12:00:00.000Z",
        expiresAt: "2025-01-02T12:00:00.000Z",
        revokedAt: null,
        isCurrent: true,
      },
      {
        id: "mobile",
        userAgent: "Mozilla/5.0 iPhone",
        ip: "10.0.0.1",
        createdAt: "invalid-date",
        expiresAt: "2025-01-03T12:00:00.000Z",
        revokedAt: null,
        isCurrent: false,
      },
      {
        id: "tablet",
        userAgent: "Mozilla/5.0 iPad Safari/604.1",
        ip: null,
        createdAt: "2025-01-04T12:00:00.000Z",
        expiresAt: "2025-01-05T12:00:00.000Z",
        revokedAt: null,
        isCurrent: false,
      },
      {
        id: "edge",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Edg/120.0.0.0",
        ip: "10.0.0.2",
        createdAt: "2025-01-06T12:00:00.000Z",
        expiresAt: "2025-01-07T12:00:00.000Z",
        revokedAt: null,
        isCurrent: false,
      },
      {
        id: "unknown",
        userAgent: null,
        ip: null,
        createdAt: "2025-01-08T12:00:00.000Z",
        expiresAt: "2025-01-09T12:00:00.000Z",
        revokedAt: null,
        isCurrent: false,
      },
      {
        id: "revoked",
        userAgent: "Mozilla/5.0 Firefox/118.0",
        ip: "10.0.0.3",
        createdAt: "2025-01-10T12:00:00.000Z",
        expiresAt: "2025-01-11T12:00:00.000Z",
        revokedAt: "2025-01-10T13:00:00.000Z",
        isCurrent: false,
      },
    ];

    vi.mocked(api.listAuthSessions).mockResolvedValue({ sessions });
    vi.mocked(api.revokeAuthSessions).mockResolvedValue({ revoked: 1 });

    render(<SessionManagement />);

    expect(await screen.findByText("Active Sessions")).toBeInTheDocument();
    expect(screen.getByText("Chrome")).toBeInTheDocument();
    expect(screen.getByText("Safari")).toBeInTheDocument();
    expect(screen.getByText("Edge")).toBeInTheDocument();
    expect(screen.getByText("Unknown device")).toBeInTheDocument();
    expect(screen.queryByText("Firefox")).not.toBeInTheDocument();

    const revokeButtons = screen.getAllByRole("button", { name: "Revoke session" });
    fireEvent.click(revokeButtons[0]);

    await waitFor(() =>
      expect(api.revokeAuthSessions).toHaveBeenCalledWith({ sessionId: "mobile" }),
    );
    expect(toast.success).toHaveBeenCalledWith("Session revoked successfully");

    fireEvent.click(screen.getByRole("button", { name: "Revoke All Others" }));
    fireEvent.click(await screen.findByRole("button", { name: "Revoke Others" }));

    await waitFor(() =>
      expect(api.revokeAuthSessions).toHaveBeenCalledWith({ revokeOthers: true }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Revoke All Sessions" }));
    fireEvent.click(await screen.findByRole("button", { name: "Revoke All" }));

    await waitFor(() => expect(api.revokeAuthSessions).toHaveBeenCalledWith({ revokeAll: true }));
  });

  it("shows no active sessions when list is empty", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({ sessions: [] });

    render(<SessionManagement />);

    expect(await screen.findByText("No active sessions")).toBeInTheDocument();
  });

  it("reports errors when sessions fail to load", async () => {
    const error = new Error("Network down");
    vi.mocked(api.listAuthSessions).mockRejectedValue(error);

    render(<SessionManagement />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load sessions");
    });
  });
});
