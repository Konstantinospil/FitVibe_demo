import React from "react";
import { MemoryRouter, Outlet } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import ProtectedRoutes from "../../src/routes/ProtectedRoutes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockEnsureTranslations = vi.fn();

vi.mock("../../src/i18n/config", () => ({
  ensurePrivateTranslationsLoaded: (): void => {
    mockEnsureTranslations();
  },
}));

const createMockComponent =
  (label: string): React.FC =>
  () => <div>{label}</div>;

vi.mock("../../src/components/ProtectedRoute", () => ({
  default: () => (
    <div data-testid="protected-route">
      <Outlet />
    </div>
  ),
}));

vi.mock("../../src/components/AdminRoute", () => ({
  default: () => (
    <div data-testid="admin-route">
      <Outlet />
    </div>
  ),
}));

vi.mock("../../src/layouts/MainLayout", () => ({
  default: () => (
    <div data-testid="main-layout">
      <Outlet />
    </div>
  ),
}));

vi.mock("../../src/pages/Home", () => ({ default: createMockComponent("Home Page") }));
vi.mock("../../src/pages/Sessions", () => ({ default: createMockComponent("Sessions Page") }));
vi.mock("../../src/pages/Planner", () => ({ default: createMockComponent("Planner Page") }));
vi.mock("../../src/pages/Logger", () => ({ default: createMockComponent("Logger Page") }));
vi.mock("../../src/pages/Insights", () => ({ default: createMockComponent("Insights Page") }));
vi.mock("../../src/pages/Profile", () => ({ default: createMockComponent("Profile Page") }));
vi.mock("../../src/pages/Settings", () => ({ default: createMockComponent("Settings Page") }));
vi.mock("../../src/pages/admin/AdminDashboard", () => ({
  default: createMockComponent("Admin Dashboard"),
}));
vi.mock("../../src/pages/admin/ContentReports", () => ({
  default: createMockComponent("Content Reports"),
}));
vi.mock("../../src/pages/admin/UserManagement", () => ({
  default: createMockComponent("User Management"),
}));
vi.mock("../../src/pages/admin/SystemControls", () => ({
  default: createMockComponent("System Controls"),
}));
vi.mock("../../src/pages/NotFound", () => ({ default: createMockComponent("Not Found") }));

const renderWithRouter = (initialPath = "/") => {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <ProtectedRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("ProtectedRoutes", () => {
  beforeEach(() => {
    mockEnsureTranslations.mockClear();
  });

  it("renders nested protected content and loads translations", async () => {
    renderWithRouter("/sessions");

    await waitFor(() => {
      expect(screen.getByText("Sessions Page")).toBeInTheDocument();
    });

    expect(mockEnsureTranslations).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("protected-route")).toBeInTheDocument();
    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("redirects /login requests back to the home route", async () => {
    renderWithRouter("/login");

    await waitFor(() => {
      expect(screen.getByText("Home Page")).toBeInTheDocument();
    });
  });
});
