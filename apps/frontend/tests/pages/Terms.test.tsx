import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Terms from "../../src/pages/Terms";

vi.mock("../../src/components/PageIntro", () => ({
  default: ({
    children,
    eyebrow,
    title,
    description,
  }: {
    children: React.ReactNode;
    eyebrow: string;
    title: string;
    description: string;
  }) => (
    <div data-testid="page-intro">
      <div data-testid="eyebrow">{eyebrow}</div>
      <div data-testid="title">{title}</div>
      <div data-testid="description">{description}</div>
      {children}
    </div>
  ),
}));

vi.mock("../../src/components/ui", () => ({
  Card: ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div data-testid="card" style={style}>
      {children}
    </div>
  ),
  CardContent: ({
    children,
    style,
  }: {
    children: React.ReactNode;
    style?: React.CSSProperties;
  }) => (
    <div data-testid="card-content" style={style}>
      {children}
    </div>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "terms.eyebrow": "Terms and Conditions",
        "terms.title": "Terms of Service",
        "terms.description": "Please read our terms carefully",
        "terms.effectiveDate": "Effective Date",
      };
      return translations[key] || key;
    },
  }),
}));

describe("Terms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render terms page with PageIntro", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("page-intro")).toBeInTheDocument();
    expect(screen.getByTestId("eyebrow")).toHaveTextContent("Terms and Conditions");
    expect(screen.getByTestId("title")).toHaveTextContent("Terms of Service");
    expect(screen.getByTestId("description")).toHaveTextContent("Please read our terms carefully");
  });

  it("should render card with terms content", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("card")).toBeInTheDocument();
    expect(screen.getByTestId("card-content")).toBeInTheDocument();
  });

  it("should display effective date", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Effective Date/i)).toBeInTheDocument();
    expect(screen.getByText(/2024-06-01/i)).toBeInTheDocument();
  });

  it("should render terms sections", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );

    // Check for key sections
    expect(screen.getByText(/1\. Eligibility and account registration/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. License grant and intellectual property/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Acceptable use/i)).toBeInTheDocument();
    expect(screen.getByText(/10\. Limitation of liability/i)).toBeInTheDocument();
  });

  it("should render acceptable use section", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );

    expect(screen.getByText(/3\. Acceptable use/i)).toBeInTheDocument();
    expect(screen.getByText(/You agree not to:/i)).toBeInTheDocument();
  });

  it("should render health and safety notice", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );

    expect(screen.getByText(/5\. Health and safety notice/i)).toBeInTheDocument();
    expect(screen.getByText(/FitVibe provides training and wellness tools/i)).toBeInTheDocument();
  });

  it("should render termination section", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );

    expect(screen.getByText(/8\. Termination/i)).toBeInTheDocument();
  });
});
