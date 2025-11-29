import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import MainLayout from "../../src/layouts/MainLayout";
import { useAuth } from "../../src/contexts/AuthContext";

vi.mock("../../src/contexts/AuthContext");
vi.mock("../../src/components/ThemeToggle", () => ({
  default: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));
vi.mock("../../src/components/LanguageSwitcher", () => ({
  default: () => <div data-testid="language-switcher">LanguageSwitcher</div>,
}));
vi.mock("../../src/assets/logo_full.ico", () => ({
  default: "logo.png",
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "navigation.home": "Home",
        "navigation.profile": "Profile",
        "navigation.skipToContent": "Skip to content",
        "navigation.you": "You",
        "navigation.activeSession": "Active session",
        "navigation.signOut": "Sign out",
        "footer.note": "FitVibe",
        "footer.terms": "Terms",
        "footer.privacy": "Privacy",
      };
      return translations[key] || key;
    },
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe("MainLayout", () => {
  const mockSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { id: "user-1", username: "test", email: "test@test.com", role: "user" },
      signIn: vi.fn(),
      signOut: mockSignOut,
      updateUser: vi.fn(),
    });
  });

  it("should render navigation header", () => {
    render(<MainLayout />, { wrapper });

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("should render theme toggle and language switcher", () => {
    render(<MainLayout />, { wrapper });

    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  it("should render footer", () => {
    render(<MainLayout />, { wrapper });

    expect(screen.getByText("FitVibe")).toBeInTheDocument();
    expect(screen.getByText("Terms")).toBeInTheDocument();
    expect(screen.getByText("Privacy")).toBeInTheDocument();
  });

  it("should call signOut when sign out button is clicked", async () => {
    const user = userEvent.setup();
    render(<MainLayout />, { wrapper });

    const signOutButton = screen.getByRole("button", { name: /sign out/i });
    await user.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("should navigate to home when logo is clicked", async () => {
    const user = userEvent.setup();
    render(<MainLayout />, { wrapper });

    const logoLink = screen.getByRole("link", { name: /fitvibe/i });
    await user.click(logoLink);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("should render skip to content link", () => {
    render(<MainLayout />, { wrapper });

    const skipLink = screen.getByText("Skip to content");
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  it("should render main content area", () => {
    render(
      <MainLayout>
        <div data-testid="main-content">Main Content</div>
      </MainLayout>,
      { wrapper },
    );

    expect(screen.getByTestId("main-content")).toBeInTheDocument();
  });
});
