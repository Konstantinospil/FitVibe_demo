import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { updateProfile } from "../../src/services/api";
import { renderSettings, setupSettingsTests } from "./Settings.test.helpers";

describe("Settings - Profile Fields", () => {
  beforeEach(() => setupSettingsTests());

  it("loads profile fields in the Profile tab", async () => {
    renderSettings();
    expect(await screen.findByDisplayValue("Test User")).toBeInTheDocument();
    expect(screen.getByDisplayValue("testalias")).toBeInTheDocument();
    expect(screen.getByDisplayValue("75.5")).toBeInTheDocument();
  });

  it("saves profile changes through the profile API", async () => {
    renderSettings();
    const displayName = await screen.findByDisplayValue("Test User");
    fireEvent.change(displayName, { target: { value: "Updated User" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: "Updated User" }),
      );
    });
  });
});
