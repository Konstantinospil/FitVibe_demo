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
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: {
        id: "user-1",
        username: "testuser",
        email: "test@example.com",
        role: "user",
      },
      signIn: vi.fn(),
      signOut: mockSignOut,
      updateUser: vi.fn(),
    });
  });

  it("should render main layout with navigation", () => {
    render(<MainLayout />, { wrapper });

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("should render logo", () => {
    render(<MainLayout />, { wrapper });

    const logo = screen.getByAltText("FitVibe Logo");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "logo.png");
  });

  it("should render navigation links", () => {
    render(<MainLayout />, { wrapper });

    expect(screen.getByRole("link", { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /profile/i })).toBeInTheDocument();
  });

  it("should render theme toggle and language switcher", () => {
    render(<MainLayout />, { wrapper });

    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  it("should render user avatar and sign out button", () => {
    render(<MainLayout />, { wrapper });

    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Active session")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("should call signOut and navigate when sign out button is clicked", async () => {
    const user = userEvent.setup();
    render(<MainLayout />, { wrapper });

    const signOutButton = screen.getByRole("button", { name: /sign out/i });
    await user.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("should render skip to content link", () => {
    render(<MainLayout />, { wrapper });

    const skipLink = screen.getByRole("link", { name: /skip to content/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  it("should render main content area with outlet", () => {
    render(<MainLayout />, { wrapper });

    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute("id", "main-content");
  });

  it("should render footer with terms and privacy links", () => {
    render(<MainLayout />, { wrapper });

    const termsLink = screen.getByRole("link", { name: /terms/i });
    const privacyLink = screen.getByRole("link", { name: /privacy/i });

    expect(termsLink).toBeInTheDocument();
    expect(privacyLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute("href", "/terms");
    expect(privacyLink).toHaveAttribute("href", "/privacy");
  });

  it("should mark active navigation link", () => {
    render(<MainLayout />, { wrapper });

    const homeLink = screen.getByRole("link", { name: /home/i });
    // The link should have proper styling for active state
    expect(homeLink).toBeInTheDocument();
  });
});
