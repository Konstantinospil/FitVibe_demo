import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import Profile from "../../src/pages/Profile";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { addUserAttributeValue, getUserAttributes } from "../../src/services/api";

vi.mock("../../src/services/api", () => ({
  addUserAttributeValue: vi.fn(),
  getUserAttributes: vi.fn(),
}));

vi.mock("../../src/utils/logger", () => ({
  logger: {
    apiError: vi.fn(),
  },
}));

// Initialize i18n for tests
const testI18n = i18n.createInstance();
void testI18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        "profile.eyebrow": "Your Profile",
        "profile.title": "Profile Settings",
        "profile.description": "Manage your profile and preferences",
        "profile.sections.visibility.title": "Privacy & Visibility",
        "profile.sections.visibility.description": "Control who can see your workouts",
        "profile.sections.units.title": "Units & Preferences",
        "profile.sections.units.description": "Choose metric or imperial",
        "profile.sections.achievements.title": "Achievements",
        "profile.sections.achievements.description": "Track your fitness milestones",
        "profile.edit": "Edit Profile",
        "profile.social.title": "Social",
        "profile.social.description": "Social details",
        "profile.body.title": "Body Metrics",
        "profile.body.description": "Track body composition",
        "profile.body.mapAriaLabel": "Body map",
        "profile.body.mapLabel": "Measurement guide",
        "profile.body.note": "Body measurements are optional.",
        "profile.performance.title": "Performance",
        "profile.performance.description": "Track personal records",
        "common.edit": "Edit",
        "common.save": "Save",
        "common.cancel": "Cancel",
        "common.saving": "Saving...",
      },
    },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>);
};

describe("Profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserAttributes).mockResolvedValue({
      attributes: [
        {
          id: "attr-display",
          key: "display_name",
          label: "Display Name",
          valueType: "text",
          unit: null,
          latestValue: { valueText: "Alex", valueNumber: null, valueDate: null },
        },
        {
          id: "attr-dob",
          key: "date_of_birth",
          label: "Date of Birth",
          valueType: "date",
          unit: null,
          latestValue: { valueText: null, valueNumber: null, valueDate: "1990-01-01" },
        },
        {
          id: "attr-weight",
          key: "weight_kg",
          label: "Weight",
          valueType: "number",
          unit: "kg",
          latestValue: { valueText: null, valueNumber: 72.5, valueDate: null },
        },
        {
          id: "attr-bio",
          key: "biography",
          label: "Biography",
          valueType: "text",
          unit: null,
          latestValue: null,
        },
      ],
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders profile page with title and description", () => {
    renderWithProviders(<Profile />);

    expect(screen.getByText("Your Profile")).toBeInTheDocument();
    expect(screen.getByText("Profile Settings")).toBeInTheDocument();
    expect(screen.getByText("Manage your profile and preferences")).toBeInTheDocument();
  });

  it("displays all profile sections", () => {
    renderWithProviders(<Profile />);

    // Visibility section
    expect(screen.getByText("Privacy & Visibility")).toBeInTheDocument();
    expect(screen.getByText("Control who can see your workouts")).toBeInTheDocument();

    // Units section
    expect(screen.getByText("Units & Preferences")).toBeInTheDocument();
    expect(screen.getByText("Choose metric or imperial")).toBeInTheDocument();

    // Achievements section
    expect(screen.getByText("Achievements")).toBeInTheDocument();
    expect(screen.getByText("Track your fitness milestones")).toBeInTheDocument();
  });

  it("renders edit button", async () => {
    renderWithProviders(<Profile />);

    // Wait for button to be rendered (component might render asynchronously)
    const editButton = await waitFor(() => screen.getByRole("button", { name: /edit profile/i }), {
      timeout: 3000,
    });
    expect(editButton).toBeInTheDocument();
  });

  it("renders fetched attribute fields", async () => {
    renderWithProviders(<Profile />);

    await waitFor(() => {
      expect(screen.getByLabelText("Display Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Date of Birth")).toBeInTheDocument();
      expect(screen.getByLabelText("Weight (kg)")).toBeInTheDocument();
      expect(screen.getByLabelText("Biography")).toBeInTheDocument();
    });
  });

  it("allows editing and saving numeric attributes", async () => {
    vi.mocked(addUserAttributeValue).mockResolvedValue({
      latestValue: { valueText: null, valueNumber: 80, valueDate: null },
    } as any);

    renderWithProviders(<Profile />);

    const weightInput = await screen.findByLabelText("Weight (kg)");
    const weightRow = weightInput.closest(".profile-attribute-row");
    expect(weightRow).toBeInTheDocument();

    const editButton = weightRow!.querySelector("button");
    expect(editButton).toBeInTheDocument();
    fireEvent.click(editButton!);

    fireEvent.change(weightInput, { target: { value: "80" } });
    const saveButton = screen.getByRole("button", { name: "Save" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(addUserAttributeValue).toHaveBeenCalledWith("attr-weight", { valueNumber: 80 });
    });
  });

  it("allows editing and saving textarea attributes", async () => {
    vi.mocked(addUserAttributeValue).mockResolvedValue({
      latestValue: { valueText: "Updated bio", valueNumber: null, valueDate: null },
    } as any);

    renderWithProviders(<Profile />);

    const bioInput = await screen.findByLabelText("Biography");
    const bioRow = bioInput.closest(".profile-attribute-row");
    expect(bioRow).toBeInTheDocument();

    const editButton = bioRow!.querySelector("button");
    expect(editButton).toBeInTheDocument();
    fireEvent.click(editButton!);

    fireEvent.change(bioInput, { target: { value: "Updated bio" } });
    const saveButton = screen.getByRole("button", { name: "Save" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(addUserAttributeValue).toHaveBeenCalledWith("attr-bio", { valueText: "Updated bio" });
    });
  });
});
