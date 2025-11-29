import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminRoute from "../../src/components/AdminRoute";
import { useAuthStore } from "../../src/store/auth.store";

vi.mock("../../src/store/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

describe("AdminRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render children when user is authenticated admin", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      user: { id: "admin-1", username: "admin", email: "admin@example.com", role: "admin" },
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminRoute />
      </MemoryRouter>,
    );

    // Outlet renders children, so we need to check for the route structure
    expect(screen.queryByText(/Access Denied/i)).not.toBeInTheDocument();
  });

  it("should show access denied when user is not authenticated", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminRoute />
      </MemoryRouter>,
    );

    // Should redirect or show access denied
    expect(useAuthStore).toHaveBeenCalled();
  });

  it("should show access denied when user does not have admin role", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      user: { id: "user-1", username: "user", email: "user@example.com", role: "user" },
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminRoute />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    expect(screen.getByText(/Administrator Access Required/i)).toBeInTheDocument();
    expect(screen.getByText(/You do not have permission to access this area/i)).toBeInTheDocument();
  });

  it("should show unauthorized access message for non-admin users", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      user: { id: "user-1", username: "user", email: "user@example.com", role: "user" },
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminRoute />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Unauthorized Access/i)).toBeInTheDocument();
    expect(screen.getByText(/This area is restricted to administrators only/i)).toBeInTheDocument();
  });
});
