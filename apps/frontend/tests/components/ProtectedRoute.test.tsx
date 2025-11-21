import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import * as AuthContext from "../../src/contexts/AuthContext";
import type { User } from "../../src/store/auth.store";

vi.mock("../../src/contexts/AuthContext");

const mockUseAuth = vi.mocked(AuthContext.useAuth);

const mockUser: User = {
  id: "user-123",
  username: "testuser",
  email: "test@example.com",
  role: "athlete",
};

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render children when user is authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: mockUser,
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("should redirect to login when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("should pass location state when redirecting to login", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    });

    const LoginPage = () => {
      return <div>Login Page</div>;
    };

    render(
      <MemoryRouter initialEntries={["/protected/resource"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected/resource" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("should allow access to nested routes when authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: mockUser,
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/protected/nested/route"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected/nested/route" element={<div>Nested Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Nested Protected Content")).toBeInTheDocument();
  });

  it("should prevent access to nested routes when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/protected/nested/route"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected/nested/route" element={<div>Nested Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Nested Protected Content")).not.toBeInTheDocument();
  });
});
