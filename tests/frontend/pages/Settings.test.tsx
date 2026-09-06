import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { getCurrentUser } from "../../src/services/api";
import { renderSettings, setupSettingsTests } from "./Settings.test.helpers";

describe("Settings", () => {
  beforeEach(() => {
    setupSettingsTests();
  });

  it("renders the modular settings navigation", async () => {
    renderSettings();

    expect(screen.getByRole("tab", { name: /Profile/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Progress/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Security/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Privacy/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(getCurrentUser).toHaveBeenCalled();
      expect(screen.getByDisplayValue("Test User")).toBeInTheDocument();
      expect(screen.getByDisplayValue("testalias")).toBeInTheDocument();
    });
  });

  it("shows body progress in the Progress tab", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("tab", { name: /Progress/i }));

    expect(await screen.findByText(/Weight history/i)).toBeInTheDocument();
    expect(screen.getByText(/Progress photos/i)).toBeInTheDocument();
  });

  it("shows security and session management in the Security tab", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("tab", { name: /Security/i }));

    expect(await screen.findByText(/Security Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Two-Factor Authentication/i)).toBeInTheDocument();
  });

  it("shows privacy, export and account controls in the Privacy tab", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("tab", { name: /Privacy/i }));

    expect(await screen.findByText(/Privacy Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Delete Account/i)).toBeInTheDocument();
  });
});
