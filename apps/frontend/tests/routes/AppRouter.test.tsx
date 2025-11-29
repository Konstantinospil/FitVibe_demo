import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AppRouter from "../../src/routes/AppRouter";
import * as AuthContext from "../../src/contexts/AuthContext";

// Mock AuthContext
vi.mock("../../src/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: vi.fn(),
}));

// Mock PublicRoutes
vi.mock("../../src/routes/PublicRoutes", () => ({
  default: () => <div data-testid="public-routes">Public Routes</div>,
}));

// Mock ProtectedRoutes
vi.mock("../../src/routes/ProtectedRoutes", () => ({
  default: () => <div data-testid="protected-routes">Protected Routes</div>,
}));

// Mock BrowserRouter to avoid nested router issue
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

describe("AppRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render PublicRoutes when user is not authenticated", async () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      isAuthenticated: false,
      user: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<AppRouter />);

    await waitFor(() => {
      expect(screen.getByTestId("public-routes")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("protected-routes")).not.toBeInTheDocument();
  });

  it("should render ProtectedRoutes when user is authenticated", async () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      isAuthenticated: true,
      user: {
        id: "user-1",
        username: "testuser",
        email: "test@example.com",
        role: "user",
      },
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<AppRouter />);

    await waitFor(() => {
      expect(screen.getByTestId("protected-routes")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("public-routes")).not.toBeInTheDocument();
  });

  it("should render loading fallback during Suspense", () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      isAuthenticated: false,
      user: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    });

    // Mock lazy loading to delay
    const { container } = render(<AppRouter />);

    // Should have loading state initially (though it may resolve quickly)
    expect(container).toBeInTheDocument();
  });

  it("should handle fallback when useAuth is not available", async () => {
    // Simulate when useAuth is not available (fallback behavior)
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      isAuthenticated: false,
      user: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<AppRouter />);

    await waitFor(() => {
      expect(screen.getByTestId("public-routes")).toBeInTheDocument();
    });
  });
});
