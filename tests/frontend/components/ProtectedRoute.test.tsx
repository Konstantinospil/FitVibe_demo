import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import { useAuth } from "../../src/contexts/AuthContext";

vi.mock("../../src/contexts/AuthContext");

const PlaceholderOutlet: React.FC = () => <div data-testid="outlet-content">Protected content</div>;

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows loading state when isInitializing is true", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isInitializing: true,
      user: null,
      isLoading: true,
      signOut: vi.fn(),
    } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<PlaceholderOutlet />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByTestId("outlet-content")).not.toBeInTheDocument();
  });

  it("redirects to /login when not authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isInitializing: false,
      user: null,
      isLoading: false,
      signOut: vi.fn(),
    } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute />}>
            <Route index element={<PlaceholderOutlet />} />
          </Route>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.queryByTestId("outlet-content")).not.toBeInTheDocument();
  });

  it("renders Outlet when authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isInitializing: false,
      user: { id: "1", username: "user", email: "u@example.com" },
      isLoading: false,
      signOut: vi.fn(),
    } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<PlaceholderOutlet />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("outlet-content")).toBeInTheDocument();
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
