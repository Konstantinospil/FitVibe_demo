import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import ThemeToggle from "../../src/components/ThemeToggle";
import { useThemeStore } from "../../src/store/theme.store";

vi.mock("../../src/store/theme.store");

describe("ThemeToggle", () => {
  const mockToggleTheme = vi.fn();
  const mockSetTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useThemeStore).mockReturnValue({
      theme: "dark" as const,
      setTheme: mockSetTheme,
      toggleTheme: mockToggleTheme,
    });
  });

  it("should render theme toggle button", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("should display sun icon when theme is dark", () => {
    vi.mocked(useThemeStore).mockReturnValue({
      theme: "dark" as const,
      setTheme: mockSetTheme,
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Switch to light mode");
    expect(button).toHaveAttribute("title", "Switch to light mode");
  });

  it("should display moon icon when theme is light", () => {
    vi.mocked(useThemeStore).mockReturnValue({
      theme: "light" as const,
      setTheme: mockSetTheme,
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
    expect(button).toHaveAttribute("title", "Switch to dark mode");
  });

  it("should call toggleTheme when clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it("should have accessible button with proper ARIA attributes", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-label");
    expect(button).toHaveAttribute("title");
  });
});

