import React from "react";
import { render, screen, cleanup, waitFor, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
        "language.french": "French",
        "language.spanish": "Spanish",
        "language.greek": "Greek",
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

  afterEach(() => {
    cleanup();
  });

  it("should render language switcher button", () => {
    const { container } = render(<LanguageSwitcher />);
    const buttons = screen.getAllByRole("button", { name: /select language/i });
    const button = Array.from(buttons).find((btn) => container.contains(btn)) || buttons[0];
    expect(button).toBeInTheDocument();
  });

  it("should have proper ARIA attributes", () => {
    const { container } = render(<LanguageSwitcher />);
    const buttons = screen.getAllByRole("button", { name: /select language/i });
    const button = Array.from(buttons).find((btn) => container.contains(btn)) || buttons[0];
    expect(button).toHaveAttribute("aria-label");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("should open dropdown when clicked", async () => {
    const { container } = render(<LanguageSwitcher />);

    const buttons = screen.getAllByRole("button", { name: /select language/i });
    const button = Array.from(buttons).find((btn) => container.contains(btn)) || buttons[0];
    fireEvent.click(button);

    await waitFor(
      () => {
        expect(button).toHaveAttribute("aria-expanded", "true");
      },
      { timeout: 2000 },
    );

    const menus = screen.getAllByRole("menu");
    const menu = Array.from(menus).find((el) => container.contains(el)) || menus[0];
    expect(menu).toBeInTheDocument();
  });

  it("should display language options when open", async () => {
    const { container } = render(<LanguageSwitcher />);

    const buttons = screen.getAllByRole("button", { name: /select language/i });
    const button = Array.from(buttons).find((btn) => container.contains(btn)) || buttons[0];
    fireEvent.click(button);

    // Wait for dropdown to open and options to render
    await waitFor(
      () => {
        const englishTexts = screen.getAllByText("English");
        const englishText = Array.from(englishTexts).find((el) => container.contains(el));
        expect(englishText).toBeInTheDocument();

        const germanTexts = screen.getAllByText("German");
        const germanText = Array.from(germanTexts).find((el) => container.contains(el));
        expect(germanText).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("should close dropdown when clicking outside", async () => {
    const { container } = render(
      <div>
        <LanguageSwitcher />
        <div data-testid="outside">Outside</div>
      </div>,
    );

    const buttons = screen.getAllByRole("button", { name: /select language/i });
    const button = Array.from(buttons).find((btn) => container.contains(btn)) || buttons[0];
    fireEvent.click(button);

    await waitFor(
      () => {
        const menus = screen.getAllByRole("menu");
        const menu = Array.from(menus).find((el) => container.contains(el));
        expect(menu).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // Find an element outside the LanguageSwitcher component
    const outside = screen.getByTestId("outside");

    // Use fireEvent to trigger mousedown event on the outside element
    // This should trigger the click-outside handler in the component
    fireEvent.mouseDown(outside);

    // Wait for dropdown to close - check that menu is no longer in document
    await waitFor(
      () => {
        const menusAfter = screen.queryAllByRole("menu");
        const menuAfter = menusAfter.find((el) => container.contains(el));
        expect(menuAfter).toBeUndefined();
      },
      { timeout: 2000 },
    );
  });

  it("should mark current language as selected", async () => {
    const { container } = render(<LanguageSwitcher />);

    const buttons = screen.getAllByRole("button", { name: /select language/i });
    const button = Array.from(buttons).find((btn) => container.contains(btn)) || buttons[0];
    fireEvent.click(button);

    await waitFor(
      () => {
        const englishOptions = screen.getAllByRole("menuitemradio", { name: /english/i });
        const englishOption =
          Array.from(englishOptions).find((el) => container.contains(el)) || englishOptions[0];
        expect(englishOption).toBeInTheDocument();
        expect(englishOption).toHaveAttribute("aria-checked", "true");
      },
      { timeout: 2000 },
    );
  });

  it("should close dropdown when language option is clicked", async () => {
    const { container } = render(<LanguageSwitcher />);

    const buttons = screen.getAllByRole("button", { name: /select language/i });
    const button = Array.from(buttons).find((btn) => container.contains(btn)) || buttons[0];
    fireEvent.click(button);

    // Wait for menu and German option to be available together
    await waitFor(
      () => {
        const menus = screen.getAllByRole("menu");
        const menu = Array.from(menus).find((el) => container.contains(el));
        expect(menu).toBeInTheDocument();

        const germanTexts = screen.getAllByText("German");
        const germanText = Array.from(germanTexts).find((el) => container.contains(el));
        expect(germanText).toBeInTheDocument();

        // Find the parent button element
        const germanButton = germanText?.closest('button[role="menuitemradio"]') as HTMLElement;
        expect(germanButton).toBeInTheDocument();

        if (germanButton) {
          fireEvent.click(germanButton);
        }
      },
      { timeout: 2000 },
    );

    // Dropdown should close after selection
    await waitFor(
      () => {
        const menusAfter = screen.queryAllByRole("menu");
        const menuAfter = menusAfter.find((el) => container.contains(el));
        expect(menuAfter).toBeUndefined();
      },
      { timeout: 2000 },
    );
  });
});
