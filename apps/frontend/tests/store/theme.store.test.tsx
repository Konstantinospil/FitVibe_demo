import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import ThemeToggle from "../../src/components/ThemeToggle";
import { useThemeStore } from "../../src/store/theme.store";

describe("theme store", () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: "dark" });
    document.documentElement.removeAttribute("data-theme");
    window.localStorage.clear();
  });

  it("applies the selected theme when setTheme is used", () => {
    const { setTheme } = useThemeStore.getState();

    setTheme("light");

    expect(useThemeStore.getState().theme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("toggles between light and dark modes", () => {
    const store = useThemeStore.getState();

    store.setTheme("light");
    store.toggleTheme();

    expect(useThemeStore.getState().theme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("ThemeToggle button updates aria-label as the theme changes", () => {
    render(<ThemeToggle />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Switch to light mode");

    fireEvent.click(button);

    expect(useThemeStore.getState().theme).toBe("light");
    expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
