import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import NotFound from "../../src/pages/NotFound";

vi.mock("../../src/components/PageIntro", () => ({
  default: ({ children, eyebrow, title, description }: any) => (
    <div data-testid="page-intro">
      <div data-testid="eyebrow">{eyebrow}</div>
      <div data-testid="title">{title}</div>
      <div data-testid="description">{description}</div>
      {children}
    </div>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "notFound.eyebrow": "404",
        "notFound.title": "Page not found",
        "notFound.description": "The page you're looking for doesn't exist",
        "notFound.takeMeHome": "Take me home",
        "notFound.goToLanding": "Go to landing",
      };
      return translations[key] || key;
    },
  }),
}));

describe("NotFound", () => {
  it("should render not found page with links", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("page-intro")).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByText("The page you're looking for doesn't exist")).toBeInTheDocument();
    expect(screen.getByText("Take me home")).toBeInTheDocument();
    expect(screen.getByText("Go to landing")).toBeInTheDocument();
  });

  it("should have links to dashboard and home", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    const homeLink = screen.getByText("Take me home");
    const landingLink = screen.getByText("Go to landing");

    expect(homeLink.closest("a")).toHaveAttribute("href", "/dashboard");
    expect(landingLink.closest("a")).toHaveAttribute("href", "/");
  });
});
