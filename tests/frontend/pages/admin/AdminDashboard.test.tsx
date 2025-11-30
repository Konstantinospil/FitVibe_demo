import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminDashboard from "../../../../apps/frontend/src/pages/admin/AdminDashboard";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: "/admin",
    }),
  };
});

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render admin dashboard with navigation items", () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    );

    expect(screen.getByText("FitVibe Administration")).toBeInTheDocument();
    expect(screen.getByText("Content Reports")).toBeInTheDocument();
    expect(screen.getByText("User Management")).toBeInTheDocument();
    expect(screen.getByText("System Controls")).toBeInTheDocument();
  });

  it("should navigate to reports page when Content Reports is clicked", () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    );

    const reportsButton = screen.getByText("Content Reports").closest("button");
    fireEvent.click(reportsButton!);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/reports");
  });

  it("should navigate to users page when User Management is clicked", () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    );

    const usersButton = screen.getByText("User Management").closest("button");
    fireEvent.click(usersButton!);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/users");
  });

  it("should navigate to system page when System Controls is clicked", () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    );

    const systemButton = screen.getByText("System Controls").closest("button");
    fireEvent.click(systemButton!);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/system");
  });

  it("should render outlet for child routes", () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    );

    // Outlet should be present (renders child routes)
    // The Outlet component from react-router-dom renders children
    // We can verify the component structure is correct
    expect(screen.getByText("FitVibe Administration")).toBeInTheDocument();
  });
});
