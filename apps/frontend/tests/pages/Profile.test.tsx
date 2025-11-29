import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Profile from "../../src/pages/Profile";

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

vi.mock("../../src/components/ShareLinkManager", () => ({
  default: () => <div data-testid="share-link-manager">ShareLinkManager</div>,
}));

vi.mock("../../src/components/ui", () => ({
  Button: ({
    children,
    type,
    variant,
    style,
  }: {
    children: React.ReactNode;
    type?: string;
    variant?: string;
    style?: React.CSSProperties;
  }) => (
    <button data-testid="edit-button" type={type} data-variant={variant} style={style}>
      {children}
    </button>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "profile.eyebrow": "Profile",
        "profile.title": "Your Profile",
        "profile.description": "Manage your profile settings",
        "profile.edit": "Edit Profile",
        "profile.sections.visibility.title": "Visibility",
        "profile.sections.visibility.description": "Control who can see your profile",
        "profile.sections.units.title": "Units",
        "profile.sections.units.description": "Set your preferred units",
        "profile.sections.achievements.title": "Achievements",
        "profile.sections.achievements.description": "View your achievements",
      };
      return translations[key] || key;
    },
  }),
}));

describe("Profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render profile page with PageIntro", () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("page-intro")).toBeInTheDocument();
    expect(screen.getByTestId("eyebrow")).toHaveTextContent("Profile");
    expect(screen.getByTestId("title")).toHaveTextContent("Your Profile");
    expect(screen.getByTestId("description")).toHaveTextContent("Manage your profile settings");
  });

  it("should render profile sections", () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    expect(screen.getByText("Visibility")).toBeInTheDocument();
    expect(screen.getByText("Control who can see your profile")).toBeInTheDocument();
    expect(screen.getByText("Units")).toBeInTheDocument();
    expect(screen.getByText("Set your preferred units")).toBeInTheDocument();
    expect(screen.getByText("Achievements")).toBeInTheDocument();
    expect(screen.getByText("View your achievements")).toBeInTheDocument();
  });

  it("should render edit button", () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    const editButton = screen.getByTestId("edit-button");
    expect(editButton).toBeInTheDocument();
    expect(editButton).toHaveTextContent("Edit Profile");
    expect(editButton).toHaveAttribute("data-variant", "secondary");
  });

  it("should render ShareLinkManager", () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("share-link-manager")).toBeInTheDocument();
  });
});
