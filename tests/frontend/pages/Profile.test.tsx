import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import Profile from "../../src/pages/Profile";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  addBioValue,
  addPerfValue,
  addUserAttributeValue,
  createBioAttribute,
  createPerfAttribute,
  getBioAttributes,
  getPerfAttributes,
  getUserAttributes,
  updateBioVisibility,
  updatePerfVisibility,
} from "../../src/services/api";

vi.mock("../../src/services/api", () => ({
  addBioValue: vi.fn(),
  addPerfValue: vi.fn(),
  addUserAttributeValue: vi.fn(),
  createBioAttribute: vi.fn(),
  createPerfAttribute: vi.fn(),
  getBioAttributes: vi.fn(),
  getPerfAttributes: vi.fn(),
  getUserAttributes: vi.fn(),
  updateBioVisibility: vi.fn(),
  updatePerfVisibility: vi.fn(),
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
        "profile.measurements.title": "Body Metrics",
        "profile.measurements.description": "Track body composition",
        "profile.measurements.tabs.biometrical": "Biometrics",
        "profile.measurements.tabs.performance": "Performance",
        "profile.measurements.search.label": "Search metrics",
        "profile.measurements.search.placeholder": "Search metrics...",
        "profile.measurements.search.searching": "Searching...",
        "profile.measurements.search.empty": "No results",
        "profile.measurements.tooltip.unit": "Unit",
        "profile.measurements.tooltip.minMax": "Min/Max",
        "profile.measurements.actions.add": "Add",
        "profile.measurements.actions.remove": "Remove",
        "profile.measurements.create.title": "Create metric",
        "profile.measurements.create.cta": "Create attribute",
        "profile.measurements.create.attributeName": "Attribute name",
        "profile.measurements.create.attributeNamePlaceholder": "e.g. Body fat",
        "profile.measurements.create.unitType": "Unit type",
        "profile.measurements.create.granularity": "Granularity",
        "profile.measurements.create.granularityPlaceholder": "e.g. kg",
        "profile.measurements.create.measurementSystem": "System",
        "profile.measurements.create.minValue": "Min",
        "profile.measurements.create.maxValue": "Max",
        "profile.measurements.create.minValuePlaceholder": "Min value",
        "profile.measurements.create.maxValuePlaceholder": "Max value",
        "profile.measurements.create.ratioToggleLabel": "Derived metric",
        "profile.measurements.create.ratioSourceA": "Source A",
        "profile.measurements.create.ratioSourceB": "Source B",
        "profile.measurements.unitTypes.length": "Length",
        "profile.measurements.unitTypes.weight": "Weight",
        "profile.measurements.unitTypes.volume": "Volume",
        "profile.measurements.unitTypes.ratio": "Ratio",
        "profile.measurements.unitTypes.count": "Count",
        "profile.measurements.unitTypes.time": "Time",
        "profile.measurements.unitTypes.power": "Power",
        "profile.measurements.unitTypes.percentage": "Percentage",
        "profile.measurements.system.metric": "Metric",
        "profile.measurements.system.imperial": "Imperial",
        "profile.measurements.derived": "Derived",
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
          id: "attr-bio",
          key: "biography",
          label: "Biography",
          valueType: "text",
          unit: null,
          latestValue: null,
        },
      ],
    } as any);

    vi.mocked(getBioAttributes).mockResolvedValue({
      attributes: [
        {
          id: "bio-weight",
          key: "weight",
          normalizedKey: "weight",
          label: "Weight",
          description: null,
          unitType: "weight",
          granularity: "kg",
          measurementSystem: "metric",
          minValueMetric: null,
          maxValueMetric: null,
          minValueImperial: null,
          maxValueImperial: null,
          isDefault: true,
          derivedFromAId: null,
          derivedFromBId: null,
          derivedOperator: null,
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
          isVisible: true,
          latestValue: {
            attributeId: "bio-weight",
            valueNumber: 72.5,
            measuredAt: "2025-01-01T00:00:00.000Z",
          },
        },
      ],
    } as any);

    vi.mocked(getPerfAttributes).mockResolvedValue({ attributes: [] } as any);
    vi.mocked(addBioValue).mockResolvedValue({
      latestValue: {
        attributeId: "bio-weight",
        valueNumber: 80,
        measuredAt: "2025-01-02T00:00:00.000Z",
      },
    } as any);
    vi.mocked(addPerfValue).mockResolvedValue({
      latestValue: {
        attributeId: "perf-1",
        valueNumber: 1,
        measuredAt: "2025-01-02T00:00:00.000Z",
      },
    } as any);
    vi.mocked(updateBioVisibility).mockResolvedValue(undefined as any);
    vi.mocked(updatePerfVisibility).mockResolvedValue(undefined as any);
    vi.mocked(createBioAttribute).mockResolvedValue({ attribute: {} } as any);
    vi.mocked(createPerfAttribute).mockResolvedValue({ attribute: {} } as any);
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

    // Achievements section
    expect(screen.getByText("Achievements")).toBeInTheDocument();
    expect(screen.getByText("Track your fitness milestones")).toBeInTheDocument();

    // Social section
    expect(screen.getByText("Social")).toBeInTheDocument();
    expect(screen.getByText("Social details")).toBeInTheDocument();

    // Measurements section
    expect(screen.getByText("Body Metrics")).toBeInTheDocument();
    expect(screen.getByText("Track body composition")).toBeInTheDocument();
  });

  it("renders edit button", async () => {
    renderWithProviders(<Profile />);

    const editButtons = await waitFor(() => screen.getAllByRole("button", { name: "Edit" }), {
      timeout: 3000,
    });
    expect(editButtons.length).toBeGreaterThan(0);
  });

  it("renders fetched attribute fields", async () => {
    renderWithProviders(<Profile />);

    await waitFor(() => {
      expect(screen.getByLabelText("Display Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Date of Birth")).toBeInTheDocument();
      expect(screen.getByLabelText("Biography")).toBeInTheDocument();
      expect(screen.getByLabelText("Weight (kg)")).toBeInTheDocument();
    });
  });

  it("allows editing and saving numeric measurements", async () => {
    renderWithProviders(<Profile />);

    const weightInput = await screen.findByLabelText("Weight (kg)");
    fireEvent.change(weightInput, { target: { value: "80" } });
    fireEvent.blur(weightInput);

    await waitFor(() => {
      expect(addBioValue).toHaveBeenCalledWith("bio-weight", { valueNumber: 80 });
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
