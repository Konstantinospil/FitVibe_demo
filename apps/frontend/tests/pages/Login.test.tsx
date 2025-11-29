import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Login from "../../src/pages/Login";

vi.mock("../../src/components/AuthPageLayout", () => ({
  default: ({ children, eyebrow, title, description }: any) => (
    <div data-testid="auth-page-layout">
      <div data-testid="eyebrow">{eyebrow}</div>
      <div data-testid="title">{title}</div>
      <div data-testid="description">{description}</div>
      {children}
    </div>
  ),
}));

vi.mock("../../src/pages/LoginFormContent", () => ({
  default: () => <div data-testid="login-form-content">Login Form</div>,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "auth.login.eyebrow": "Welcome back",
        "auth.login.title": "Sign in to your account",
        "auth.login.description": "Enter your credentials to continue",
      };
      return translations[key] || key;
    },
  }),
}));

describe("Login", () => {
  it("should render login page with form", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("auth-page-layout")).toBeInTheDocument();
    expect(screen.getByTestId("login-form-content")).toBeInTheDocument();
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
    expect(screen.getByText("Enter your credentials to continue")).toBeInTheDocument();
  });
});
