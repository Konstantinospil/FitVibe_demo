import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { renderSettings, setupSettingsTests } from "./Settings.test.helpers";

describe("Settings - Account", () => {
  beforeEach(() => setupSettingsTests());

  it("places account deletion in the Privacy tab", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("tab", { name: /Privacy/i }));
    expect(await screen.findByText(/Delete Account/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete My Account/i })).toBeInTheDocument();
  });

  it("opens the account deletion confirmation", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("tab", { name: /Privacy/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Delete My Account/i }));
    expect(await screen.findByText(/Confirm Account Deletion/i)).toBeInTheDocument();
  });
});
