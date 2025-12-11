import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Privacy from "../../src/pages/Privacy";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { returnObjects?: boolean }) => {
      // Handle array/object translations when returnObjects is true
      if (options?.returnObjects) {
        const arrayKeys = [
          "privacy.section1.items",
          "privacy.section4.items",
          "privacy.section5.items",
          "privacy.section7.items",
          "privacy.section9.items",
          "privacy.section11.items",
          "privacy.section13.items",
          "privacy.section15.items",
        ];
        const objectKeys = [
          "privacy.section6.items",
          "privacy.section8.items",
          "privacy.section10.items",
          "privacy.section12.items",
        ];

        if (arrayKeys.includes(key)) {
          return ["Item 1", "Item 2", "Item 3"];
        }
        if (objectKeys.includes(key)) {
          return [
            { title: "Title 1", content: "Content 1" },
            { title: "Title 2", content: "Content 2" },
          ];
        }
      }

      const translations: Record<string, string> = {
        "privacy.eyebrow": "Privacy",
        "privacy.title": "Privacy Policy",
        "privacy.description": "How we handle your data",
        "privacy.effectiveDate": "Effective Date",
        "privacy.effectiveDateValue": "26 October 2025",
        "privacy.intro1": "Introduction text 1",
        "privacy.intro2": "Introduction text 2",
        "privacy.section1.title": "1. Scope",
        "privacy.section1.subtitle": "Section 1 subtitle",
        "privacy.section2.title": "2. Who we are and how to contact us",
        "privacy.section2.controller": "Controller:",
        "privacy.section2.controllerValue": "Controller value",
        "privacy.section2.privacyInquiries": "Privacy Inquiries:",
        "privacy.section2.privacyInquiriesValue": "privacy@example.com",
        "privacy.section2.dpo": "Data Protection Officer:",
        "privacy.section2.dpoValue": "dpo@example.com",
        "privacy.section2.euRepresentative": "EU Representative:",
        "privacy.section2.euRepresentativeValue": "eu@example.com",
        "privacy.section2.contactNote": "Contact note",
        "privacy.section3.title": "3. Information we collect",
        "privacy.section3.subtitle": "Section 3 subtitle",
        "privacy.section3.table.headers.category": "Category",
        "privacy.section3.table.headers.examples": "Examples",
        "privacy.section3.table.headers.source": "Source",
        "privacy.section3.table.rows.accountData.category": "Account data",
        "privacy.section3.table.rows.accountData.examples": "Account examples",
        "privacy.section3.table.rows.accountData.source": "Account source",
        "privacy.section3.specialCategoriesNote": "Special categories note",
        "privacy.section16.email": "Email:",
        "privacy.section16.emailValue": "kpilpilidis@gmail.com",
      };
      return translations[key] || key;
    },
  }),
}));

describe("Privacy page", () => {
  it("should render privacy policy content", () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>,
    );

    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    expect(screen.getByText("How we handle your data")).toBeInTheDocument();
  });

  it("should display effective date", () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>,
    );

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

    expect(screen.getByText("1. Scope")).toBeInTheDocument();
    expect(screen.getByText("2. Who we are and how to contact us")).toBeInTheDocument();
    expect(screen.getByText("3. Information we collect")).toBeInTheDocument();
  });

  it("should render data collection table", () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>,
    );

    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Examples")).toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("Account data")).toBeInTheDocument();
  });

  it("should render contact information", () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>,
    );

    const emailElements = screen.getAllByText(/kpilpilidis@gmail.com/i);
    expect(emailElements.length).toBeGreaterThan(0);
  });
});
