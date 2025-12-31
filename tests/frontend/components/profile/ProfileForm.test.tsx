import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const updateProfile = vi.fn();
const showToast = vi.fn();

const t = (key: string) => key;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t,
  }),
}));

vi.mock("../../src/components/ui/Toast", () => ({
  useToast: () => ({
    showToast,
  }),
}));

vi.mock("../../src/services/api", () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUser(...args),
  updateProfile: (...args: unknown[]) => updateProfile(...args),
}));

describe("ProfileForm", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    updateProfile.mockReset();
    showToast.mockReset();
  });

  it("loads profile data and submits updates", async () => {
    const { ProfileForm } = await import("../../src/components/profile/ProfileForm");
    let resolveProfile: (value: unknown) => void = () => {};
    const profilePromise = new Promise((resolve) => {
      resolveProfile = resolve;
    });
    getCurrentUser.mockImplementation(() => profilePromise);
    updateProfile.mockResolvedValue(undefined);
    const onSave = vi.fn();

    render(<ProfileForm onSave={onSave} />);

    await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());
    resolveProfile({
      displayName: "Alex",
      profile: {
        bio: "Runner",
        alias: "alex",
        weight: 70,
        weightUnit: "kg",
        fitnessLevel: "intermediate",
        trainingFrequency: "3_4_per_week",
      },
    });
    const displayNameInput = await screen.findByLabelText("settings.profile.displayName");
    expect(displayNameInput).toHaveValue("Alex");

    const saveButton = await screen.findByRole("button", { name: "common.save" });
    fireEvent.click(saveButton);

    await waitFor(() => expect(updateProfile).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("shows error when profile load fails", async () => {
    const { ProfileForm } = await import("../../src/components/profile/ProfileForm");
    let rejectProfile: (reason?: unknown) => void = () => {};
    const profilePromise = new Promise((_, reject) => {
      rejectProfile = reject;
    });
    getCurrentUser.mockImplementation(() => profilePromise);

    render(<ProfileForm />);
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());
    rejectProfile(new Error("Load failed"));

    expect(await screen.findByText("Load failed")).toBeInTheDocument();
    expect(showToast).toHaveBeenCalled();
  });
});
