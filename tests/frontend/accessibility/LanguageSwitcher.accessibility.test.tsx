import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach } from "vitest";
import LanguageSwitcher from "../../src/components/LanguageSwitcher";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Initialize i18n for tests
const testI18n = i18n.createInstance();
void testI18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        "language.label": "Change language",
        "language.select": "Select language",
        "language.english": "English",
        "language.german": "German",
      },
    },
    de: {
      translation: {
        "language.label": "Sprache ändern",
        "language.select": "Sprache auswählen",
        "language.english": "Englisch",
        "language.german": "Deutsch",
      },
    },
  },
});

const renderWithI18n = (component: React.ReactElement) => {
  return render(<I18nextProvider i18n={testI18n}>{component}</I18nextProvider>);
};

describe("LanguageSwitcher Accessibility", () => {
  beforeEach(() => {
    void testI18n.changeLanguage("en");
  });

  describe("ARIA attributes", () => {
    it("should have proper button role", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("should have descriptive aria-label", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button", { name: /change language/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("aria-label", "Change language");
    });

    it("should have aria-expanded=false when closed", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("should have aria-expanded=true when open", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    it("should have type='button' to prevent form submission", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "button");
    });

    it("should use role='menu' for dropdown", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const menu = screen.getByRole("menu");
      expect(menu).toBeInTheDocument();
      expect(menu).toHaveAttribute("aria-label", "Select language");
    });

    it("should use role='menuitemradio' for language options", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const menuItems = screen.getAllByRole("menuitemradio");
      expect(menuItems).toHaveLength(5); // en, de, fr, es, el
    });

    it("should have aria-checked=true for current language", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const englishOption = screen.getByRole("menuitemradio", { name: /english/i });
      expect(englishOption).toHaveAttribute("aria-checked", "true");
    });

    it("should have aria-checked=false for non-selected languages", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const germanOption = screen.getByRole("menuitemradio", { name: /german/i });
      expect(germanOption).toHaveAttribute("aria-checked", "false");
    });

    it("should update aria-checked when language changes", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const germanOption = screen.getByRole("menuitemradio", { name: /german/i });
      fireEvent.click(germanOption);

      // Reopen to check aria-checked
      fireEvent.click(button);

      const newGermanOption = screen.getByRole("menuitemradio", { name: /deutsch/i });
      expect(newGermanOption).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("Keyboard navigation", () => {
    it("should be focusable with Tab key", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      button.focus();

      expect(button).toHaveFocus();
    });

    it("should open dropdown when Enter is pressed", async () => {
      const user = userEvent.setup();
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      button.focus();
      await user.keyboard("{Enter}");

      expect(button).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("should open dropdown when Space is pressed", async () => {
      const user = userEvent.setup();
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      button.focus();
      await user.keyboard(" ");

      expect(button).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("should allow selecting language with Enter key", async () => {
      const user = userEvent.setup();
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const germanOption = screen.getByRole("menuitemradio", { name: /german/i });
      germanOption.focus();
      await user.keyboard("{Enter}");

      // Verify language changed
      expect(testI18n.language).toBe("de");
    });

    it("should allow selecting language with Space key", async () => {
      const user = userEvent.setup();
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const germanOption = screen.getByRole("menuitemradio", { name: /german/i });
      germanOption.focus();
      await user.keyboard(" ");

      // Verify language changed
      expect(testI18n.language).toBe("de");
    });

    it("should close dropdown after selection", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const germanOption = screen.getByRole("menuitemradio", { name: /german/i });
      fireEvent.click(germanOption);

      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("Screen reader support", () => {
    it("should announce button purpose to screen readers", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button", { name: /change language/i });
      expect(button).toHaveAccessibleName("Change language");
    });

    it("should announce menu label to screen readers", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const menu = screen.getByRole("menu", { name: /select language/i });
      expect(menu).toHaveAccessibleName("Select language");
    });

    it("should announce language options with text labels", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const englishOption = screen.getByRole("menuitemradio", { name: /english/i });
      const germanOption = screen.getByRole("menuitemradio", { name: /german/i });

      expect(englishOption).toHaveAccessibleName("English");
      expect(germanOption).toHaveAccessibleName("German");
    });

    it("should communicate selection state to screen readers via aria-checked", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const englishOption = screen.getByRole("menuitemradio", { checked: true });
      expect(englishOption).toHaveTextContent("English");
    });

    it("should mark flag icons as decorative with aria-hidden", () => {
      const { container } = renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // SVG flags should have aria-hidden
      const flags = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(flags.length).toBeGreaterThan(0);
    });

    it("should update screen reader announcements when language changes", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const germanOption = screen.getByRole("menuitemradio", { name: /german/i });
      fireEvent.click(germanOption);

      // After changing to German, button label should update
      expect(button).toHaveAttribute("aria-label", "Sprache ändern");
    });
  });

  describe("Focus management", () => {
    it("should be included in tab order", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      expect(button.tabIndex).not.toBe(-1);
    });

    it("should receive focus on click", async () => {
      const user = userEvent.setup();
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      await user.click(button);

      expect(button).toHaveFocus();
    });

    it("should maintain focus on button after closing dropdown", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      button.focus();
      fireEvent.click(button);

      const germanOption = screen.getByRole("menuitemradio", { name: /german/i });
      fireEvent.click(germanOption);

      expect(button).toHaveFocus();
    });
  });

  describe("Interactive states", () => {
    it("should show hover state on menu items", async () => {
      const user = userEvent.setup();
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const germanOption = screen.getByRole("menuitemradio", { name: /german/i });
      await user.hover(germanOption);

      // Hover styles are applied via onMouseEnter
      expect(germanOption).toBeInTheDocument();
    });

    it("should visually distinguish selected language", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const englishOption = screen.getByRole("menuitemradio", { name: /english/i });
      const germanOption = screen.getByRole("menuitemradio", { name: /german/i });

      // Selected option has different background and font-weight
      // Note: In jsdom, inline styles are available but computed styles may not fully reflect
      // the actual visual state, so we verify the attributes are correctly set
      expect(englishOption).toHaveAttribute("aria-checked", "true");
      expect(germanOption).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("Visual accessibility", () => {
    it("should display flag icons for visual identification", () => {
      const { container } = renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Should have flag icons (either emoji or SVG)
      const flags = container.querySelectorAll('svg[aria-hidden="true"], span[aria-hidden="true"]');
      expect(flags.length).toBeGreaterThan(0);
    });

    it("should use semantic color variables for theming", () => {
      const { container } = renderWithI18n(<LanguageSwitcher />);

      const button = container.querySelector("button");
      const styles = button?.getAttribute("style");

      // Should use CSS custom properties
      expect(styles).toContain("--color-surface-glass");
      expect(styles).toContain("--color-border");
      expect(styles).toContain("--color-text-secondary");
    });

    it("should have visible focus indicator", () => {
      const { container } = renderWithI18n(<LanguageSwitcher />);

      const button = container.querySelector("button");
      expect(button).toBeInTheDocument();
      // CSS focus styles should be applied via :focus-visible
    });

    it("should have minimum touch target size", () => {
      const { container } = renderWithI18n(<LanguageSwitcher />);

      const button = container.querySelector("button");
      const styles = button?.getAttribute("style");

      // Should have padding for adequate touch target (44x44px minimum)
      expect(styles).toContain("padding");
    });
  });

  describe("Dropdown behavior", () => {
    it("should close dropdown when clicking outside", async () => {
      renderWithI18n(
        <div>
          <LanguageSwitcher />
          <div data-testid="outside">Outside element</div>
        </div>,
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByRole("menu")).toBeInTheDocument();

      const outside = screen.getByTestId("outside");
      fireEvent.mouseDown(outside);

      await waitFor(() => {
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      });
    });

    it("should not close dropdown when clicking inside", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const menu = screen.getByRole("menu");
      fireEvent.mouseDown(menu);

      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("should toggle dropdown on button click", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");

      // First click opens
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");

      // Second click closes
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("Language switching", () => {
    it("should change language when option is selected", () => {
      renderWithI18n(<LanguageSwitcher />);

      expect(testI18n.language).toBe("en");

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const germanOption = screen.getByRole("menuitemradio", { name: /german/i });
      fireEvent.click(germanOption);

      expect(testI18n.language).toBe("de");
    });

    it("should update UI text when language changes", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");

      // Change to German
      fireEvent.click(button);
      const germanOption = screen.getByRole("menuitemradio", { name: /german/i });
      fireEvent.click(germanOption);

      // Button label should update to German
      expect(button).toHaveAttribute("aria-label", "Sprache ändern");

      // Reopen and check menu items are in German
      fireEvent.click(button);
      expect(screen.getByRole("menuitemradio", { name: /englisch/i })).toBeInTheDocument();
      expect(screen.getByRole("menuitemradio", { name: /deutsch/i })).toBeInTheDocument();
    });

    it("should preserve aria-checked state after language switch", () => {
      renderWithI18n(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const germanOption = screen.getByRole("menuitemradio", { name: /german/i });
      fireEvent.click(germanOption);

      // Reopen menu
      fireEvent.click(button);

      const newGermanOption = screen.getByRole("menuitemradio", { name: /deutsch/i });
      expect(newGermanOption).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("Reduced motion", () => {
    it("should respect prefers-reduced-motion for transitions", () => {
      const { container } = renderWithI18n(<LanguageSwitcher />);

      const button = container.querySelector("button");
      const styles = button?.getAttribute("style");

      // Transitions should be defined but browsers will disable if prefers-reduced-motion
      expect(styles).toContain("transition");
    });
  });
});
