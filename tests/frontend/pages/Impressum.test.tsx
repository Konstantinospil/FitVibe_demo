import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Impressum from "../../src/pages/Impressum";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "impressum.eyebrow": "Legal",
        "impressum.title": "Impressum",
        "impressum.description": "Legal information",
        "impressum.content": "Company information and legal details go here.",
      };
      return translations[key] || key;
    },
  }),
}));

describe("Impressum page", () => {
  afterEach(() => {
    cleanup();
  });

  it("should render impressum content", () => {
    render(
      <MemoryRouter>
        <Impressum />
      </MemoryRouter>,
    );

    expect(screen.getByText("Impressum")).toBeInTheDocument();
    expect(screen.getByText("Legal information")).toBeInTheDocument();
    expect(screen.getByText("Company information and legal details go here.")).toBeInTheDocument();
  });

  it("should display eyebrow text", () => {
    render(
      <MemoryRouter>
        <Impressum />
      </MemoryRouter>,
    );

    // Use getAllByText due to test isolation
    const legalTexts = screen.getAllByText("Legal");
    expect(legalTexts.length).toBeGreaterThan(0);
  });
});
