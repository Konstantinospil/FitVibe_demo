import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import LanguageSwitcher from "../../src/components/LanguageSwitcher";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: {
      language: "en",
      changeLanguage: vi.fn(),
    },
    t: (key: string) => {
      const translations: Record<string, string> = {
        "language.label": "Select language",
        "language.select": "Select a language",
        "language.english": "English",
        "language.german": "German",
      };
      return translations[key] || key;
    },
  }),
}));

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    // Reset document state
    document.body.innerHTML = "";
  });

  it("should render language switcher button", () => {
    render(<LanguageSwitcher />);
    const button = screen.getByRole("button", { name: /select language/i });
    expect(button).toBeInTheDocument();
  });

  it("should have proper ARIA attributes", () => {
    render(<LanguageSwitcher />);
    const button = screen.getByRole("button", { name: /select language/i });
    expect(button).toHaveAttribute("aria-label");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("should open dropdown when clicked", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const button = screen.getByRole("button", { name: /select language/i });
    await user.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("should display language options when open", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const button = screen.getByRole("button", { name: /select language/i });
    await user.click(button);

    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("German")).toBeInTheDocument();
  });

  it("should close dropdown when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <LanguageSwitcher />
        <div data-testid="outside">Outside</div>
      </div>,
    );

    const button = screen.getByRole("button", { name: /select language/i });
    await user.click(button);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    const outside = screen.getByTestId("outside");
    await user.click(outside);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("should mark current language as selected", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const button = screen.getByRole("button", { name: /select language/i });
    await user.click(button);

    const englishOption = screen.getByRole("menuitemradio", { name: /english/i });
    expect(englishOption).toHaveAttribute("aria-checked", "true");
  });

  it("should close dropdown when language option is clicked", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const button = screen.getByRole("button", { name: /select language/i });
    await user.click(button);

    expect(screen.getByRole("menu")).toBeInTheDocument();

    const germanOption = screen.getByRole("menuitemradio", { name: /german/i });
    await user.click(germanOption);

    // Dropdown should close after selection
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
