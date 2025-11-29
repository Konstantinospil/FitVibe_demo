import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Privacy from "../../src/pages/Privacy";

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
        "privacy.eyebrow": "Privacy Policy",
        "privacy.title": "Your Privacy Matters",
        "privacy.description": "How we protect your data",
        "privacy.effectiveDate": "Effective Date",
      };
      return translations[key] || key;
    },
  }),
}));

describe("Privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render privacy page with PageIntro", () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("page-intro")).toBeInTheDocument();
    expect(screen.getByTestId("eyebrow")).toHaveTextContent("Privacy Policy");
    expect(screen.getByTestId("title")).toHaveTextContent("Your Privacy Matters");
    expect(screen.getByTestId("description")).toHaveTextContent("How we protect your data");
  });

  it("should render card with privacy content", () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("card")).toBeInTheDocument();
    expect(screen.getByTestId("card-content")).toBeInTheDocument();
  });

  it("should display effective date", () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>,
    );

    // Use getAllByText since "Effective Date" appears multiple times
    const effectiveDateElements = screen.getAllByText(/Effective Date/i);
    expect(effectiveDateElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/26 October 2025/i)).toBeInTheDocument();
  });

  it("should render privacy policy sections", () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>,
    );

    // Check for key sections
    expect(screen.getByText(/1\. Scope/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Who we are and how to contact us/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Information we collect/i)).toBeInTheDocument();
    expect(screen.getByText(/12\. Your rights/i)).toBeInTheDocument();
  });

  it("should render information collection table", () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>,
    );

    // Check for table headers
    expect(screen.getByText(/Category/i)).toBeInTheDocument();
    expect(screen.getByText(/Examples/i)).toBeInTheDocument();
    // Use getAllByText since "Source" appears in table header and section heading
    const sourceElements = screen.getAllByText(/Source/i);
    expect(sourceElements.length).toBeGreaterThan(0);

    // Check for table content
    expect(screen.getByText(/Account data/i)).toBeInTheDocument();
    expect(screen.getByText(/Profile & preferences/i)).toBeInTheDocument();
    expect(screen.getByText(/Training & wellness data/i)).toBeInTheDocument();
  });

  it("should render GDPR rights section", () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>,
    );

    expect(screen.getByText(/12\. Your rights/i)).toBeInTheDocument();
    // Use getAllByText since "Access" appears multiple times
    const accessElements = screen.getAllByText(/Access/i);
    expect(accessElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Rectification/i)).toBeInTheDocument();
    expect(screen.getByText(/Erasure/i)).toBeInTheDocument();
  });
});
