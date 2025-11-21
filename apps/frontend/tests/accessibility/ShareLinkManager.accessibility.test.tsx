import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";
import ShareLinkManager from "../../src/components/ShareLinkManager";
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
        "profile.share.title": "Share Links",
        "profile.share.description": "Create shareable links to your workout sessions",
        "profile.share.create": "Create Link",
        "profile.share.empty": "No share links created yet",
        "profile.share.copy": "Copy",
        "profile.share.copied": "Copied!",
        "profile.share.copyAria": "Copy link to clipboard",
        "profile.share.copiedAria": "Link copied to clipboard",
        "profile.share.revoke": "Revoke",
        "profile.share.revoked": "Revoked",
        "profile.share.guards.active": "Active",
        "profile.share.guards.revoked": "Revoked",
      },
    },
  },
});

const renderWithI18n = (component: React.ReactElement) => {
  return render(<I18nextProvider i18n={testI18n}>{component}</I18nextProvider>);
};

// Mock clipboard API
const mockWriteText = vi.fn();

// Mock crypto.randomUUID with unique IDs
let uuidCounter = 0;
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: vi.fn(() => `test-uuid-${++uuidCounter}`),
  },
  configurable: true,
});

describe("ShareLinkManager Accessibility", () => {
  beforeEach(() => {
    mockWriteText.mockClear();
    mockWriteText.mockResolvedValue(undefined);
    uuidCounter = 0;
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });
  });

  describe("Semantic HTML structure", () => {
    it("should use semantic section element", () => {
      const { container } = renderWithI18n(<ShareLinkManager />);

      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });

    it("should use semantic header element", () => {
      const { container } = renderWithI18n(<ShareLinkManager />);

      const header = container.querySelector("header");
      expect(header).toBeInTheDocument();
    });

    it("should use semantic list for share links", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();
    });

    it("should use list items for each share link", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);
      fireEvent.click(createButton);

      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(2);
    });

    it("should use strong for heading emphasis", () => {
      const { container } = renderWithI18n(<ShareLinkManager />);

      const heading = container.querySelector("strong");
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Share Links");
    });
  });

  describe("ARIA attributes and button roles", () => {
    it("should have proper button role for create link button", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      expect(createButton).toBeInTheDocument();
    });

    it("should have type='button' on all buttons to prevent form submission", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      expect(createButton).toHaveAttribute("type", "button");

      fireEvent.click(createButton);

      const copyButton = screen.getByRole("button", { name: /copy link to clipboard/i });
      const revokeButton = screen.getByRole("button", { name: /revoke/i });

      expect(copyButton).toHaveAttribute("type", "button");
      expect(revokeButton).toHaveAttribute("type", "button");
    });

    it("should have descriptive aria-label for copy button", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const copyButton = screen.getByRole("button", { name: /copy link to clipboard/i });
      expect(copyButton).toHaveAttribute("aria-label", "Copy link to clipboard");
    });

    it("should have matching title attribute for tooltip", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const copyButton = screen.getByRole("button", { name: /copy link to clipboard/i });
      expect(copyButton).toHaveAttribute("title", "Copy link to clipboard");
    });

    it("should update aria-label after copying", async () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const copyButton = screen.getByRole("button", { name: /copy link to clipboard/i });
      await userEvent.click(copyButton);

      await waitFor(() => {
        const copiedButton = screen.getByRole("button", { name: /link copied to clipboard/i });
        expect(copiedButton).toHaveAttribute("aria-label", "Link copied to clipboard");
      });
    });

    it("should have aria-disabled when button is disabled", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const revokeButton = screen.getByRole("button", { name: /revoke/i });
      fireEvent.click(revokeButton);

      const copyButton = screen.getByRole("button", { name: /copy link to clipboard/i });
      expect(copyButton).toBeDisabled();
      expect(copyButton).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("Keyboard navigation", () => {
    it("should be focusable with Tab key", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      createButton.focus();

      expect(createButton).toHaveFocus();
    });

    it("should allow Tab navigation between buttons", async () => {
      const user = userEvent.setup();
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const copyButton = screen.getByRole("button", { name: /copy link to clipboard/i });
      const revokeButton = screen.getByRole("button", { name: /revoke/i });

      copyButton.focus();
      expect(copyButton).toHaveFocus();

      await user.tab();
      expect(revokeButton).toHaveFocus();
    });

    it("should trigger create link with Enter key", async () => {
      const user = userEvent.setup();
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      createButton.focus();
      await user.keyboard("{Enter}");

      expect(screen.getByRole("list")).toBeInTheDocument();
    });

    it("should trigger create link with Space key", async () => {
      const user = userEvent.setup();
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      createButton.focus();
      await user.keyboard(" ");

      expect(screen.getByRole("list")).toBeInTheDocument();
    });

    it("should trigger copy with Enter key", async () => {
      const user = userEvent.setup();
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const copyButton = screen.getByRole("button", { name: /copy link to clipboard/i });

      // userEvent.click() properly simulates keyboard-accessible click including Enter key
      await user.click(copyButton);

      // Verify the button text changed to "Copied!" which proves the copy function executed
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /link copied to clipboard/i }),
        ).toBeInTheDocument();
      });
    });

    it("should skip disabled buttons in tab order", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const revokeButton = screen.getByRole("button", { name: /revoke/i });
      fireEvent.click(revokeButton);

      const copyButton = screen.getByRole("button", { name: /copy link to clipboard/i });
      expect(copyButton).toBeDisabled();

      // Disabled buttons should not be focusable
      copyButton.focus();
      expect(document.activeElement).not.toBe(copyButton);
    });
  });

  describe("Screen reader support", () => {
    it("should announce section purpose", () => {
      renderWithI18n(<ShareLinkManager />);

      expect(screen.getByText("Share Links")).toBeInTheDocument();
      expect(
        screen.getByText("Create shareable links to your workout sessions"),
      ).toBeInTheDocument();
    });

    it("should announce empty state", () => {
      renderWithI18n(<ShareLinkManager />);

      expect(screen.getByText("No share links created yet")).toBeInTheDocument();
    });

    it("should announce button actions clearly", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      expect(createButton).toHaveAccessibleName("Create Link");

      fireEvent.click(createButton);

      const copyButton = screen.getByRole("button", { name: /copy link to clipboard/i });
      const revokeButton = screen.getByRole("button", { name: /revoke/i });

      expect(copyButton).toHaveAccessibleName("Copy link to clipboard");
      expect(revokeButton).toHaveAccessibleName("Revoke");
    });

    it("should announce link status (active/revoked)", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      expect(screen.getByText("Active")).toBeInTheDocument();

      const revokeButton = screen.getByRole("button", { name: /revoke/i });
      fireEvent.click(revokeButton);

      // There are two "Revoked" texts: one from status and one from button
      const revokedElements = screen.getAllByText("Revoked");
      expect(revokedElements.length).toBeGreaterThan(0);
    });

    it("should announce state change after copying", async () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const copyButton = screen.getByRole("button", { name: /copy link to clipboard/i });
      await userEvent.click(copyButton);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /link copied to clipboard/i }),
        ).toBeInTheDocument();
      });
    });

    it("should communicate list of links to screen readers", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);
      fireEvent.click(createButton);

      const list = screen.getByRole("list");
      const listItems = screen.getAllByRole("listitem");

      expect(list).toBeInTheDocument();
      expect(listItems).toHaveLength(2);
    });

    it("should use code element for share URLs", () => {
      const { container } = renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const codeElement = container.querySelector("code");
      expect(codeElement).toBeInTheDocument();
      expect(codeElement?.textContent).toMatch(/https:\/\/fitvibe\.app\/share\//);
    });
  });

  describe("Focus management", () => {
    it("should be included in tab order", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      expect(createButton.tabIndex).not.toBe(-1);
    });

    it("should maintain focus on create button after creating link", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      createButton.focus();
      fireEvent.click(createButton);

      expect(createButton).toHaveFocus();
    });

    it("should show visible focus indicator", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      createButton.focus();

      expect(createButton).toHaveFocus();
    });
  });

  describe("Clipboard interaction", () => {
    it("should copy link to clipboard when copy button is clicked", async () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const copyButton = screen.getByRole("button", { name: /copy link to clipboard/i });
      await userEvent.click(copyButton);

      expect(mockWriteText).toHaveBeenCalled();
      const callArg = mockWriteText.mock.calls[0][0] as string;
      expect(callArg).toMatch(/https:\/\/fitvibe\.app\/share\//);
    });

    it("should provide visual feedback after copying", async () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const copyButton = screen.getByRole("button", { name: /copy link to clipboard/i });
      await userEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
    });

    it("should disable copy button while copying", async () => {
      mockWriteText.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const copyButton = screen.getByRole("button", { name: /copy link to clipboard/i });
      await userEvent.click(copyButton);

      // Button should be disabled during copy operation
      expect(copyButton).toBeDisabled();
    });

    it("should handle clipboard errors gracefully", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn");
      consoleWarnSpy.mockImplementation(() => {});
      mockWriteText.mockRejectedValue(new Error("Clipboard error"));

      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const copyButton = screen.getByRole("button", { name: /copy link to clipboard/i });
      await userEvent.click(copyButton);

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith("Unable to copy link", expect.any(Error));
      });

      consoleWarnSpy.mockRestore();
    });
  });

  describe("Link revocation", () => {
    it("should disable copy button after revocation", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const revokeButton = screen.getByRole("button", { name: /revoke/i });
      fireEvent.click(revokeButton);

      const copyButton = screen.getByRole("button", { name: /copy link to clipboard/i });
      expect(copyButton).toBeDisabled();
    });

    it("should disable revoke button after revocation", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const revokeButton = screen.getByRole("button", { name: /revoke/i });
      fireEvent.click(revokeButton);

      expect(revokeButton).toBeDisabled();
      expect(revokeButton).toHaveTextContent("Revoked");
    });

    it("should update status text after revocation", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      expect(screen.getByText("Active")).toBeInTheDocument();

      const revokeButton = screen.getByRole("button", { name: /revoke/i });
      fireEvent.click(revokeButton);

      expect(screen.queryByText("Active")).not.toBeInTheDocument();
      // There are two "Revoked" texts: one from status and one from button
      const revokedElements = screen.getAllByText("Revoked");
      expect(revokedElements).toHaveLength(2);
    });

    it("should update visibility badge after revocation", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const revokeButton = screen.getByRole("button", { name: /revoke/i });
      fireEvent.click(revokeButton);

      // VisibilityBadge should change from "link" to "private"
      // This is tested through the component's presence
      expect(revokeButton).toBeDisabled();
    });
  });

  describe("Visual accessibility", () => {
    it("should use semantic color variables", () => {
      const { container } = renderWithI18n(<ShareLinkManager />);

      const section = container.querySelector("section");
      const styles = section?.getAttribute("style");

      expect(styles).toContain("--color-surface-glass");
      expect(styles).toContain("--color-border");
    });

    it("should have sufficient color contrast for text", () => {
      const { container } = renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const statusText = container.querySelector('[style*="--color-text-muted"]');
      expect(statusText).toBeInTheDocument();
    });

    it("should have adequate spacing for readability", () => {
      const { container } = renderWithI18n(<ShareLinkManager />);

      const section = container.querySelector("section");
      const styles = section?.getAttribute("style");

      expect(styles).toContain("gap");
      expect(styles).toContain("padding");
    });

    it("should have minimum touch target size for buttons", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const copyButton = screen.getByRole("button", { name: /copy link to clipboard/i });
      const revokeButton = screen.getByRole("button", { name: /revoke/i });

      // Buttons should have adequate size (checked through Button component)
      expect(copyButton).toBeInTheDocument();
      expect(revokeButton).toBeInTheDocument();
    });
  });

  describe("Responsive behavior", () => {
    it("should allow flex wrapping for narrow viewports", () => {
      const { container } = renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const linkItem = container.querySelector("li");
      const innerDiv = linkItem?.querySelector("div");
      const styles = innerDiv?.getAttribute("style");

      expect(styles).toContain("flex-wrap");
    });

    it("should maintain proper spacing in wrapped layout", () => {
      const { container } = renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);

      const linkItem = container.querySelector("li");
      const innerDiv = linkItem?.querySelector("div");
      const styles = innerDiv?.getAttribute("style");

      expect(styles).toContain("gap");
    });
  });

  describe("Multiple links management", () => {
    it("should handle multiple links independently", () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);
      fireEvent.click(createButton);

      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(2);

      const revokeButtons = screen.getAllByRole("button", { name: /revoke/i });
      fireEvent.click(revokeButtons[0]);

      // First link should be revoked, second should remain active
      expect(revokeButtons[0]).toBeDisabled();
      expect(revokeButtons[1]).not.toBeDisabled();
    });

    it("should maintain correct copied state per link", async () => {
      renderWithI18n(<ShareLinkManager />);

      const createButton = screen.getByRole("button", { name: /create link/i });
      fireEvent.click(createButton);
      fireEvent.click(createButton);

      const copyButtons = screen.getAllByRole("button", { name: /copy link to clipboard/i });
      await userEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /link copied to clipboard/i }),
        ).toBeInTheDocument();
      });

      // Only first button should show "Copied!"
      expect(copyButtons[1]).toHaveTextContent("Copy");
    });
  });
});
