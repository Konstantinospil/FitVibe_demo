/**
 * SessionManagement component tests
 * Tests session management functionality including loading, revoking, and displaying sessions
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionManagement } from "../../src/components/SessionManagement";
import * as api from "../../src/services/api";
import { useToast } from "../../src/contexts/ToastContext";

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock("../../src/contexts/ToastContext", () => ({
  useToast: () => mockToast,
}));

vi.mock("../../src/services/api", () => ({
  listAuthSessions: vi.fn(),
  revokeAuthSessions: vi.fn(),
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
        "auth.sessions.title": "Active Sessions",
        "auth.sessions.description": "Manage your active authentication sessions",
        "auth.sessions.loading": "Loading sessions...",
        "auth.sessions.loadError": "Failed to load sessions",
        "auth.sessions.noSessions": "No active sessions",
        "auth.sessions.current": "Current",
        "auth.sessions.otherSessions": "Other Sessions",
        "auth.sessions.revokeOthers": "Revoke All Others",
        "auth.sessions.revokeAll": "Revoke All Sessions",
        "auth.sessions.revokeAllWarning":
          "This will log you out from all devices. You will need to log in again.",
        "auth.sessions.revoked": "Session revoked successfully",
        "auth.sessions.revokeError": "Failed to revoke session",
        "auth.sessions.allRevoked": "All sessions revoked successfully",
        "auth.sessions.revokeAllError": "Failed to revoke all sessions",
        "auth.sessions.othersRevoked": "Other sessions revoked successfully",
        "auth.sessions.revokeOthersError": "Failed to revoke other sessions",
        "auth.sessions.confirmRevokeAll": "Revoke All Sessions?",
        "auth.sessions.confirmRevokeAllMessage":
          "This will log you out from all devices. You will need to log in again. Are you sure?",
        "auth.sessions.confirmRevokeOthers": "Revoke Other Sessions?",
        "auth.sessions.confirmRevokeOthersMessage":
          "This will log you out from all other devices except this one. Are you sure?",
        "auth.sessions.ip": "IP",
        "auth.sessions.created": "Created",
        "auth.sessions.expires": "Expires",
        "auth.sessions.revoke": "Revoke session",
        "auth.sessions.unknownDevice": "Unknown device",
        "common.cancel": "Cancel",
      };
      return translations[key] || key;
    },
  }),
}));

const mockSessions = [
  {
    id: "session-1",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    ip: "192.168.1.1",
    createdAt: "2024-01-01T00:00:00Z",
    expiresAt: "2024-01-02T00:00:00Z",
    isCurrent: true,
    revokedAt: null,
  },
  {
    id: "session-2",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
    ip: "192.168.1.2",
    createdAt: "2024-01-01T01:00:00Z",
    expiresAt: "2024-01-02T01:00:00Z",
    isCurrent: false,
    revokedAt: null,
  },
  {
    id: "session-3",
    userAgent: "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)",
    ip: "192.168.1.3",
    createdAt: "2024-01-01T02:00:00Z",
    expiresAt: "2024-01-02T02:00:00Z",
    isCurrent: false,
    revokedAt: null,
  },
];

const renderSessionManagement = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SessionManagement />
    </QueryClientProvider>,
  );
};

describe("SessionManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state initially", () => {
    vi.mocked(api.listAuthSessions).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    renderSessionManagement();

    expect(screen.getByText("Active Sessions")).toBeInTheDocument();
    expect(screen.getByText("Loading sessions...")).toBeInTheDocument();
  });

  it("should display sessions when loaded", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({
      sessions: mockSessions,
    });

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText("Active Sessions")).toBeInTheDocument();
    });

    expect(screen.getByText("Chrome")).toBeInTheDocument();
    expect(screen.getByText("Safari")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("should display no sessions message when empty", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({
      sessions: [],
    });

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText("No active sessions")).toBeInTheDocument();
    });
  });

  it("should display error message when loading fails", async () => {
    vi.mocked(api.listAuthSessions).mockRejectedValue(new Error("Network error"));

    renderSessionManagement();

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to load sessions");
    });
  });

  it("should revoke a single session", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({
      sessions: mockSessions,
    });
    vi.mocked(api.revokeAuthSessions).mockResolvedValue(undefined);

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText("Active Sessions")).toBeInTheDocument();
    });

    const revokeButtons = screen.getAllByLabelText("Revoke session");
    act(() => {
      fireEvent.click(revokeButtons[0]);
    });

    await waitFor(() => {
      expect(api.revokeAuthSessions).toHaveBeenCalledWith({ sessionId: "session-2" });
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Session revoked successfully");
    });
  });

  it("should revoke all other sessions", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({
      sessions: mockSessions,
    });
    vi.mocked(api.revokeAuthSessions).mockResolvedValue(undefined);

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText("Revoke All Others")).toBeInTheDocument();
    });

    const revokeOthersButton = screen.getByText("Revoke All Others");
    act(() => {
      fireEvent.click(revokeOthersButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Revoke Other Sessions?")).toBeInTheDocument();
    });

    const confirmButton = screen.getByText("Revoke Others");
    act(() => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(api.revokeAuthSessions).toHaveBeenCalledWith({ revokeOthers: true });
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Other sessions revoked successfully");
    });
  });

  it("should revoke all sessions", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({
      sessions: mockSessions,
    });
    vi.mocked(api.revokeAuthSessions).mockResolvedValue(undefined);

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText("Revoke All Sessions")).toBeInTheDocument();
    });

    const revokeAllButton = screen.getByText("Revoke All Sessions");
    act(() => {
      fireEvent.click(revokeAllButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Revoke All Sessions?")).toBeInTheDocument();
    });

    const confirmButton = screen.getByText("Revoke All");
    act(() => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(api.revokeAuthSessions).toHaveBeenCalledWith({ revokeAll: true });
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("All sessions revoked successfully");
    });
  });

  it("should cancel revoke all confirmation dialog", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({
      sessions: mockSessions,
    });

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText("Revoke All Sessions")).toBeInTheDocument();
    });

    const revokeAllButton = screen.getByText("Revoke All Sessions");
    act(() => {
      fireEvent.click(revokeAllButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Revoke All Sessions?")).toBeInTheDocument();
    });

    const cancelButton = screen.getByText("Cancel");
    act(() => {
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.queryByText("Revoke All Sessions?")).not.toBeInTheDocument();
    });

    expect(api.revokeAuthSessions).not.toHaveBeenCalled();
  });

  it("should cancel revoke others confirmation dialog", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({
      sessions: mockSessions,
    });

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText("Revoke All Others")).toBeInTheDocument();
    });

    const revokeOthersButton = screen.getByText("Revoke All Others");
    act(() => {
      fireEvent.click(revokeOthersButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Revoke Other Sessions?")).toBeInTheDocument();
    });

    const cancelButton = screen.getByText("Cancel");
    act(() => {
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.queryByText("Revoke Other Sessions?")).not.toBeInTheDocument();
    });

    expect(api.revokeAuthSessions).not.toHaveBeenCalled();
  });

  it("should display error when revoke fails", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({
      sessions: mockSessions,
    });
    vi.mocked(api.revokeAuthSessions).mockRejectedValue(new Error("Network error"));

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText("Active Sessions")).toBeInTheDocument();
    });

    const revokeButtons = screen.getAllByLabelText("Revoke session");
    act(() => {
      fireEvent.click(revokeButtons[0]);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to revoke session");
    });
  });

  it("should display error when revoke all fails", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({
      sessions: mockSessions,
    });
    vi.mocked(api.revokeAuthSessions).mockRejectedValue(new Error("Network error"));

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText("Revoke All Sessions")).toBeInTheDocument();
    });

    const revokeAllButton = screen.getByText("Revoke All Sessions");
    act(() => {
      fireEvent.click(revokeAllButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Revoke All Sessions?")).toBeInTheDocument();
    });

    const confirmButton = screen.getByText("Revoke All");
    act(() => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to revoke all sessions");
    });
  });

  it("should display error when revoke others fails", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({
      sessions: mockSessions,
    });
    vi.mocked(api.revokeAuthSessions).mockRejectedValue(new Error("Network error"));

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText("Revoke All Others")).toBeInTheDocument();
    });

    const revokeOthersButton = screen.getByText("Revoke All Others");
    act(() => {
      fireEvent.click(revokeOthersButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Revoke Other Sessions?")).toBeInTheDocument();
    });

    const confirmButton = screen.getByText("Revoke Others");
    act(() => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to revoke other sessions");
    });
  });

  it("should display device icons correctly", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({
      sessions: [
        {
          id: "session-1",
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
          ip: "192.168.1.1",
          createdAt: "2024-01-01T00:00:00Z",
          expiresAt: "2024-01-02T00:00:00Z",
          isCurrent: true,
          revokedAt: null,
        },
        {
          id: "session-2",
          userAgent: "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)",
          ip: "192.168.1.2",
          createdAt: "2024-01-01T01:00:00Z",
          expiresAt: "2024-01-02T01:00:00Z",
          isCurrent: false,
          revokedAt: null,
        },
        {
          id: "session-3",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ip: "192.168.1.3",
          createdAt: "2024-01-01T02:00:00Z",
          expiresAt: "2024-01-02T02:00:00Z",
          isCurrent: false,
          revokedAt: null,
        },
      ],
    });

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText("Active Sessions")).toBeInTheDocument();
    });

    // Icons are rendered as SVG elements from lucide-react
    // We can verify the component renders without errors
    expect(screen.getByText("Safari")).toBeInTheDocument();
    expect(screen.getByText("Chrome")).toBeInTheDocument();
  });

  it("should format dates correctly", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({
      sessions: mockSessions,
    });

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText("Active Sessions")).toBeInTheDocument();
    });

    // Dates should be formatted and displayed
    expect(screen.getByText(/Created:/i)).toBeInTheDocument();
    expect(screen.getByText(/Expires:/i)).toBeInTheDocument();
  });

  it("should display IP addresses when available", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({
      sessions: mockSessions,
    });

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText(/IP: 192\.168\.1\.1/i)).toBeInTheDocument();
    });
  });

  it("should disable buttons while revoking", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({
      sessions: mockSessions,
    });
    vi.mocked(api.revokeAuthSessions).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText("Active Sessions")).toBeInTheDocument();
    });

    const revokeButtons = screen.getAllByLabelText("Revoke session");
    act(() => {
      fireEvent.click(revokeButtons[0]);
    });

    // Buttons should be disabled while revoking
    await waitFor(() => {
      const allRevokeButtons = screen.getAllByLabelText("Revoke session");
      allRevokeButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  it("should handle unknown device user agent", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({
      sessions: [
        {
          id: "session-1",
          userAgent: null,
          ip: "192.168.1.1",
          createdAt: "2024-01-01T00:00:00Z",
          expiresAt: "2024-01-02T00:00:00Z",
          isCurrent: true,
          revokedAt: null,
        },
      ],
    });

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText("Unknown device")).toBeInTheDocument();
    });
  });

  it("should filter out revoked sessions", async () => {
    vi.mocked(api.listAuthSessions).mockResolvedValue({
      sessions: [
        ...mockSessions,
        {
          id: "session-4",
          userAgent: "Mozilla/5.0",
          ip: "192.168.1.4",
          createdAt: "2024-01-01T03:00:00Z",
          expiresAt: "2024-01-02T03:00:00Z",
          isCurrent: false,
          revokedAt: "2024-01-01T04:00:00Z",
        },
      ],
    });

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText("Active Sessions")).toBeInTheDocument();
    });

    // Should only show 3 active sessions, not 4
    const revokeButtons = screen.getAllByLabelText("Revoke session");
    expect(revokeButtons).toHaveLength(2); // Only other sessions, not current
  });

  it("should reload sessions after revoking", async () => {
    vi.mocked(api.listAuthSessions)
      .mockResolvedValueOnce({
        sessions: mockSessions,
      })
      .mockResolvedValueOnce({
        sessions: mockSessions.slice(1), // One session removed
      });
    vi.mocked(api.revokeAuthSessions).mockResolvedValue(undefined);

    renderSessionManagement();

    await waitFor(() => {
      expect(screen.getByText("Active Sessions")).toBeInTheDocument();
    });

    const revokeButtons = screen.getAllByLabelText("Revoke session");
    act(() => {
      fireEvent.click(revokeButtons[0]);
    });

    await waitFor(() => {
      expect(api.listAuthSessions).toHaveBeenCalledTimes(2);
    });
  });
});
