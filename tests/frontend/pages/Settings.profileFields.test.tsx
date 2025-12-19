import { screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { apiClient } from "../../src/services/api";
import { renderSettings, setupSettingsTests, mockUserData } from "./Settings.test.helpers";

describe("Settings - Profile Fields (FR-009)", () => {
  beforeEach(() => {
    setupSettingsTests();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  it("loads profile data with new fields", async () => {
    const { mockGet } = setupSettingsTests();
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await waitFor(
      () => {
        expect(mockGet).toHaveBeenCalledWith("/api/v1/users/me");
      },
      { timeout: 2000 },
    );

    await waitFor(
      () => {
        const aliasValues = screen.getAllByDisplayValue("testalias");
        expect(Array.from(aliasValues).find((el) => container.contains(el))).toBeInTheDocument();
        const weightValues = screen.getAllByDisplayValue("75.5");
        expect(Array.from(weightValues).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("allows changing alias", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await waitFor(
      () => {
        const placeholders = screen.getAllByPlaceholderText("Your public alias");
        expect(Array.from(placeholders).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const placeholders = screen.getAllByPlaceholderText("Your public alias");
    const aliasInput = Array.from(placeholders).find((el) => container.contains(el))!;
    fireEvent.change(aliasInput, { target: { value: "newalias" } });

    expect(aliasInput).toHaveValue("newalias");
  });

  it("allows changing weight", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    let weightInput: HTMLInputElement | undefined;
    await waitFor(
      () => {
        const labels = screen.queryAllByLabelText("Weight");
        const label = Array.from(labels).find((el) => container.contains(el));
        if (label && label.getAttribute("for")) {
          weightInput = container.querySelector(
            `#${label.getAttribute("for")}`,
          ) as HTMLInputElement;
        }
        if (!weightInput) {
          weightInput = container.querySelector("#weight") as HTMLInputElement;
        }
        expect(weightInput).toBeDefined();
        expect(weightInput).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    expect(weightInput).toBeDefined();
    fireEvent.change(weightInput!, { target: { value: "80" } });

    expect(weightInput!.value).toBe("80");
  });

  it("allows changing weight unit", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    let unitSelect: HTMLSelectElement | undefined;
    await waitFor(
      () => {
        const labels = screen.queryAllByLabelText("Weight Unit");
        const label = Array.from(labels).find((el) => container.contains(el));
        if (label && label.getAttribute("for")) {
          unitSelect = container.querySelector(
            `#${label.getAttribute("for")}`,
          ) as HTMLSelectElement;
        }
        if (!unitSelect) {
          unitSelect = container.querySelector("#weight-unit") as HTMLSelectElement;
        }
        expect(unitSelect).toBeDefined();
        expect(unitSelect).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    expect(unitSelect).toBeDefined();
    fireEvent.change(unitSelect!, { target: { value: "lb" } });

    expect(unitSelect!.value).toBe("lb");
  });

  it("allows changing fitness level", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    let fitnessSelect: HTMLSelectElement | undefined;
    await waitFor(
      () => {
        const labels = screen.queryAllByLabelText("Fitness Level");
        const label = Array.from(labels).find((el) => container.contains(el));
        if (label && label.getAttribute("for")) {
          fitnessSelect = container.querySelector(
            `#${label.getAttribute("for")}`,
          ) as HTMLSelectElement;
        }
        if (!fitnessSelect) {
          fitnessSelect = container.querySelector("#fitness-level") as HTMLSelectElement;
        }
        expect(fitnessSelect).toBeDefined();
        expect(fitnessSelect).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    expect(fitnessSelect).toBeDefined();
    fireEvent.change(fitnessSelect!, { target: { value: "advanced" } });

    expect(fitnessSelect!.value).toBe("advanced");
  });

  it("allows changing training frequency", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    let frequencySelect: HTMLSelectElement | undefined;
    await waitFor(
      () => {
        const labels = screen.queryAllByLabelText("Training Frequency");
        const label = Array.from(labels).find((el) => container.contains(el));
        if (label && label.getAttribute("for")) {
          frequencySelect = container.querySelector(
            `#${label.getAttribute("for")}`,
          ) as HTMLSelectElement;
        }
        if (!frequencySelect) {
          frequencySelect = container.querySelector("#training-frequency") as HTMLSelectElement;
        }
        expect(frequencySelect).toBeDefined();
        expect(frequencySelect).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    expect(frequencySelect).toBeDefined();
    fireEvent.change(frequencySelect!, { target: { value: "5_plus_per_week" } });

    expect(frequencySelect!.value).toBe("5_plus_per_week");
  });

  it("saves profile fields when save button clicked", async () => {
    const { mockPatch } = setupSettingsTests();
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await waitFor(
      () => {
        const savePrefs = screen.getAllByText("Save Preferences");
        expect(Array.from(savePrefs).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const aliasPlaceholders = screen.getAllByPlaceholderText("Your public alias");
    const aliasInput = Array.from(aliasPlaceholders).find((el) => container.contains(el))!;
    fireEvent.change(aliasInput, { target: { value: "newalias" } });

    const weightLabels = screen.queryAllByLabelText("Weight");
    const weightLabel = Array.from(weightLabels).find((el) => container.contains(el));
    const weightInput =
      weightLabel && weightLabel.getAttribute("for")
        ? (container.querySelector(`#${weightLabel.getAttribute("for")}`) as HTMLInputElement)
        : (container.querySelector("#weight") as HTMLInputElement);
    fireEvent.change(weightInput, { target: { value: "80" } });

    const fitnessLabels = screen.queryAllByLabelText("Fitness Level");
    const fitnessLabel = Array.from(fitnessLabels).find((el) => container.contains(el));
    const fitnessSelect =
      fitnessLabel && fitnessLabel.getAttribute("for")
        ? (container.querySelector(`#${fitnessLabel.getAttribute("for")}`) as HTMLSelectElement)
        : (container.querySelector("#fitness-level") as HTMLSelectElement);
    fireEvent.change(fitnessSelect, { target: { value: "advanced" } });

    const savePrefs = screen.getAllByText("Save Preferences");
    const saveButton = Array.from(savePrefs).find((el) => container.contains(el))!;
    fireEvent.click(saveButton);

    await waitFor(
      () => {
        expect(mockPatch).toHaveBeenCalledWith(
          "/api/v1/users/me",
          expect.objectContaining({
            alias: "newalias",
            weight: 80,
            weightUnit: "kg",
            fitnessLevel: "advanced",
          }),
        );
      },
      { timeout: 2000 },
    );
  });

  it("saves weight with unit conversion (lb to kg)", async () => {
    const { mockPatch } = setupSettingsTests();
    const { container } = renderSettings();

    // Wait for component to render - check for Settings title
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await waitFor(
      () => {
        const savePrefs = screen.getAllByText("Save Preferences");
        expect(Array.from(savePrefs).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const weightLabels = screen.queryAllByLabelText("Weight");
    const weightLabel = Array.from(weightLabels).find((el) => container.contains(el));
    const weightInput =
      weightLabel && weightLabel.getAttribute("for")
        ? (container.querySelector(`#${weightLabel.getAttribute("for")}`) as HTMLInputElement)
        : (container.querySelector("#weight") as HTMLInputElement);
    fireEvent.change(weightInput, { target: { value: "165.5" } });

    const unitLabels = screen.queryAllByLabelText("Weight Unit");
    const unitLabel = Array.from(unitLabels).find((el) => container.contains(el));
    const unitSelect =
      unitLabel && unitLabel.getAttribute("for")
        ? (container.querySelector(`#${unitLabel.getAttribute("for")}`) as HTMLSelectElement)
        : (container.querySelector("#weight-unit") as HTMLSelectElement);
    fireEvent.change(unitSelect, { target: { value: "lb" } });

    const savePrefs = screen.getAllByText("Save Preferences");
    const saveButton = Array.from(savePrefs).find((el) => container.contains(el))!;
    fireEvent.click(saveButton);

    await waitFor(
      () => {
        expect(mockPatch).toHaveBeenCalledWith(
          "/api/v1/users/me",
          expect.objectContaining({
            weight: 165.5,
            weightUnit: "lb",
          }),
        );
      },
      { timeout: 2000 },
    );
  });

  it("reloads user data after successful save", async () => {
    const { mockGet } = setupSettingsTests();
    const { container } = renderSettings();

    // Wait for component to render - check for Settings title
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await waitFor(
      () => {
        const savePrefs = screen.getAllByText("Save Preferences");
        expect(Array.from(savePrefs).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const savePrefs = screen.getAllByText("Save Preferences");
    const saveButton = Array.from(savePrefs).find((el) => container.contains(el))!;
    fireEvent.click(saveButton);

    await waitFor(
      () => {
        // Should be called twice: once on mount, once after save
        expect(mockGet).toHaveBeenCalledTimes(2);
      },
      { timeout: 2000 },
    );
  });

  it("handles profile data when profile is null", async () => {
    const { mockGet } = setupSettingsTests();
    mockGet.mockResolvedValue({
      data: {
        ...mockUserData,
        profile: null,
      },
    });

    const { container } = renderSettings();

    // Wait for component to render - check for Settings title
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await waitFor(
      () => {
        const placeholders = screen.getAllByPlaceholderText("Your public alias");
        expect(Array.from(placeholders).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const placeholders = screen.getAllByPlaceholderText("Your public alias");
    const aliasInput = Array.from(placeholders).find((el) => container.contains(el))!;
    expect(aliasInput).toHaveValue("");
  });

  it("handles weight conversion display when loading from API", async () => {
    const { mockGet } = setupSettingsTests();
    mockGet.mockResolvedValue({
      data: {
        ...mockUserData,
        profile: {
          ...mockUserData.profile,
          weight: 75.07, // kg (converted from 165.5 lb)
          weightUnit: "lb",
        },
      },
    });

    const { container } = renderSettings();

    // Wait for component to render - check for Settings title
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await waitFor(
      () => {
        const labels = screen.queryAllByLabelText("Weight");
        const label = Array.from(labels).find((el) => container.contains(el));
        const weightInput =
          label && label.getAttribute("for")
            ? (container.querySelector(`#${label.getAttribute("for")}`) as HTMLInputElement)
            : (container.querySelector("#weight") as HTMLInputElement);
        expect(weightInput).toBeDefined();
        // Should display in lb (165.5), not kg
        expect(parseFloat(weightInput.value)).toBeCloseTo(165.5, 1);
      },
      { timeout: 2000 },
    );
  });

  it("saves all new profile fields together", async () => {
    const { mockPatch } = setupSettingsTests();
    const { container } = renderSettings();

    // Wait for component to render - check for Settings title
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(
          Array.from(settingsTexts).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    await waitFor(
      () => {
        const savePrefs = screen.getAllByText("Save Preferences");
        expect(Array.from(savePrefs).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    const aliasPlaceholders = screen.getAllByPlaceholderText("Your public alias");
    const aliasInput = Array.from(aliasPlaceholders).find((el) => container.contains(el))!;
    fireEvent.change(aliasInput, { target: { value: "newalias" } });

    const weightLabels = screen.queryAllByLabelText("Weight");
    const weightLabel = Array.from(weightLabels).find((el) => container.contains(el));
    const weightInput =
      weightLabel && weightLabel.getAttribute("for")
        ? (container.querySelector(`#${weightLabel.getAttribute("for")}`) as HTMLInputElement)
        : (container.querySelector("#weight") as HTMLInputElement);
    fireEvent.change(weightInput, { target: { value: "80" } });

    const fitnessLabels = screen.queryAllByLabelText("Fitness Level");
    const fitnessLabel = Array.from(fitnessLabels).find((el) => container.contains(el));
    const fitnessSelect =
      fitnessLabel && fitnessLabel.getAttribute("for")
        ? (container.querySelector(`#${fitnessLabel.getAttribute("for")}`) as HTMLSelectElement)
        : (container.querySelector("#fitness-level") as HTMLSelectElement);
    fireEvent.change(fitnessSelect, { target: { value: "advanced" } });

    const frequencyLabels = screen.queryAllByLabelText("Training Frequency");
    const frequencyLabel = Array.from(frequencyLabels).find((el) => container.contains(el));
    const frequencySelect =
      frequencyLabel && frequencyLabel.getAttribute("for")
        ? (container.querySelector(`#${frequencyLabel.getAttribute("for")}`) as HTMLSelectElement)
        : (container.querySelector("#training-frequency") as HTMLSelectElement);
    fireEvent.change(frequencySelect, { target: { value: "5_plus_per_week" } });

    const savePrefs = screen.getAllByText("Save Preferences");
    const saveButton = Array.from(savePrefs).find((el) => container.contains(el))!;
    fireEvent.click(saveButton);

    await waitFor(
      () => {
        expect(mockPatch).toHaveBeenCalledWith(
          "/api/v1/users/me",
          expect.objectContaining({
            alias: "newalias",
            weight: 80,
            weightUnit: "kg",
            fitnessLevel: "advanced",
            trainingFrequency: "5_plus_per_week",
          }),
        );
      },
      { timeout: 2000 },
    );
  });

  it("displays alias help text", async () => {
    renderSettings();

    // Wait for component to render - check for Settings title
    await waitFor(
      () => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // The help text should be visible
    await waitFor(
      () => {
        expect(
          screen.getByText(
            /Alias may only contain letters, numbers, underscores, dots, or dashes/,
          ),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});

