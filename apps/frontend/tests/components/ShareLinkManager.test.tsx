import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import ShareLinkManager from "../../src/components/ShareLinkManager";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "profile.share.title": "Share Links",
        "profile.share.description": "Create shareable links",
        "profile.share.create": "Create Link",
        "profile.share.empty": "No share links yet",
        "profile.share.copy": "Copy",
        "profile.share.copied": "Copied!",
        "profile.share.copyAria": "Copy link",
        "profile.share.copiedAria": "Link copied",
        "profile.share.revoke": "Revoke",
        "profile.share.revoked": "Revoked",
        "profile.share.guards.active": "Active",
        "profile.share.guards.revoked": "Revoked",
      };
      return translations[key] || key;
    },
  }),
}));

describe("ShareLinkManager", () => {
  const mockWriteText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockClear();

    // Mock crypto.randomUUID with unique IDs
    let uuidCounter = 0;
    Object.defineProperty(global, "crypto", {
      value: {
        randomUUID: () => `test-uuid-${++uuidCounter}`,
      },
      configurable: true,
      writable: true,
    });

    // Mock navigator.clipboard - ensure it's properly set up
    if (!navigator.clipboard) {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: mockWriteText,
        },
        configurable: true,
        writable: true,
      });
    } else {
      // If clipboard already exists, replace writeText
      Object.defineProperty(navigator.clipboard, "writeText", {
        value: mockWriteText,
        configurable: true,
        writable: true,
      });
    }
  });

  it("should render share link manager with title and description", () => {
    render(<ShareLinkManager />);

    expect(screen.getByText("Share Links")).toBeInTheDocument();
    expect(screen.getByText("Create shareable links")).toBeInTheDocument();
  });

  it("should display empty state when no links exist", () => {
    render(<ShareLinkManager />);

    expect(screen.getByText("No share links yet")).toBeInTheDocument();
  });

  it("should create a new share link when create button is clicked", async () => {
    const user = userEvent.setup();
    render(<ShareLinkManager />);

    const createButton = screen.getByRole("button", { name: /create link/i });
    await user.click(createButton);

    // Should show the new link
    expect(screen.queryByText("No share links yet")).not.toBeInTheDocument();
    expect(screen.getByText(/https:\/\/fitvibe\.app\/share\//i)).toBeInTheDocument();
  });

  it("should display created share links", async () => {
    const user = userEvent.setup();
    render(<ShareLinkManager />);

    const createButton = screen.getByRole("button", { name: /create link/i });
    await user.click(createButton);

    const shareUrl = screen.getByText(/https:\/\/fitvibe\.app\/share\//i);
    expect(shareUrl).toBeInTheDocument();
    expect(shareUrl.tagName).toBe("CODE");
  });

  it("should copy link to clipboard when copy button is clicked", async () => {
    const user = userEvent.setup();
    render(<ShareLinkManager />);

    // Create a link
    const createButton = screen.getByRole("button", { name: /create link/i });
    await user.click(createButton);

    // Copy the link
    const copyButton = screen.getByRole("button", { name: /copy link/i });
    await user.click(copyButton);

    // Wait for async clipboard operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringMatching(/https:\/\/fitvibe\.app\/share\/[A-Z0-9]+/),
    );
  });

  it("should show copied state after copying", async () => {
    const user = userEvent.setup();
    render(<ShareLinkManager />);

    // Create a link
    const createButton = screen.getByRole("button", { name: /create link/i });
    await user.click(createButton);

    // Copy the link
    const copyButton = screen.getByRole("button", { name: /copy link/i });
    await user.click(copyButton);

    // Should show copied state
    await screen.findByText("Copied!");
    expect(screen.getByRole("button", { name: /link copied/i })).toBeInTheDocument();
  });

  it("should revoke a link when revoke button is clicked", async () => {
    const user = userEvent.setup();
    render(<ShareLinkManager />);

    // Create a link
    const createButton = screen.getByRole("button", { name: /create link/i });
    await user.click(createButton);

    // Revoke the link
    const revokeButton = screen.getByRole("button", { name: /revoke/i });
    await user.click(revokeButton);

    // Should show revoked state - there are multiple "Revoked" texts, so use getAllByText
    const revokedTexts = screen.getAllByText(/revoked/i);
    expect(revokedTexts.length).toBeGreaterThan(0);
  });

  it("should disable copy button when link is revoked", async () => {
    const user = userEvent.setup();
    render(<ShareLinkManager />);

    // Create a link
    const createButton = screen.getByRole("button", { name: /create link/i });
    await user.click(createButton);

    // Revoke the link
    const revokeButton = screen.getByRole("button", { name: /revoke/i });
    await user.click(revokeButton);

    // Copy button should be disabled
    const copyButton = screen.getByRole("button", { name: /copy link/i });
    expect(copyButton).toBeDisabled();
  });

  it("should create multiple links", async () => {
    const user = userEvent.setup();
    render(<ShareLinkManager />);

    // Create first link
    const createButton = screen.getByRole("button", { name: /create link/i });
    await user.click(createButton);

    // Create second link
    await user.click(createButton);

    // Should have multiple links
    const shareUrls = screen.getAllByText(/https:\/\/fitvibe\.app\/share\//i);
    expect(shareUrls.length).toBeGreaterThan(1);
  });

  it("should handle clipboard write errors gracefully", async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Mock clipboard to throw error
    const errorWriteText = vi.fn().mockRejectedValue(new Error("Clipboard error"));
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: errorWriteText,
      },
      configurable: true,
      writable: true,
    });

    render(<ShareLinkManager />);

    // Create a link
    const createButton = screen.getByRole("button", { name: /create link/i });
    await user.click(createButton);

    // Try to copy
    const copyButton = screen.getByRole("button", { name: /copy link/i });
    await user.click(copyButton);

    // Wait for error handling
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should handle error gracefully
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
