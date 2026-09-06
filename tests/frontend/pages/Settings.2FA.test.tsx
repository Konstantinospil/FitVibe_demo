import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { renderSettings, setupSettingsTests } from "./Settings.test.helpers";

describe("Settings - Security", () => {
  beforeEach(() => setupSettingsTests());

  it("shows 2FA controls in the Security tab", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("tab", { name: /Security/i }));
    expect(await screen.findByText(/Two-Factor Authentication/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enable 2FA/i })).toBeInTheDocument();
  });

  it("opens the 2FA setup flow", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("tab", { name: /Security/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Enable 2FA/i }));
    expect(await screen.findByText(/Setup Two-Factor Authentication/i)).toBeInTheDocument();
  });
});
