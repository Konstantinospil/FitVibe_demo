import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import UserManagement from "../../../../apps/frontend/src/pages/admin/UserManagement";
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

describe("UserManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue(mockToast);
  });

  const mockUser: api.UserRecord = {
    id: "user-1",
    username: "testuser",
    email: "test@example.com",
    roleCode: "user",
    status: "active",
    createdAt: "2025-01-01T00:00:00Z",
    lastLoginAt: "2025-01-15T00:00:00Z",
    sessionCount: 10,
    reportCount: 0,
  };

  it("should render user management page", () => {
    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    expect(screen.getByText("User Management")).toBeInTheDocument();
    expect(screen.getByText("Search and manage user accounts and permissions")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search by email, username, or ID...")).toBeInTheDocument();
  });

  it("should search users when search button is clicked", async () => {
    vi.mocked(api.searchUsers).mockResolvedValue({
      data: [mockUser],
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search by email, username, or ID...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    const searchButton = screen.getByText("Search");
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(api.searchUsers).toHaveBeenCalledWith({ q: "test" });
      expect(screen.getByText("@testuser")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });

  it("should search users when Enter key is pressed", async () => {
    vi.mocked(api.searchUsers).mockResolvedValue({
      data: [mockUser],
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search by email, username, or ID...");
    fireEvent.change(searchInput, { target: { value: "test" } });
    fireEvent.keyDown(searchInput, { key: "Enter" });

    await waitFor(() => {
      expect(api.searchUsers).toHaveBeenCalledWith({ q: "test" });
    });
  });

  it("should not search with empty query", async () => {
    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const searchButton = screen.getByRole("button", { name: /search/i });
    expect(searchButton).toBeDisabled();

    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(api.searchUsers).not.toHaveBeenCalled();
    });
  });

  it("should show loading state while searching", async () => {
    vi.mocked(api.searchUsers).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search by email, username, or ID...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    const searchButton = screen.getByText("Search");
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Searching...")).toBeInTheDocument();
    });
  });

  it("should show error message when search fails", async () => {
    vi.mocked(api.searchUsers).mockRejectedValue(new Error("Search failed"));

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search by email, username, or ID...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    const searchButton = screen.getByText("Search");
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to search users. Please try again.")).toBeInTheDocument();
    });
  });

  it("should show empty state when no users found", async () => {
    vi.mocked(api.searchUsers).mockResolvedValue({
      data: [],
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search by email, username, or ID...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    const searchButton = screen.getByText("Search");
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("No users found")).toBeInTheDocument();
      expect(
        screen.getByText("No users match your search criteria. Try a different query."),
      ).toBeInTheDocument();
    });
  });

  it("should display user information", async () => {
    vi.mocked(api.searchUsers).mockResolvedValue({
      data: [mockUser],
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search by email, username, or ID...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    const searchButton = screen.getByText("Search");
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("@testuser")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument(); // sessionCount
      expect(screen.getByText("0")).toBeInTheDocument(); // reportCount
    });
  });

  it("should show suspend and ban buttons for active users", async () => {
    vi.mocked(api.searchUsers).mockResolvedValue({
      data: [mockUser],
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search by email, username, or ID...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    const searchButton = screen.getByText("Search");
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Suspend")).toBeInTheDocument();
      expect(screen.getByText("Ban")).toBeInTheDocument();
    });
  });

  it("should show activate button for non-active users", async () => {
    const suspendedUser = { ...mockUser, status: "suspended" as const };
    vi.mocked(api.searchUsers).mockResolvedValue({
      data: [suspendedUser],
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search by email, username, or ID...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    const searchButton = screen.getByText("Search");
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Activate")).toBeInTheDocument();
      expect(screen.queryByText("Suspend")).not.toBeInTheDocument();
      expect(screen.queryByText("Ban")).not.toBeInTheDocument();
    });
  });

  it("should open confirmation dialog when suspending user", async () => {
    vi.mocked(api.searchUsers).mockResolvedValue({
      data: [mockUser],
    });
    vi.mocked(api.suspendUser).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search by email, username, or ID...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    const searchButton = screen.getByText("Search");
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Suspend")).toBeInTheDocument();
    });

    const suspendButton = screen.getByText("Suspend");
    fireEvent.click(suspendButton);

    await waitFor(() => {
      expect(screen.getByText("Suspend User")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Are you sure you want to suspend this user? They will not be able to access their account.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("should suspend user when confirmed", async () => {
    vi.mocked(api.searchUsers)
      .mockResolvedValueOnce({
        data: [mockUser],
      })
      .mockResolvedValueOnce({
        data: [],
      });
    vi.mocked(api.suspendUser).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search by email, username, or ID...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    const searchButton = screen.getByText("Search");
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Suspend")).toBeInTheDocument();
    });

    const suspendButton = screen.getByText("Suspend");
    fireEvent.click(suspendButton);

    await waitFor(() => {
      expect(screen.getByText("Yes, Suspend User")).toBeInTheDocument();
    });

    const confirmButton = screen.getByText("Yes, Suspend User");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.suspendUser).toHaveBeenCalledWith("user-1");
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("User suspended successfully");
    });
  });

  it("should ban user when confirmed", async () => {
    vi.mocked(api.searchUsers)
      .mockResolvedValueOnce({
        data: [mockUser],
      })
      .mockResolvedValueOnce({
        data: [],
      });
    vi.mocked(api.banUser).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search by email, username, or ID...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    const searchButton = screen.getByText("Search");
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Ban")).toBeInTheDocument();
    });

    const banButton = screen.getByText("Ban");
    fireEvent.click(banButton);

    await waitFor(() => {
      expect(screen.getByText("Yes, Ban User")).toBeInTheDocument();
    });

    const confirmButton = screen.getByText("Yes, Ban User");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.banUser).toHaveBeenCalledWith("user-1");
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("User banned successfully");
    });
  });

  it("should activate user when confirmed", async () => {
    const suspendedUser = { ...mockUser, status: "suspended" as const };
    vi.mocked(api.searchUsers)
      .mockResolvedValueOnce({
        data: [suspendedUser],
      })
      .mockResolvedValueOnce({
        data: [],
      });
    vi.mocked(api.activateUser).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search by email, username, or ID...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    const searchButton = screen.getByText("Search");
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Activate")).toBeInTheDocument();
    });

    const activateButton = screen.getByText("Activate");
    fireEvent.click(activateButton);

    await waitFor(() => {
      expect(screen.getByText("Yes, Activate User")).toBeInTheDocument();
    });

    const confirmButton = screen.getByText("Yes, Activate User");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.activateUser).toHaveBeenCalledWith("user-1");
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("User activated successfully");
    });
  });

  it("should delete user when confirmed", async () => {
    vi.mocked(api.searchUsers)
      .mockResolvedValueOnce({
        data: [mockUser],
      })
      .mockResolvedValueOnce({
        data: [],
      });
    vi.mocked(api.deleteUser).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search by email, username, or ID...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    const searchButton = screen.getByText("Search");
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("Yes, Delete User")).toBeInTheDocument();
    });

    const confirmButton = screen.getByText("Yes, Delete User");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.deleteUser).toHaveBeenCalledWith("user-1");
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("User deleted successfully");
    });
  });

  it("should show error when user action fails", async () => {
    vi.mocked(api.searchUsers).mockResolvedValue({
      data: [mockUser],
    });
    vi.mocked(api.suspendUser).mockRejectedValue(new Error("Action failed"));

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search by email, username, or ID...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    const searchButton = screen.getByText("Search");
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Suspend")).toBeInTheDocument();
    });

    const suspendButton = screen.getByText("Suspend");
    fireEvent.click(suspendButton);

    await waitFor(() => {
      expect(screen.getByText("Yes, Suspend User")).toBeInTheDocument();
    });

    const confirmButton = screen.getByText("Yes, Suspend User");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to suspend user. Please try again.");
    });
  });

  it("should cancel confirmation dialog", async () => {
    vi.mocked(api.searchUsers).mockResolvedValue({
      data: [mockUser],
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("Search by email, username, or ID...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    const searchButton = screen.getByText("Search");
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Suspend")).toBeInTheDocument();
    });

    const suspendButton = screen.getByText("Suspend");
    fireEvent.click(suspendButton);

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText("Suspend User")).not.toBeInTheDocument();
    });

    expect(api.suspendUser).not.toHaveBeenCalled();
  });
});
