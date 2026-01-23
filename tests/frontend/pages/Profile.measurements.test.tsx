import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Profile from "../../src/pages/Profile";
import {
  addBioValue,
  addPerfValue,
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
        "profile.sections.achievements.title": "Achievements",
        "profile.sections.achievements.description": "Track your fitness milestones",
        "profile.social.title": "Social",
        "profile.social.description": "Social details",
        "profile.body.mapAriaLabel": "Body map",
        "profile.body.mapLabel": "Measurement guide",
        "profile.body.note": "Body measurements are optional.",
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
        "profile.measurements.create.granularityPlaceholder": "e.g. cm",
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
        "common.saving": "Saving...",
      },
    },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>);
};

const baseBioAttributes = [
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
      valueNumber: 70,
      measuredAt: "2025-01-01T00:00:00.000Z",
    },
  },
  {
    id: "bio-waist",
    key: "waist",
    normalizedKey: "waist",
    label: "Waist",
    description: null,
    unitType: "length",
    granularity: "cm",
    measurementSystem: "metric",
    minValueMetric: null,
    maxValueMetric: null,
    minValueImperial: null,
    maxValueImperial: null,
    isDefault: false,
    derivedFromAId: null,
    derivedFromBId: null,
    derivedOperator: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    isVisible: true,
    latestValue: null,
  },
];

describe("Profile measurements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserAttributes).mockResolvedValue({ attributes: [] } as any);
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
        attributeId: "perf-speed",
        valueNumber: 12,
        measuredAt: "2025-01-02T00:00:00.000Z",
      },
    } as any);
    vi.mocked(updateBioVisibility).mockResolvedValue(undefined as any);
    vi.mocked(updatePerfVisibility).mockResolvedValue(undefined as any);
  });

  it("shows search results and toggles visibility for biometrics", async () => {
    const searchAttribute = {
      ...baseBioAttributes[1],
      id: "bio-waist-search",
      isVisible: false,
    };
    vi.mocked(getBioAttributes).mockImplementation(async (params) => {
      if (params?.q) {
        return { attributes: [searchAttribute] } as any;
      }
      return { attributes: baseBioAttributes } as any;
    });

    renderWithProviders(<Profile />);

    const searchInput = await screen.findByLabelText("Search metrics");
    fireEvent.change(searchInput, { target: { value: "Waist" } });

    const result = await screen.findByText("Waist");
    expect(result).toBeInTheDocument();

    const resultRow = result.closest(".profile-measurements-result");
    expect(resultRow).toBeTruthy();
    const addButton = within(resultRow!).getByRole("button", { name: "Add" });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(updateBioVisibility).toHaveBeenCalledWith("bio-waist-search", true);
      expect(within(resultRow!).getByRole("button", { name: "Remove" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Create attribute" })).not.toBeInTheDocument();
  });

  it("creates a derived measurement attribute", async () => {
    vi.mocked(getBioAttributes).mockImplementation(async (params) => {
      if (params?.q) {
        return { attributes: [] } as any;
      }
      return { attributes: baseBioAttributes } as any;
    });
    vi.mocked(createBioAttribute).mockResolvedValue({
      attribute: {
        ...baseBioAttributes[0],
        id: "bio-ratio",
        key: "waist_ratio",
        normalizedKey: "waist ratio",
        label: "Waist Ratio",
        derivedOperator: "ratio",
        derivedFromAId: "bio-waist",
        derivedFromBId: "bio-weight",
        isVisible: false,
      },
    } as any);

    renderWithProviders(<Profile />);

    const searchInput = await screen.findByLabelText("Search metrics");
    fireEvent.change(searchInput, { target: { value: "Waist Ratio" } });

    const createLabel = await screen.findByLabelText("Attribute name");
    fireEvent.change(createLabel, { target: { value: "Waist Ratio" } });

    fireEvent.click(screen.getByLabelText("Derived metric"));
    fireEvent.change(screen.getByLabelText("Source A"), { target: { value: "bio-waist" } });
    fireEvent.change(screen.getByLabelText("Source B"), { target: { value: "bio-weight" } });

    fireEvent.click(screen.getByRole("button", { name: "Create attribute" }));

    await waitFor(() => {
      expect(createBioAttribute).toHaveBeenCalledWith({
        label: "Waist Ratio",
        unitType: "ratio",
        granularity: "ratio",
        measurementSystem: "metric",
        minValue: undefined,
        maxValue: undefined,
        derivedFromAId: "bio-waist",
        derivedFromBId: "bio-weight",
        derivedOperator: "ratio",
      });
      expect(updateBioVisibility).toHaveBeenCalledWith("bio-ratio", true);
    });
  });

  it("creates a non-derived measurement attribute with limits", async () => {
    vi.mocked(getBioAttributes).mockResolvedValue({ attributes: baseBioAttributes } as any);
    vi.mocked(createBioAttribute).mockResolvedValue({
      attribute: {
        ...baseBioAttributes[0],
        id: "bio-calf",
        key: "calf",
        normalizedKey: "calf",
        label: "Calf",
        granularity: "cm",
        unitType: "length",
        isVisible: false,
      },
    } as any);

    renderWithProviders(<Profile />);

    const searchInput = await screen.findByLabelText("Search metrics");
    fireEvent.change(searchInput, { target: { value: "Calf" } });

    const createLabel = await screen.findByLabelText("Attribute name");
    fireEvent.change(createLabel, { target: { value: "Calf" } });

    fireEvent.change(screen.getByLabelText("Granularity"), { target: { value: "cm" } });
    fireEvent.change(screen.getByLabelText("Min"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Max"), { target: { value: "200" } });

    fireEvent.click(screen.getByRole("button", { name: "Create attribute" }));

    await waitFor(() => {
      expect(createBioAttribute).toHaveBeenCalledWith({
        label: "Calf",
        unitType: "length",
        granularity: "cm",
        measurementSystem: "metric",
        minValue: 20,
        maxValue: 200,
        derivedFromAId: undefined,
        derivedFromBId: undefined,
        derivedOperator: undefined,
      });
      expect(updateBioVisibility).toHaveBeenCalledWith("bio-calf", true);
    });
  });

  it("renders derived measurements as read-only values", async () => {
    vi.mocked(getBioAttributes).mockResolvedValue({
      attributes: [
        {
          ...baseBioAttributes[0],
          id: "bio-derived",
          key: "waist_ratio",
          normalizedKey: "waist ratio",
          label: "Waist Ratio",
          derivedOperator: "ratio",
          derivedFromAId: "bio-waist",
          derivedFromBId: "bio-weight",
          latestValue: {
            attributeId: "bio-derived",
            valueNumber: 0.5,
            measuredAt: "2025-01-01T00:00:00.000Z",
          },
        },
      ],
    } as any);

    renderWithProviders(<Profile />);

    const derivedInput = await screen.findByLabelText("Waist Ratio (%)");
    expect(derivedInput).toHaveValue(50);
    expect(derivedInput).toHaveAttribute("readonly");
    const addButton = screen.getByLabelText("Add");
    expect(addButton).toBeDisabled();
  });

  it("saves performance measurements on blur", async () => {
    vi.mocked(getBioAttributes).mockResolvedValue({ attributes: baseBioAttributes } as any);
    vi.mocked(getPerfAttributes).mockResolvedValue({
      attributes: [
        {
          id: "perf-speed",
          key: "speed",
          normalizedKey: "speed",
          label: "Speed",
          description: null,
          unitType: "count",
          granularity: "rpm",
          measurementSystem: "metric",
          minValueMetric: null,
          maxValueMetric: null,
          minValueImperial: null,
          maxValueImperial: null,
          isDefault: false,
          derivedFromAId: null,
          derivedFromBId: null,
          derivedOperator: null,
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
          isVisible: true,
          latestValue: {
            attributeId: "perf-speed",
            valueNumber: 10,
            measuredAt: "2025-01-01T00:00:00.000Z",
          },
        },
      ],
    } as any);

    renderWithProviders(<Profile />);

    fireEvent.click(await screen.findByText("Performance"));

    const perfInput = await screen.findByLabelText("Speed (rpm)");
    fireEvent.change(perfInput, { target: { value: "12" } });
    fireEvent.blur(perfInput);

    await waitFor(() => {
      expect(addPerfValue).toHaveBeenCalledWith("perf-speed", { valueNumber: 12 });
    });
  });
});
