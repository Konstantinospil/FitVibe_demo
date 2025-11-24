import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Privacy from "../../src/pages/Privacy";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "privacy.eyebrow": "Privacy",
        "privacy.title": "Privacy Policy",
        "privacy.description": "How we handle your data",
        "privacy.effectiveDate": "Effective Date",
      };
      return translations[key] || key;
    },
  }),
}));

describe("Privacy page", () => {
  it("should render privacy policy content", () => {
    render(<Privacy />);

    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    expect(screen.getByText("How we handle your data")).toBeInTheDocument();
  });

  it("should display effective date", () => {
    render(<Privacy />);

    const effectiveDateElements = screen.getAllByText(/Effective Date/i);
    expect(effectiveDateElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/26 October 2025/i)).toBeInTheDocument();
  });

  it("should render privacy policy sections", () => {
    render(<Privacy />);

    expect(screen.getByText("1. Scope")).toBeInTheDocument();
    expect(screen.getByText("2. Who we are and how to contact us")).toBeInTheDocument();
    expect(screen.getByText("3. Information we collect")).toBeInTheDocument();
  });

  it("should render data collection table", () => {
    render(<Privacy />);

    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Examples")).toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("Account data")).toBeInTheDocument();
  });

  it("should render contact information", () => {
    render(<Privacy />);

    const emailElements = screen.getAllByText(/kpilpilidis@gmail.com/i);
    expect(emailElements.length).toBeGreaterThan(0);
  });
});
