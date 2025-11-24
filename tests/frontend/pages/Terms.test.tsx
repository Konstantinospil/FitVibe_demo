import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Terms from "../../src/pages/Terms";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "terms.eyebrow": "Terms",
        "terms.title": "Terms and Conditions",
        "terms.description": "Terms of service",
        "terms.effectiveDate": "Effective Date",
      };
      return translations[key] || key;
    },
  }),
}));

describe("Terms page", () => {
  it("should render terms and conditions content", () => {
    render(<Terms />);

    expect(screen.getByText("Terms and Conditions")).toBeInTheDocument();
    expect(screen.getByText("Terms of service")).toBeInTheDocument();
  });

  it("should display effective date", () => {
    render(<Terms />);

    expect(screen.getByText(/Effective Date/i)).toBeInTheDocument();
    expect(screen.getByText(/2024-06-01/i)).toBeInTheDocument();
  });

  it("should render terms sections", () => {
    render(<Terms />);

    expect(screen.getByText("1. Eligibility and account registration")).toBeInTheDocument();
    expect(screen.getByText("2. License grant and intellectual property")).toBeInTheDocument();
    expect(screen.getByText("3. Acceptable use")).toBeInTheDocument();
  });

  it("should render health and safety notice", () => {
    render(<Terms />);

    expect(screen.getByText("5. Health and safety notice")).toBeInTheDocument();
  });

  it("should render contact information", () => {
    render(<Terms />);

    const emailElements = screen.getAllByText(/legal@fitvibe.example.com/i);
    expect(emailElements.length).toBeGreaterThan(0);
  });
});
