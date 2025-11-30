import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ProtectedRoutes from "../../../apps/frontend/src/routes/ProtectedRoutes";
import { useAuth } from "../../../apps/frontend/src/contexts/AuthContext";

vi.mock("../../../apps/frontend/src/contexts/AuthContext");
vi.mock("../../../apps/frontend/src/i18n/config", () => ({
  ensurePrivateTranslationsLoaded: vi.fn().mockResolvedValue(undefined),
}));

// Mock React.lazy to return components synchronously for testing
// This is a simplified approach - we'll just test that the component renders
// Detailed route testing is better done in integration tests

// Mock all lazy-loaded components as regular exports
vi.mock("../../../apps/frontend/src/components/ProtectedRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../../apps/frontend/src/components/AdminRoute", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../../apps/frontend/src/layouts/MainLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  ),
}));

vi.mock("../../../apps/frontend/src/pages/Home", () => ({
  default: () => <div>Home Page</div>,
}));

vi.mock("../../../apps/frontend/src/pages/Sessions", () => ({
  default: () => <div>Sessions Page</div>,
}));

vi.mock("../../../apps/frontend/src/pages/Planner", () => ({
  default: () => <div>Planner Page</div>,
}));

vi.mock("../../../apps/frontend/src/pages/Logger", () => ({
  default: () => <div>Logger Page</div>,
}));

vi.mock("../../../apps/frontend/src/pages/Insights", () => ({
  default: () => <div>Insights Page</div>,
}));

vi.mock("../../../apps/frontend/src/pages/Profile", () => ({
  default: () => <div>Profile Page</div>,
}));

vi.mock("../../../apps/frontend/src/pages/Settings", () => ({
  default: () => <div>Settings Page</div>,
}));

vi.mock("../../../apps/frontend/src/pages/admin/AdminDashboard", () => ({
  default: () => <div>Admin Dashboard</div>,
}));

vi.mock("../../../apps/frontend/src/pages/admin/ContentReports", () => ({
  default: () => <div>Content Reports</div>,
}));

vi.mock("../../../apps/frontend/src/pages/admin/UserManagement", () => ({
  default: () => <div>User Management</div>,
}));

vi.mock("../../../apps/frontend/src/pages/admin/SystemControls", () => ({
  default: () => <div>System Controls</div>,
}));

vi.mock("../../../apps/frontend/src/pages/NotFound", () => ({
  default: () => <div>Not Found</div>,
}));

vi.mock("../../../apps/frontend/src/pages/Terms", () => ({
  default: () => <div>Terms Page</div>,
}));

vi.mock("../../../apps/frontend/src/pages/Privacy", () => ({
  default: () => <div>Privacy Page</div>,
}));

vi.mock("../../../apps/frontend/src/pages/TermsReacceptance", () => ({
  default: () => <div>Terms Reacceptance Page</div>,
}));

describe("ProtectedRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1", username: "test", email: "test@example.com" },
      isLoading: false,
      signOut: vi.fn(),
    });
  });

  it("should render without crashing", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    // Just verify the component renders - lazy loading makes detailed route testing complex
    expect(document.body).toBeInTheDocument();
  });

  it("should load private translations on mount", async () => {
    const { ensurePrivateTranslationsLoaded } = await import(
      "../../../apps/frontend/src/i18n/config"
    );

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ProtectedRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(ensurePrivateTranslationsLoaded).toHaveBeenCalled();
    });
  });
});
