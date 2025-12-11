import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminRoute from "../../src/components/AdminRoute";
import { useAuthStore } from "../../src/store/auth.store";

// Mock auth store
vi.mock("../../src/store/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

// Mock child components
vi.mock("../../src/components/PageIntro", () => ({
  default: ({ children, title, description }: any) => (
    <div data-testid="page-intro">
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
}));

vi.mock("../../src/components/ui/Card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, style }: any) => (
    <div data-testid="card-title" style={style}>
      {children}
    </div>
  ),
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
}));

const AdminChild = () => <div>Admin Dashboard</div>;

const renderAdminRoute = () => {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/admin" element={<AdminRoute />}>
          <Route index element={<AdminChild />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};

describe("AdminRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to login when not authenticated", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      user: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    });

    renderAdminRoute();

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
  });

  it("shows access denied page when authenticated but not admin", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      user: {
        id: "123",
        username: "athlete",
        email: "athlete@example.com",
        role: "athlete",
        isVerified: true,
        createdAt: new Date().toISOString(),
      },
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    });

    renderAdminRoute();

    expect(screen.getByText("Administrator Access Required")).toBeInTheDocument();
    expect(screen.getByText("You do not have permission to access this area")).toBeInTheDocument();
    expect(screen.getByText("Unauthorized Access")).toBeInTheDocument();
    expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
  });

  it("displays access denied card with security message", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      user: {
        id: "123",
        username: "coach",
        email: "coach@example.com",
        role: "coach",
        isVerified: true,
        createdAt: new Date().toISOString(),
      },
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    });

    renderAdminRoute();

    expect(
      screen.getByText("You need administrator privileges to access the admin dashboard."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "If you believe you should have access, please contact your system administrator.",
      ),
    ).toBeInTheDocument();
  });

  it("renders admin content when authenticated as admin", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      user: {
        id: "123",
        username: "admin",
        email: "admin@example.com",
        role: "admin",
        isVerified: true,
        createdAt: new Date().toISOString(),
      },
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    });

    renderAdminRoute();

    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Administrator Access Required")).not.toBeInTheDocument();
  });

  it("uses PageIntro component for access denied page", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      user: {
        id: "123",
        username: "athlete",
        email: "athlete@example.com",
        role: "athlete",
        isVerified: true,
        createdAt: new Date().toISOString(),
      },
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
    });

    renderAdminRoute();

    expect(screen.getByTestId("page-intro")).toBeInTheDocument();
    expect(screen.getByTestId("card")).toBeInTheDocument();
  });
});
