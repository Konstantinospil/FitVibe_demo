/**
 * Footer component tests
 * Tests the Footer component with all interactive elements and accessibility features
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { Footer } from "../../src/components/Footer";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      const translations: Record<string, string> = {
        "footer.brand": "FitVibe",
        "footer.navigationLabel": "Footer navigation",
        "footer.terms": "Terms and Conditions",
        "footer.privacy": "Privacy Policy",
        "footer.termsAriaLabel": "View Terms and Conditions",
        "footer.privacyAriaLabel": "View Privacy Policy",
      };
      return translations[key] || options?.defaultValue || key;
    },
  }),
}));

const renderFooter = () => {
  return render(
    <BrowserRouter>
      <Footer />
    </BrowserRouter>,
  );
};

describe("Footer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render footer with brand name", () => {
    renderFooter();

    expect(screen.getByText("FitVibe")).toBeInTheDocument();
  });

  it("should render footer with semantic HTML", () => {
    renderFooter();

    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
    expect(footer.tagName).toBe("FOOTER");
  });

  it("should render navigation with proper aria-label", () => {
    renderFooter();

    const nav = screen.getByLabelText("Footer navigation");
    expect(nav).toBeInTheDocument();
  });

  it("should render Terms and Conditions link", () => {
    renderFooter();

    const termsLink = screen.getByRole("link", { name: /terms and conditions/i });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute("href", "/terms");
    expect(termsLink).toHaveAttribute("aria-label", "View Terms and Conditions");
  });

  it("should render Privacy Policy link", () => {
    renderFooter();

    const privacyLink = screen.getByRole("link", { name: /privacy policy/i });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute("href", "/privacy");
    expect(privacyLink).toHaveAttribute("aria-label", "View Privacy Policy");
  });

  it("should apply hover styles to Terms link on mouse enter", () => {
    renderFooter();

    const termsLink = screen.getByRole("link", { name: /terms and conditions/i });

    fireEvent.mouseEnter(termsLink);

    expect(termsLink).toHaveStyle({
      color: "var(--color-text-secondary)",
      textDecoration: "underline",
    });
  });

  it("should remove hover styles from Terms link on mouse leave", () => {
    renderFooter();

    const termsLink = screen.getByRole("link", { name: /terms and conditions/i });

    fireEvent.mouseEnter(termsLink);
    fireEvent.mouseLeave(termsLink);

    expect(termsLink).toHaveStyle({
      color: "var(--color-text-muted)",
      textDecoration: "none",
    });
  });

  it("should apply focus styles to Terms link on focus", () => {
    renderFooter();

    const termsLink = screen.getByRole("link", { name: /terms and conditions/i });

    fireEvent.focus(termsLink);

    expect(termsLink).toHaveStyle({
      color: "var(--color-text-secondary)",
      textDecoration: "underline",
    });
  });

  it("should remove focus styles from Terms link on blur", () => {
    renderFooter();

    const termsLink = screen.getByRole("link", { name: /terms and conditions/i });

    fireEvent.focus(termsLink);
    fireEvent.blur(termsLink);

    expect(termsLink).toHaveStyle({
      color: "var(--color-text-muted)",
      textDecoration: "none",
    });
  });

  it("should apply hover styles to Privacy link on mouse enter", () => {
    renderFooter();

    const privacyLink = screen.getByRole("link", { name: /privacy policy/i });

    fireEvent.mouseEnter(privacyLink);

    expect(privacyLink).toHaveStyle({
      color: "var(--color-text-secondary)",
      textDecoration: "underline",
    });
  });

  it("should remove hover styles from Privacy link on mouse leave", () => {
    renderFooter();

    const privacyLink = screen.getByRole("link", { name: /privacy policy/i });

    fireEvent.mouseEnter(privacyLink);
    fireEvent.mouseLeave(privacyLink);

    expect(privacyLink).toHaveStyle({
      color: "var(--color-text-muted)",
      textDecoration: "none",
    });
  });

  it("should apply focus styles to Privacy link on focus", () => {
    renderFooter();

    const privacyLink = screen.getByRole("link", { name: /privacy policy/i });

    fireEvent.focus(privacyLink);

    expect(privacyLink).toHaveStyle({
      color: "var(--color-text-secondary)",
      textDecoration: "underline",
    });
  });

  it("should remove focus styles from Privacy link on blur", () => {
    renderFooter();

    const privacyLink = screen.getByRole("link", { name: /privacy policy/i });

    fireEvent.focus(privacyLink);
    fireEvent.blur(privacyLink);

    expect(privacyLink).toHaveStyle({
      color: "var(--color-text-muted)",
      textDecoration: "none",
    });
  });

  it("should render footer with proper structure", () => {
    renderFooter();

    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();

    // Check that container exists
    const container = footer.querySelector("div");
    expect(container).toBeInTheDocument();

    // Check that brand exists
    const brand = screen.getByText("FitVibe");
    expect(brand).toBeInTheDocument();
  });

  it("should have proper link container styling", () => {
    renderFooter();

    const nav = screen.getByLabelText("Footer navigation");
    const linksContainer = nav.querySelector("div");
    expect(linksContainer).toBeInTheDocument();
  });

  it("should handle multiple hover events correctly", () => {
    renderFooter();

    const termsLink = screen.getByRole("link", { name: /terms and conditions/i });
    const privacyLink = screen.getByRole("link", { name: /privacy policy/i });

    fireEvent.mouseEnter(termsLink);
    fireEvent.mouseEnter(privacyLink);
    fireEvent.mouseLeave(termsLink);
    fireEvent.mouseLeave(privacyLink);

    expect(termsLink).toHaveStyle({ textDecoration: "none" });
    expect(privacyLink).toHaveStyle({ textDecoration: "none" });
  });

  it("should handle focus and blur events correctly", () => {
    renderFooter();

    const termsLink = screen.getByRole("link", { name: /terms and conditions/i });
    const privacyLink = screen.getByRole("link", { name: /privacy policy/i });

    fireEvent.focus(termsLink);
    fireEvent.focus(privacyLink);
    fireEvent.blur(termsLink);
    fireEvent.blur(privacyLink);

    expect(termsLink).toHaveStyle({ textDecoration: "none" });
    expect(privacyLink).toHaveStyle({ textDecoration: "none" });
  });
});
