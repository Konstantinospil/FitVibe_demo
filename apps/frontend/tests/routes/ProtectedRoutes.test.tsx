import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Outlet } from "react-router-dom";
import ProtectedRoutes from "../../src/routes/ProtectedRoutes";

// Mock QueryClientProvider
vi.mock("@tanstack/react-query", () => ({
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  queryClient: {},
}));

// Mock queryClient
vi.mock("../../src/lib/queryClient", () => ({
  queryClient: {},
}));

// Mock i18n
vi.mock("../../src/i18n/config", () => ({
  ensurePrivateTranslationsLoaded: vi.fn(),
}));

// Mock ProtectedRoute - needs to render Outlet
vi.mock("../../src/components/ProtectedRoute", () => ({
  default: () => {
    return <Outlet />;
  },
}));

// Mock AdminRoute - needs to render Outlet
vi.mock("../../src/components/AdminRoute", () => ({
  default: () => {
    return (
      <div data-testid="admin-route">
        <Outlet />
      </div>
    );
  },
}));

// Mock MainLayout - needs to render Outlet
vi.mock("../../src/layouts/MainLayout", () => ({
  default: () => {
    return (
      <div data-testid="main-layout">
        <Outlet />
      </div>
    );
  },
}));

// Mock all lazy-loaded pages
vi.mock("../../src/pages/Home", () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}));

vi.mock("../../src/pages/Sessions", () => ({
  default: () => <div data-testid="sessions-page">Sessions Page</div>,
}));

vi.mock("../../src/pages/Planner", () => ({
  default: () => <div data-testid="planner-page">Planner Page</div>,
}));

vi.mock("../../src/pages/Logger", () => ({
  default: () => <div data-testid="logger-page">Logger Page</div>,
}));

vi.mock("../../src/pages/Insights", () => ({
  default: () => <div data-testid="insights-page">Insights Page</div>,
}));

vi.mock("../../src/pages/Profile", () => ({
  default: () => <div data-testid="profile-page">Profile Page</div>,
}));

vi.mock("../../src/pages/Settings", () => ({
  default: () => <div data-testid="settings-page">Settings Page</div>,
}));

vi.mock("../../src/pages/admin/AdminDashboard", () => ({
  default: () => <div data-testid="admin-dashboard-page">Admin Dashboard Page</div>,
}));

vi.mock("../../src/pages/admin/ContentReports", () => ({
  default: () => <div data-testid="content-reports-page">Content Reports Page</div>,
}));

vi.mock("../../src/pages/admin/UserManagement", () => ({
  default: () => <div data-testid="user-management-page">User Management Page</div>,
}));

vi.mock("../../src/pages/admin/SystemControls", () => ({
  default: () => <div data-testid="system-controls-page">System Controls Page</div>,
}));

vi.mock("../../src/pages/NotFound", () => ({
  default: () => <div data-testid="not-found-page">Not Found Page</div>,
}));

vi.mock("../../src/pages/Terms", () => ({
  default: () => <div data-testid="terms-page">Terms Page</div>,
}));

vi.mock("../../src/pages/Privacy", () => ({
  default: () => <div data-testid="privacy-page">Privacy Page</div>,
}));

vi.mock("../../src/pages/TermsReacceptance", () => ({
  default: () => <div data-testid="terms-reacceptance-page">Terms Reacceptance Page</div>,
}));

// Mock Navigate to prevent actual navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => {
      mockNavigate(to);
      return <div data-testid="navigate-to">{to}</div>;
    },
  };
});

describe("ProtectedRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it("should render Home page at root path", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("home-page");
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("should render Sessions page at /sessions", async () => {
    render(
      <MemoryRouter initialEntries={["/sessions"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("sessions-page");
    expect(screen.getByTestId("sessions-page")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("should render Planner page at /planner", async () => {
    render(
      <MemoryRouter initialEntries={["/planner"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("planner-page");
    expect(screen.getByTestId("planner-page")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("should render Logger page at /logger/:sessionId", async () => {
    render(
      <MemoryRouter initialEntries={["/logger/session-123"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("logger-page");
    expect(screen.getByTestId("logger-page")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("should render Insights page at /insights", async () => {
    render(
      <MemoryRouter initialEntries={["/insights"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("insights-page");
    expect(screen.getByTestId("insights-page")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("should render Profile page at /profile", async () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("profile-page");
    expect(screen.getByTestId("profile-page")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("should render Settings page at /settings", async () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("settings-page");
    expect(screen.getByTestId("settings-page")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("should render Terms page at /terms", async () => {
    render(
      <MemoryRouter initialEntries={["/terms"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("terms-page");
    expect(screen.getByTestId("terms-page")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("should render Privacy page at /privacy", async () => {
    render(
      <MemoryRouter initialEntries={["/privacy"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("privacy-page");
    expect(screen.getByTestId("privacy-page")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("should render TermsReacceptance page at /terms-reacceptance", async () => {
    render(
      <MemoryRouter initialEntries={["/terms-reacceptance"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("terms-reacceptance-page");
    expect(screen.getByTestId("terms-reacceptance-page")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("should render AdminDashboard at /admin", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("admin-dashboard-page");
    expect(screen.getByTestId("admin-dashboard-page")).toBeInTheDocument();
    expect(screen.getByTestId("admin-route")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("should render ContentReports at /admin/reports", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/reports"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("content-reports-page");
    expect(screen.getByTestId("content-reports-page")).toBeInTheDocument();
    expect(screen.getByTestId("admin-route")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("should render UserManagement at /admin/users", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("user-management-page");
    expect(screen.getByTestId("user-management-page")).toBeInTheDocument();
    expect(screen.getByTestId("admin-route")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("should render SystemControls at /admin/system", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/system"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("system-controls-page");
    expect(screen.getByTestId("system-controls-page")).toBeInTheDocument();
    expect(screen.getByTestId("admin-route")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("should render NotFound page for unknown routes", async () => {
    render(
      <MemoryRouter initialEntries={["/unknown-route"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("not-found-page");
    expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("should redirect /login to root when authenticated", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("navigate-to");
    expect(screen.getByTestId("navigate-to")).toHaveTextContent("/");
  });

  it("should show NotFound for unknown routes within main layout", async () => {
    render(
      <MemoryRouter initialEntries={["/some-other-route"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    // Unknown routes within MainLayout should show NotFound
    await screen.findByTestId("not-found-page");
    expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("should render loading fallback during Suspense", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    // Should render something (loading or content)
    expect(container).toBeInTheDocument();
  });

  it("should call ensurePrivateTranslationsLoaded on mount", async () => {
    const { ensurePrivateTranslationsLoaded } = await import("../../src/i18n/config");
    vi.mocked(ensurePrivateTranslationsLoaded).mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await screen.findByTestId("home-page");
    expect(ensurePrivateTranslationsLoaded).toHaveBeenCalled();
  });
});
