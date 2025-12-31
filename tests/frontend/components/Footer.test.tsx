import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Footer from "../../src/components/Footer";
import { useThemeStore } from "../../src/store/theme.store";

vi.mock("../../src/assets/logo_full.png", () => ({
  default: "logo-light.png",
}));
vi.mock("../../src/assets/logo_full_dark.png", () => ({
  default: "logo-dark.png",
}));

vi.mock("../../src/store/theme.store", () => ({
  useThemeStore: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      const translations: Record<string, string> = {
        "footer.navigationLabel": "Footer navigation",
        "footer.brand": "FitVibe",
        "footer.impressum": "Impressum",
        "footer.impressumAriaLabel": "Impressum",
        "footer.terms": "Terms",
        "footer.termsAriaLabel": "Terms",
        "footer.privacy": "Privacy",
        "footer.privacyAriaLabel": "Privacy",
        "footer.cookie": "Cookies",
        "footer.cookieAriaLabel": "Cookies",
        "footer.contact": "Contact",
        "footer.contactAriaLabel": "Contact",
      };
      return translations[key] || options?.defaultValue || key;
    },
  }),
}));

describe("Footer", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders footer links and logo", () => {
    vi.mocked(useThemeStore).mockImplementation((selector: any) => selector({ theme: "light" }));

    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation", { name: "Footer navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toBeInTheDocument();
    expect(screen.getByAltText("FitVibe")).toHaveAttribute("src", "logo-light.png");
  });

  it("switches logo based on theme", () => {
    vi.mocked(useThemeStore).mockImplementation((selector: any) => selector({ theme: "dark" }));

    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByAltText("FitVibe")).toHaveAttribute("src", "logo-dark.png");
  });

  it("updates link and icon styles on hover and focus", () => {
    vi.mocked(useThemeStore).mockImplementation((selector: any) => selector({ theme: "light" }));

    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Terms" });
    const icon = link.querySelector("svg");
    expect(icon).toBeTruthy();

    fireEvent.mouseEnter(link);
    expect(link).toHaveStyle({ color: "var(--color-link-form-hover)" });
    expect(icon).toHaveStyle({ color: "var(--color-link-form-hover)" });

    fireEvent.mouseLeave(link);
    expect(link).toHaveStyle({ color: "var(--color-link-form)" });
    expect(icon).toHaveStyle({ color: "var(--color-link-form)" });

    fireEvent.focus(link);
    expect(link).toHaveStyle({ color: "var(--element-fire-base)" });
    expect(icon).toHaveStyle({ color: "var(--element-fire-base)" });

    fireEvent.blur(link);
    expect(link).toHaveStyle({ color: "var(--color-text-muted)" });
    expect(icon).toHaveStyle({ color: "var(--color-text-muted)" });
  });
});
