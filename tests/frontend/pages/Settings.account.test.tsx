import { screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { apiClient } from "../../src/services/api";
import { renderSettings, setupSettingsTests, mockSignOut, mockNavigate } from "./Settings.test.helpers";

describe("Settings - Account Deletion", () => {
  beforeEach(() => {
    setupSettingsTests();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  it("shows delete account confirmation when delete button clicked", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    let deleteButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Delete My Account");
        deleteButton = Array.from(buttons).find((el) => container.contains(el));
        expect(deleteButton).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(deleteButton).toBeDefined();
    fireEvent.click(deleteButton!);

    await waitFor(
      () => {
        const warnings = screen.getAllByText(
          /⚠️ Warning: This will permanently delete your account/,
        );
        expect(Array.from(warnings).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const placeholders = screen.getAllByPlaceholderText("Enter your password");
    expect(Array.from(placeholders).find((el) => container.contains(el))).toBeInTheDocument();
  });

  it("allows cancelling account deletion", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    let deleteButton: HTMLElement | undefined;
    let cancelButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Delete My Account");
        deleteButton = Array.from(buttons).find((el) => container.contains(el));
        expect(deleteButton).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(deleteButton).toBeDefined();
    fireEvent.click(deleteButton!);

    await waitFor(
      () => {
        const cancelButtons = screen.getAllByText("Cancel");
        cancelButton = Array.from(cancelButtons).find((el) => container.contains(el));
        expect(cancelButton).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(cancelButton).toBeDefined();
    fireEvent.click(cancelButton!);

    await waitFor(
      () => {
        expect(screen.queryByPlaceholderText("Enter your password")).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("disables delete button when no password entered", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    let deleteAccountButton: HTMLElement | undefined;
    let deleteButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Delete My Account");
        deleteAccountButton = Array.from(buttons).find((el) => container.contains(el));
        expect(deleteAccountButton).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(deleteAccountButton).toBeDefined();
    fireEvent.click(deleteAccountButton!);

    await waitFor(
      () => {
        const yesButtons = screen.getAllByRole("button", { name: /yes, delete my account/i });
        deleteButton = Array.from(yesButtons).find((el) => container.contains(el));
        expect(deleteButton).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(deleteButton).toBeDefined();
    expect(deleteButton!).toBeDisabled();
  });

  it("deletes account when confirmed with password", async () => {
    const { mockDelete } = setupSettingsTests();
    mockDelete.mockResolvedValue({ data: {} });
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    let deleteAccountButton: HTMLElement | undefined;
    let passwordInput: HTMLElement | undefined;
    let yesButton: HTMLElement | undefined;
    let confirmButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Delete My Account");
        deleteAccountButton = Array.from(buttons).find((el) => container.contains(el));
        expect(deleteAccountButton).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(deleteAccountButton).toBeDefined();
    fireEvent.click(deleteAccountButton!);

    await waitFor(
      () => {
        const placeholders = screen.getAllByPlaceholderText("Enter your password");
        passwordInput = Array.from(placeholders).find((el) => container.contains(el));
        expect(passwordInput).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(passwordInput).toBeDefined();
    fireEvent.change(passwordInput!, { target: { value: "mypassword" } });

    // Wait for the button to be enabled after entering password
    await waitFor(
      () => {
        const yesButtons = screen.getAllByText("Yes, Delete My Account");
        yesButton = Array.from(yesButtons).find((el) => container.contains(el));
        expect(yesButton).toBeDefined();
        expect(yesButton!).not.toBeDisabled();
      },
      { timeout: 5000 },
    );

    expect(yesButton).toBeDefined();
    fireEvent.click(yesButton!);

    // Wait for ConfirmDialog to appear
    await waitFor(
      () => {
        const confirmButtons = screen.getAllByRole("button", { name: /confirm delete/i });
        confirmButton = Array.from(confirmButtons).find((el) => container.contains(el));
        expect(confirmButton).toBeDefined();
      },
      { timeout: 5000 },
    );

    expect(confirmButton).toBeDefined();
    fireEvent.click(confirmButton!);

    // Now the API should be called - wait longer for async operation
    await waitFor(
      () => {
        expect(mockDelete).toHaveBeenCalledWith("/api/v1/users/me", {
          data: { password: "mypassword" },
        });
      },
      { timeout: 10000 },
    );

    // Wait for setTimeout to execute (2000ms delay) - the toast should appear during this time
    await waitFor(
      () => {
        expect(mockSignOut).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );

    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith("/");
      },
      { timeout: 5000 },
    );
  });

  it("does not delete account when confirmation declined", async () => {
    const { mockDelete } = setupSettingsTests();
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    let deleteAccountButton: HTMLElement | undefined;
    let passwordInput: HTMLElement | undefined;
    let yesButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Delete My Account");
        deleteAccountButton = Array.from(buttons).find((el) => container.contains(el));
        expect(deleteAccountButton).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(deleteAccountButton).toBeDefined();
    fireEvent.click(deleteAccountButton!);

    await waitFor(
      () => {
        const placeholders = screen.getAllByPlaceholderText("Enter your password");
        passwordInput = Array.from(placeholders).find((el) => container.contains(el));
        expect(passwordInput).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(passwordInput).toBeDefined();
    fireEvent.change(passwordInput!, { target: { value: "mypassword" } });

    // Click the button that opens the confirmation dialog
    await waitFor(
      () => {
        const yesButtons = screen.getAllByText("Yes, Delete My Account");
        yesButton = Array.from(yesButtons).find((el) => container.contains(el));
        expect(yesButton).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(yesButton).toBeDefined();
    fireEvent.click(yesButton!);

    // Wait for ConfirmDialog to appear and click Cancel
    await waitFor(
      () => {
        const deleteTexts = screen.getAllByText("Delete Account");
        expect(Array.from(deleteTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // Get all Cancel buttons and click the one in the dialog (last one)
    const cancelButtons = screen.getAllByText("Cancel");
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    // Dialog should close and delete should not be called
    await waitFor(
      () => {
        expect(screen.queryByText("Delete Account")).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("shows error when account deletion fails", async () => {
    const { mockDelete } = setupSettingsTests();
    mockDelete.mockRejectedValue(new Error("Delete failed"));

    const { container } = renderSettings();

    let deleteAccountButton: HTMLElement | undefined;
    let passwordInput: HTMLElement | undefined;
    let yesButton: HTMLElement | undefined;
    let confirmButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Delete My Account");
        deleteAccountButton = Array.from(buttons).find((el) => container.contains(el));
        expect(deleteAccountButton).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(deleteAccountButton).toBeDefined();
    fireEvent.click(deleteAccountButton!);

    await waitFor(
      () => {
        const placeholders = screen.getAllByPlaceholderText("Enter your password");
        passwordInput = Array.from(placeholders).find((el) => container.contains(el));
        expect(passwordInput).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(passwordInput).toBeDefined();
    fireEvent.change(passwordInput!, { target: { value: "mypassword" } });

    // Click the button that opens the confirmation dialog
    await waitFor(
      () => {
        const yesButtons = screen.getAllByText("Yes, Delete My Account");
        yesButton = Array.from(yesButtons).find((el) => container.contains(el));
        expect(yesButton).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(yesButton).toBeDefined();
    fireEvent.click(yesButton!);

    // Wait for ConfirmDialog to appear and click confirm
    await waitFor(
      () => {
        const confirmButtons = screen.getAllByRole("button", { name: /confirm delete/i });
        confirmButton = Array.from(confirmButtons).find((el) => container.contains(el));
        expect(confirmButton).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(confirmButton).toBeDefined();
    fireEvent.click(confirmButton!);

    // Check for error toast instead of alert
    await waitFor(
      () => {
        const errorMessages = screen.getAllByText("Failed to delete account. Please try again.");
        expect(Array.from(errorMessages).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});

