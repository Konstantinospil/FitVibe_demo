import { screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderSettings, setupSettingsTests } from "./Settings.test.helpers";

describe("Settings - 2FA", () => {
  beforeEach(() => {
    setupSettingsTests();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  it("shows enable 2FA button when 2FA is disabled", async () => {
    const { container } = renderSettings();

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Enable 2FA");
        expect(Array.from(buttons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("shows 2FA setup when enable button clicked", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    let enableButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Enable 2FA");
        enableButton = Array.from(buttons).find((el) => container.contains(el));
        expect(enableButton).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(enableButton).toBeDefined();
    fireEvent.click(enableButton!);

    await waitFor(
      () => {
        const qrTexts = screen.getAllByText(/Scan this QR code/);
        expect(Array.from(qrTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const placeholders = screen.getAllByPlaceholderText("Enter 6-digit code");
    expect(Array.from(placeholders).find((el) => container.contains(el))).toBeInTheDocument();
  });

  it("disables verify button when code is not 6 digits", async () => {
    const { container } = renderSettings();

    let enableButton: HTMLElement | undefined;
    let codeInput: HTMLElement | undefined;
    let verifyButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Enable 2FA");
        enableButton = Array.from(buttons).find((el) => container.contains(el));
        expect(enableButton).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(enableButton).toBeDefined();
    fireEvent.click(enableButton!);

    await waitFor(
      () => {
        const placeholders = screen.getAllByPlaceholderText("Enter 6-digit code");
        codeInput = Array.from(placeholders).find((el) => container.contains(el));
        expect(codeInput).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(codeInput).toBeDefined();
    fireEvent.change(codeInput!, { target: { value: "123" } });

    await waitFor(
      () => {
        const verifyButtons = screen.getAllByRole("button", { name: /verify/i });
        verifyButton = Array.from(verifyButtons).find((el) => container.contains(el));
        expect(verifyButton).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(verifyButton).toBeDefined();
    expect(verifyButton!).toBeDisabled();
  });

  it("enables 2FA after successful verification", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    let enableButton: HTMLElement | undefined;
    let codeInput: HTMLElement | undefined;
    let verifyButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Enable 2FA");
        enableButton = Array.from(buttons).find((el) => container.contains(el));
        expect(enableButton).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(enableButton).toBeDefined();
    fireEvent.click(enableButton!);

    await waitFor(
      () => {
        const placeholders = screen.getAllByPlaceholderText("Enter 6-digit code");
        codeInput = Array.from(placeholders).find((el) => container.contains(el));
        expect(codeInput).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(codeInput).toBeDefined();
    fireEvent.change(codeInput!, { target: { value: "123456" } });

    await waitFor(
      () => {
        const verifyButtons = screen.getAllByText("Verify and Enable");
        verifyButton = Array.from(verifyButtons).find((el) => container.contains(el));
        expect(verifyButton).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(verifyButton).toBeDefined();
    fireEvent.click(verifyButton!);

    // Check for toast notification instead of alert
    await waitFor(
      () => {
        const successMessages = screen.getAllByText("2FA enabled successfully!");
        expect(
          Array.from(successMessages).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await waitFor(
      () => {
        const statusTexts = screen.getAllByText(/2FA is currently/);
        expect(Array.from(statusTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});

