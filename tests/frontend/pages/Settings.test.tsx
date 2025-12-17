import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import Settings from "../../src/pages/Settings";
import { useAuthStore } from "../../src/store/auth.store";
import {
  apiClient,
  setup2FA,
  verify2FA,
  disable2FA,
  get2FAStatus,
  listAuthSessions,
} from "../../src/services/api";
import { ToastProvider } from "../../src/contexts/ToastContext";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock auth store
vi.mock("../../src/store/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

// Mock API client
vi.mock("../../src/services/api", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    defaults: {
      baseURL: "http://localhost:3000",
    },
  },
  setup2FA: vi.fn(),
  verify2FA: vi.fn(),
  disable2FA: vi.fn(),
  get2FAStatus: vi.fn(),
  listAuthSessions: vi.fn(),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUserData = {
  id: "user-1",
  email: "user@example.com",
  primaryEmail: "user@example.com",
  username: "testuser",
  roleCode: "athlete",
  status: "active",
  profile: {
    alias: "testalias",
    bio: null,
    weight: 75.5,
    weightUnit: "kg",
    fitnessLevel: "intermediate",
    trainingFrequency: "3_4_per_week",
  },
};

const mockSignOut = vi.fn();

// Initialize i18n for tests
const testI18n = i18n.createInstance();
void testI18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: {
      common: {
        "settings.title": "Settings",
        "settings.description": "Your preferences and account settings",
        "settings.profile.title": "Profile Settings",
        "settings.profile.description": "Update your display name and basic information",
        "settings.profile.displayName": "Display Name",
        "settings.profile.displayNamePlaceholder": "Your display name",
        "settings.profile.alias": "Alias",
        "settings.profile.aliasPlaceholder": "Your public alias",
        "settings.profile.aliasHelp":
          "Alias may only contain letters, numbers, underscores, dots, or dashes",
        "settings.profile.email": "Email",
        "settings.profile.emailCannotChange": "Email cannot be changed",
        "settings.profile.weight": "Weight",
        "settings.profile.weightPlaceholder": "Enter your weight",
        "settings.profile.weightUnit": "Weight Unit",
        "settings.profile.weightKg": "kg",
        "settings.profile.weightLb": "lb",
        "settings.profile.fitnessLevel": "Fitness Level",
        "settings.profile.fitnessLevelBeginner": "Beginner",
        "settings.profile.fitnessLevelIntermediate": "Intermediate",
        "settings.profile.fitnessLevelAdvanced": "Advanced",
        "settings.profile.fitnessLevelElite": "Elite",
        "settings.profile.trainingFrequency": "Training Frequency",
        "settings.profile.trainingFrequencyRarely": "Rarely",
        "settings.profile.trainingFrequency1_2": "1-2 times per week",
        "settings.profile.trainingFrequency3_4": "3-4 times per week",
        "settings.profile.trainingFrequency5Plus": "5+ times per week",
        "settings.profile.twoFactorCodePlaceholder": "Enter 6-digit code",
        "settings.profile.passwordPlaceholder": "Enter your password",
        "settings.preferences.title": "Preferences",
        "settings.preferences.description":
          "Set your default session visibility, units, and language",
        "settings.preferences.saveButton": "Save Preferences",
        "settings.preferences.saving": "Saving...",
        "settings.preferences.saveSuccess": "Preferences saved successfully!",
        "settings.preferences.saveError": "Failed to save preferences. Please try again.",
        "settings.security.title": "Two-Factor Authentication (2FA)",
        "settings.security.enable2FA": "Enable 2FA",
        "settings.security.disable2FA": "Disable 2FA",
        "settings.security.verifyAndEnable": "Verify and Enable",
        "settings.security.2FAEnabled": "2FA is currently enabled",
        "settings.security.2FAEnabledSuccess": "2FA enabled successfully!",
        "settings.security.scanQRCode": "Scan this QR code",
        "settings.account.title": "Danger Zone",
        "settings.account.deleteAccount": "Delete My Account",
        "settings.account.deleteWarning": "⚠️ Warning: This will permanently delete your account",
        "settings.account.passwordPlaceholder": "Enter your password",
        "settings.account.yesDelete": "Yes, Delete My Account",
        "settings.account.confirmDelete": "Delete Account",
        "settings.account.deleteError": "Failed to delete account. Please try again.",
        "settings.profile.avatar": "Profile Avatar",
        "settings.profile.avatarSelect": "Select Image",
        "settings.profile.avatarUpload": "Upload",
        "settings.profile.avatarDelete": "Delete",
        "settings.profile.avatarHelp":
          "Upload a JPEG, PNG, or WebP image (max 5MB). Recommended size: 256×256 pixels.",
        "settings.profile.avatarInvalidType": "Invalid file type. Please use JPEG, PNG, or WebP.",
        "settings.profile.avatarTooLarge": "File is too large. Maximum size is 5MB.",
        "settings.profile.avatarUploadError": "Failed to upload avatar. Please try again.",
        "settings.profile.avatarNoFile": "Please select a file to upload.",
        "common.cancel": "Cancel",
        "common.confirm": "Confirm",
      },
    },
  },
});

// Create a test query client
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
};

// Helper to render Settings with all required providers
const renderSettings = () => {
  const queryClient = createTestQueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={testI18n}>
        <ToastProvider>
          <MemoryRouter>
            <Settings />
          </MemoryRouter>
        </ToastProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
  return result;
};

describe("Settings", () => {
  const mockGet = vi.mocked(apiClient.get);
  const mockPatch = vi.mocked(apiClient.patch);
  const mockPost = vi.mocked(apiClient.post);
  const mockDelete = vi.mocked(apiClient.delete);

  // Set test timeout to prevent hanging
  vi.setConfig({ testTimeout: 10000 });

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      user: {
        id: "user-1",
        username: "testuser",
        email: "user@example.com",
        role: "athlete",
        isVerified: true,
        createdAt: new Date().toISOString(),
      },
      signIn: vi.fn(),
      signOut: mockSignOut,
      updateUser: vi.fn(),
    });

    mockGet.mockResolvedValue({ data: mockUserData });
    mockPatch.mockResolvedValue({ data: {} });
    mockPost.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
    vi.mocked(get2FAStatus).mockResolvedValue({ enabled: false });
    vi.mocked(setup2FA).mockResolvedValue({
      qrCode: "data:image/png;base64,mock-qr-code",
      secret: "mock-secret",
      backupCodes: ["CODE1", "CODE2", "CODE3", "CODE4", "CODE5"],
      message: "2FA setup initiated",
    });
    vi.mocked(verify2FA).mockResolvedValue({ success: true, message: "2FA enabled successfully" });
    vi.mocked(disable2FA).mockResolvedValue({
      success: true,
      message: "2FA disabled successfully",
    });
    vi.mocked(listAuthSessions).mockResolvedValue({ sessions: [] });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  it("renders settings page", async () => {
    const { container } = renderSettings();

    await waitFor(
      () => {
        const descriptions = screen.getAllByText("Your preferences and account settings");
        const description = Array.from(descriptions).find((el) => container.contains(el));
        expect(description).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const profileSettings = screen.getAllByText("Profile Settings");
    expect(Array.from(profileSettings).find((el) => container.contains(el))).toBeInTheDocument();

    const preferences = screen.getAllByText("Preferences");
    expect(Array.from(preferences).find((el) => container.contains(el))).toBeInTheDocument();

    const twoFA = screen.getAllByText("Two-Factor Authentication (2FA)");
    expect(Array.from(twoFA).find((el) => container.contains(el))).toBeInTheDocument();

    const dangerZone = screen.getAllByText("Danger Zone");
    expect(Array.from(dangerZone).find((el) => container.contains(el))).toBeInTheDocument();
  });

  it("loads user data on mount", async () => {
    renderSettings();

    await waitFor(
      () => {
        expect(mockGet).toHaveBeenCalledWith("/api/v1/users/me");
      },
      { timeout: 5000 },
    );
  });

  it("displays user email after loading", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Wait for API call to complete
    await waitFor(
      () => {
        expect(mockGet).toHaveBeenCalledWith("/api/v1/users/me");
      },
      { timeout: 5000 },
    );

    // Wait for the email input to exist and value to update from "Loading..." to actual email
    await waitFor(
      () => {
        const emailInput = container.querySelector("#email") as HTMLInputElement;
        expect(emailInput).not.toBeNull();
        expect(emailInput.value).not.toBe("Loading...");
        expect(emailInput.value).toBe("user@example.com");
      },
      { timeout: 5000 },
    );
  });

  it("allows changing display name", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    let displayNameInput: HTMLElement | undefined;
    await waitFor(
      () => {
        const inputs = screen.getAllByPlaceholderText("Your display name");
        displayNameInput = Array.from(inputs).find((el) => container.contains(el));
        expect(displayNameInput).toBeDefined();
        expect(displayNameInput).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(displayNameInput).toBeDefined();
    fireEvent.change(displayNameInput!, { target: { value: "New Display Name" } });

    expect(displayNameInput!).toHaveValue("New Display Name");
  });

  it("allows changing default visibility", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    let visibilitySelect: HTMLSelectElement | undefined;
    await waitFor(
      () => {
        const labels = screen.queryAllByLabelText("Default Session Visibility");
        const label = Array.from(labels).find((el) => container.contains(el));
        if (label && label.getAttribute("for")) {
          visibilitySelect = container.querySelector(
            `#${label.getAttribute("for")}`,
          ) as HTMLSelectElement;
        }
        if (!visibilitySelect) {
          visibilitySelect = container.querySelector("#default-visibility") as HTMLSelectElement;
        }
        expect(visibilitySelect).toBeDefined();
        expect(visibilitySelect).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(visibilitySelect).toBeDefined();
    fireEvent.change(visibilitySelect!, { target: { value: "public" } });

    expect(visibilitySelect!.value).toBe("public");
  });

  it("allows changing units preference", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    let unitsSelect: HTMLSelectElement | undefined;
    await waitFor(
      () => {
        const labels = screen.queryAllByLabelText("Units");
        const label = Array.from(labels).find((el) => container.contains(el));
        if (label && label.getAttribute("for")) {
          unitsSelect = container.querySelector(
            `#${label.getAttribute("for")}`,
          ) as HTMLSelectElement;
        }
        if (!unitsSelect) {
          unitsSelect = container.querySelector("#units") as HTMLSelectElement;
        }
        expect(unitsSelect).toBeDefined();
        expect(unitsSelect).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(unitsSelect).toBeDefined();
    fireEvent.change(unitsSelect!, { target: { value: "imperial" } });

    expect(unitsSelect!.value).toBe("imperial");
  });

  it("allows changing language preference", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    let languageSelect: HTMLSelectElement | undefined;
    await waitFor(
      () => {
        const labels = screen.queryAllByLabelText("Language");
        const label = Array.from(labels).find((el) => container.contains(el));
        if (label && label.getAttribute("for")) {
          languageSelect = container.querySelector(
            `#${label.getAttribute("for")}`,
          ) as HTMLSelectElement;
        }
        if (!languageSelect) {
          languageSelect = container.querySelector("#locale") as HTMLSelectElement;
        }
        expect(languageSelect).toBeDefined();
        expect(languageSelect).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(languageSelect).toBeDefined();
    fireEvent.change(languageSelect!, { target: { value: "de" } });

    expect(languageSelect!.value).toBe("de");
  });

  it("saves preferences when save button clicked", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    let displayNameInput: HTMLElement | undefined;
    let saveButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const savePrefs = screen.getAllByText("Save Preferences");
        saveButton = Array.from(savePrefs).find((el) => container.contains(el));
        expect(saveButton).toBeDefined();

        const displayNameInputs = screen.getAllByPlaceholderText("Your display name");
        displayNameInput = Array.from(displayNameInputs).find((el) => container.contains(el));
        expect(displayNameInput).toBeDefined();
      },
      { timeout: 5000 },
    );

    expect(displayNameInput).toBeDefined();
    expect(saveButton).toBeDefined();

    // Wait for user data to load
    await waitFor(
      () => {
        expect(mockGet).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );

    fireEvent.change(displayNameInput!, { target: { value: "Test Name" } });
    fireEvent.click(saveButton!);

    await waitFor(
      () => {
        expect(mockPatch).toHaveBeenCalled();
        const callArgs = mockPatch.mock.calls[0];
        expect(callArgs[0]).toBe("/api/v1/users/me");
        expect(callArgs[1]).toMatchObject({
          displayName: "Test Name",
          locale: "en",
          defaultVisibility: "private",
          units: "metric",
        });
      },
      { timeout: 5000 },
    );
  });

  it("shows success message after saving preferences", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    let saveButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const savePrefs = screen.getAllByText("Save Preferences");
        saveButton = Array.from(savePrefs).find((el) => container.contains(el));
        expect(saveButton).toBeDefined();
      },
      { timeout: 5000 },
    );

    expect(saveButton).toBeDefined();
    fireEvent.click(saveButton!);

    await waitFor(
      () => {
        const successMessages = screen.getAllByText("Preferences saved successfully!");
        expect(
          Array.from(successMessages).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("shows error message when saving preferences fails", async () => {
    mockPatch.mockRejectedValue(new Error("Save failed"));

    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    await waitFor(
      () => {
        const savePrefs = screen.getAllByText("Save Preferences");
        expect(Array.from(savePrefs).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const savePrefs = screen.getAllByText("Save Preferences");
    const saveButton = Array.from(savePrefs).find((el) => container.contains(el))!;
    fireEvent.click(saveButton);

    await waitFor(
      () => {
        expect(
          (() => {
            const errors = screen.getAllByText("Failed to save preferences. Please try again.");
            return Array.from(errors).find((el) => container.contains(el));
          })(),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("shows enable 2FA button when 2FA is disabled", async () => {
    const { container } = renderSettings();

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Enable 2FA");
        expect(Array.from(buttons).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("shows 2FA setup when enable button clicked", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    let enableButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Enable 2FA");
        enableButton = Array.from(buttons).find((el) => container.contains(el));
        expect(enableButton).toBeDefined();
      },
      { timeout: 5000 },
    );

    expect(enableButton).toBeDefined();
    fireEvent.click(enableButton!);

    await waitFor(
      () => {
        const qrTexts = screen.getAllByText(/Scan this QR code/);
        expect(Array.from(qrTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const placeholders = screen.getAllByPlaceholderText("Enter 6-digit code");
    expect(Array.from(placeholders).find((el) => container.contains(el))).toBeInTheDocument();
  });

  it("disables verify button when code is not 6 digits", async () => {
    const { container } = renderSettings();

    let enableButton: HTMLElement | undefined;
    let codeInput: HTMLElement | undefined;
    let verifyButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Enable 2FA");
        enableButton = Array.from(buttons).find((el) => container.contains(el));
        expect(enableButton).toBeDefined();
      },
      { timeout: 5000 },
    );

    expect(enableButton).toBeDefined();
    fireEvent.click(enableButton!);

    await waitFor(
      () => {
        const placeholders = screen.getAllByPlaceholderText("Enter 6-digit code");
        codeInput = Array.from(placeholders).find((el) => container.contains(el));
        expect(codeInput).toBeDefined();
      },
      { timeout: 5000 },
    );

    expect(codeInput).toBeDefined();
    fireEvent.change(codeInput!, { target: { value: "123" } });

    await waitFor(
      () => {
        const verifyButtons = screen.getAllByRole("button", { name: /verify/i });
        verifyButton = Array.from(verifyButtons).find((el) => container.contains(el));
        expect(verifyButton).toBeDefined();
      },
      { timeout: 5000 },
    );

    expect(verifyButton).toBeDefined();
    expect(verifyButton!).toBeDisabled();
  });

  it("enables 2FA after successful verification", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    let enableButton: HTMLElement | undefined;
    let codeInput: HTMLElement | undefined;
    let verifyButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Enable 2FA");
        enableButton = Array.from(buttons).find((el) => container.contains(el));
        expect(enableButton).toBeDefined();
      },
      { timeout: 5000 },
    );

    expect(enableButton).toBeDefined();
    fireEvent.click(enableButton!);

    await waitFor(
      () => {
        const placeholders = screen.getAllByPlaceholderText("Enter 6-digit code");
        codeInput = Array.from(placeholders).find((el) => container.contains(el));
        expect(codeInput).toBeDefined();
      },
      { timeout: 5000 },
    );

    expect(codeInput).toBeDefined();
    fireEvent.change(codeInput!, { target: { value: "123456" } });

    await waitFor(
      () => {
        const verifyButtons = screen.getAllByText("Verify and Enable");
        verifyButton = Array.from(verifyButtons).find((el) => container.contains(el));
        expect(verifyButton).toBeDefined();
      },
      { timeout: 5000 },
    );

    expect(verifyButton).toBeDefined();
    fireEvent.click(verifyButton!);

    // Check for toast notification instead of alert
    await waitFor(
      () => {
        const successMessages = screen.getAllByText("2FA enabled successfully!");
        expect(
          Array.from(successMessages).find((el) => container.contains(el)),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    await waitFor(
      () => {
        const statusTexts = screen.getAllByText(/2FA is currently/);
        expect(Array.from(statusTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("shows delete account confirmation when delete button clicked", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    let deleteButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Delete My Account");
        deleteButton = Array.from(buttons).find((el) => container.contains(el));
        expect(deleteButton).toBeDefined();
      },
      { timeout: 5000 },
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
      { timeout: 5000 },
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
      { timeout: 5000 },
    );

    let deleteButton: HTMLElement | undefined;
    let cancelButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Delete My Account");
        deleteButton = Array.from(buttons).find((el) => container.contains(el));
        expect(deleteButton).toBeDefined();
      },
      { timeout: 5000 },
    );

    expect(deleteButton).toBeDefined();
    fireEvent.click(deleteButton!);

    await waitFor(
      () => {
        const cancelButtons = screen.getAllByText("Cancel");
        cancelButton = Array.from(cancelButtons).find((el) => container.contains(el));
        expect(cancelButton).toBeDefined();
      },
      { timeout: 5000 },
    );

    expect(cancelButton).toBeDefined();
    fireEvent.click(cancelButton!);

    await waitFor(
      () => {
        expect(screen.queryByPlaceholderText("Enter your password")).not.toBeInTheDocument();
      },
      { timeout: 5000 },
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
      { timeout: 5000 },
    );

    let deleteAccountButton: HTMLElement | undefined;
    let deleteButton: HTMLElement | undefined;

    await waitFor(
      () => {
        const buttons = screen.getAllByText("Delete My Account");
        deleteAccountButton = Array.from(buttons).find((el) => container.contains(el));
        expect(deleteAccountButton).toBeDefined();
      },
      { timeout: 5000 },
    );

    expect(deleteAccountButton).toBeDefined();
    fireEvent.click(deleteAccountButton!);

    await waitFor(
      () => {
        const yesButtons = screen.getAllByRole("button", { name: /yes, delete my account/i });
        deleteButton = Array.from(yesButtons).find((el) => container.contains(el));
        expect(deleteButton).toBeDefined();
      },
      { timeout: 5000 },
    );

    expect(deleteButton).toBeDefined();
    expect(deleteButton!).toBeDisabled();
  });

  it("deletes account when confirmed with password", async () => {
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
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
      { timeout: 5000 },
    );

    expect(deleteAccountButton).toBeDefined();
    fireEvent.click(deleteAccountButton!);

    await waitFor(
      () => {
        const placeholders = screen.getAllByPlaceholderText("Enter your password");
        passwordInput = Array.from(placeholders).find((el) => container.contains(el));
        expect(passwordInput).toBeDefined();
      },
      { timeout: 5000 },
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

    // Now the API should be called
    await waitFor(
      () => {
        expect(mockDelete).toHaveBeenCalledWith("/api/v1/users/me", {
          data: { password: "mypassword" },
        });
      },
      { timeout: 5000 },
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
    const { container } = renderSettings();

    // Wait for component to render
    await waitFor(
      () => {
        const settingsTexts = screen.queryAllByText("Settings");
        expect(Array.from(settingsTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
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
      { timeout: 5000 },
    );

    expect(deleteAccountButton).toBeDefined();
    fireEvent.click(deleteAccountButton!);

    await waitFor(
      () => {
        const placeholders = screen.getAllByPlaceholderText("Enter your password");
        passwordInput = Array.from(placeholders).find((el) => container.contains(el));
        expect(passwordInput).toBeDefined();
      },
      { timeout: 5000 },
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
      { timeout: 5000 },
    );

    expect(yesButton).toBeDefined();
    fireEvent.click(yesButton!);

    // Wait for ConfirmDialog to appear and click Cancel
    await waitFor(
      () => {
        const deleteTexts = screen.getAllByText("Delete Account");
        expect(Array.from(deleteTexts).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Get all Cancel buttons and click the one in the dialog (last one)
    const cancelButtons = screen.getAllByText("Cancel");
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    // Dialog should close and delete should not be called
    await waitFor(
      () => {
        expect(screen.queryByText("Delete Account")).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("shows error when account deletion fails", async () => {
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
      { timeout: 5000 },
    );

    expect(deleteAccountButton).toBeDefined();
    fireEvent.click(deleteAccountButton!);

    await waitFor(
      () => {
        const placeholders = screen.getAllByPlaceholderText("Enter your password");
        passwordInput = Array.from(placeholders).find((el) => container.contains(el));
        expect(passwordInput).toBeDefined();
      },
      { timeout: 5000 },
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
      { timeout: 5000 },
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
      { timeout: 5000 },
    );

    expect(confirmButton).toBeDefined();
    fireEvent.click(confirmButton!);

    // Check for error toast instead of alert
    await waitFor(
      () => {
        const errorMessages = screen.getAllByText("Failed to delete account. Please try again.");
        expect(Array.from(errorMessages).find((el) => container.contains(el))).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  describe("Profile Fields (FR-009)", () => {
    it("loads profile data with new fields", async () => {
      const { container } = renderSettings();

      // Wait for component to render
      await waitFor(
        () => {
          const settingsTexts = screen.queryAllByText("Settings");
          expect(
            Array.from(settingsTexts).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      await waitFor(
        () => {
          expect(mockGet).toHaveBeenCalledWith("/api/v1/users/me");
        },
        { timeout: 5000 },
      );

      await waitFor(
        () => {
          const aliasValues = screen.getAllByDisplayValue("testalias");
          expect(Array.from(aliasValues).find((el) => container.contains(el))).toBeInTheDocument();
          const weightValues = screen.getAllByDisplayValue("75.5");
          expect(Array.from(weightValues).find((el) => container.contains(el))).toBeInTheDocument();
        },
        { timeout: 5000 },
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
        { timeout: 5000 },
      );

      await waitFor(
        () => {
          const placeholders = screen.getAllByPlaceholderText("Your public alias");
          expect(Array.from(placeholders).find((el) => container.contains(el))).toBeInTheDocument();
        },
        { timeout: 5000 },
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
        { timeout: 5000 },
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
        { timeout: 5000 },
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
        { timeout: 5000 },
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
        { timeout: 5000 },
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
        { timeout: 5000 },
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
        { timeout: 5000 },
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
        { timeout: 5000 },
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
        { timeout: 5000 },
      );

      expect(frequencySelect).toBeDefined();
      fireEvent.change(frequencySelect!, { target: { value: "5_plus_per_week" } });

      expect(frequencySelect!.value).toBe("5_plus_per_week");
    });

    it("saves profile fields when save button clicked", async () => {
      const { container } = renderSettings();

      // Wait for component to render
      await waitFor(
        () => {
          const settingsTexts = screen.queryAllByText("Settings");
          expect(
            Array.from(settingsTexts).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      await waitFor(
        () => {
          const savePrefs = screen.getAllByText("Save Preferences");
          expect(Array.from(savePrefs).find((el) => container.contains(el))).toBeInTheDocument();
        },
        { timeout: 5000 },
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
        { timeout: 5000 },
      );
    });

    it("saves weight with unit conversion (lb to kg)", async () => {
      const { container } = renderSettings();

      // Wait for component to render - check for Settings title
      await waitFor(
        () => {
          const settingsTexts = screen.queryAllByText("Settings");
          expect(
            Array.from(settingsTexts).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      await waitFor(
        () => {
          const savePrefs = screen.getAllByText("Save Preferences");
          expect(Array.from(savePrefs).find((el) => container.contains(el))).toBeInTheDocument();
        },
        { timeout: 5000 },
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
        { timeout: 5000 },
      );
    });

    it("reloads user data after successful save", async () => {
      const { container } = renderSettings();

      // Wait for component to render - check for Settings title
      await waitFor(
        () => {
          const settingsTexts = screen.queryAllByText("Settings");
          expect(
            Array.from(settingsTexts).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      await waitFor(
        () => {
          const savePrefs = screen.getAllByText("Save Preferences");
          expect(Array.from(savePrefs).find((el) => container.contains(el))).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      const savePrefs = screen.getAllByText("Save Preferences");
      const saveButton = Array.from(savePrefs).find((el) => container.contains(el))!;
      fireEvent.click(saveButton);

      await waitFor(
        () => {
          // Should be called twice: once on mount, once after save
          expect(mockGet).toHaveBeenCalledTimes(2);
        },
        { timeout: 5000 },
      );
    });

    it("handles profile data when profile is null", async () => {
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
        { timeout: 5000 },
      );

      await waitFor(
        () => {
          const placeholders = screen.getAllByPlaceholderText("Your public alias");
          expect(Array.from(placeholders).find((el) => container.contains(el))).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      const placeholders = screen.getAllByPlaceholderText("Your public alias");
      const aliasInput = Array.from(placeholders).find((el) => container.contains(el))!;
      expect(aliasInput).toHaveValue("");
    });

    it("handles weight conversion display when loading from API", async () => {
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
        { timeout: 5000 },
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
        { timeout: 5000 },
      );
    });

    it("saves all new profile fields together", async () => {
      const { container } = renderSettings();

      // Wait for component to render - check for Settings title
      await waitFor(
        () => {
          const settingsTexts = screen.queryAllByText("Settings");
          expect(
            Array.from(settingsTexts).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      await waitFor(
        () => {
          const savePrefs = screen.getAllByText("Save Preferences");
          expect(Array.from(savePrefs).find((el) => container.contains(el))).toBeInTheDocument();
        },
        { timeout: 5000 },
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
        { timeout: 5000 },
      );
    });

    it("displays alias help text", async () => {
      renderSettings();

      // Wait for component to render - check for Settings title
      await waitFor(
        () => {
          expect(screen.getByText("Settings")).toBeInTheDocument();
        },
        { timeout: 5000 },
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
        { timeout: 5000 },
      );
    });
  });

  describe("Avatar Upload (FR-009)", () => {
    it("displays avatar upload section", async () => {
      const { container } = renderSettings();

      // Wait for component to render
      await waitFor(
        () => {
          const settingsTexts = screen.queryAllByText("Settings");
          expect(
            Array.from(settingsTexts).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Wait for user data to load (avatar section is in profile settings)
      await waitFor(
        () => {
          expect(mockGet).toHaveBeenCalledWith("/api/v1/users/me");
        },
        { timeout: 5000 },
      );

      // Wait for avatar section to render
      await waitFor(
        () => {
          const selectButtons = screen.getAllByText(/select image/i);
          expect(
            Array.from(selectButtons).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });

    it("allows selecting an image file", async () => {
      const { container } = renderSettings();

      await waitFor(
        () => {
          const settingsTexts = screen.queryAllByText("Settings");
          expect(
            Array.from(settingsTexts).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
      expect(fileInput).toBeDefined();

      const file = new File(["fake-image-content"], "test.jpg", { type: "image/jpeg" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(
        () => {
          const uploadButtons = screen.getAllByText(/upload/i);
          expect(
            Array.from(uploadButtons).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });

    it("rejects invalid file types", async () => {
      const { container } = renderSettings();

      // Wait for component to render
      await waitFor(
        () => {
          const settingsTexts = screen.queryAllByText("Settings");
          expect(
            Array.from(settingsTexts).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Wait for user data to load (avatar section is in profile settings)
      await waitFor(
        () => {
          expect(mockGet).toHaveBeenCalledWith("/api/v1/users/me");
        },
        { timeout: 5000 },
      );

      // Wait for avatar upload input to be available
      await waitFor(
        () => {
          const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
          expect(fileInput).toBeDefined();
        },
        { timeout: 5000 },
      );

      const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
      const file = new File(["fake-pdf-content"], "test.pdf", { type: "application/pdf" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Should show error message
      await waitFor(
        () => {
          const errorTexts = screen.queryAllByText(/invalid file type/i);
          const errorElement = Array.from(errorTexts).find((el) => container.contains(el));
          expect(errorElement).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });

    it("rejects files that are too large", async () => {
      const { container } = renderSettings();

      await waitFor(
        () => {
          const settingsTexts = screen.queryAllByText("Settings");
          expect(
            Array.from(settingsTexts).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
      // Create a file larger than 5MB
      const largeContent = new Array(6 * 1024 * 1024).fill("a").join("");
      const file = new File([largeContent], "large.jpg", { type: "image/jpeg" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Should show error message
      await waitFor(
        () => {
          const errorTexts = screen.queryAllByText(/too large/i);
          expect(Array.from(errorTexts).find((el) => container.contains(el))).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });

    it("uploads avatar successfully", async () => {
      const { container } = renderSettings();

      mockPost.mockResolvedValue({
        data: {
          fileUrl: "/users/avatar/user-1",
        },
      });

      // Wait for component to render
      await waitFor(
        () => {
          const settingsTexts = screen.queryAllByText("Settings");
          expect(
            Array.from(settingsTexts).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Wait for user data to load (avatar section is in profile settings)
      await waitFor(
        () => {
          expect(mockGet).toHaveBeenCalledWith("/api/v1/users/me");
        },
        { timeout: 5000 },
      );

      // Wait for avatar upload input to be available
      await waitFor(
        () => {
          const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
          expect(fileInput).toBeDefined();
        },
        { timeout: 5000 },
      );

      const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
      const file = new File(["fake-image-content"], "test.jpg", { type: "image/jpeg" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Wait for upload button to appear and find it by role
      const uploadButton = await waitFor(
        () => {
          const buttons = screen.getAllByRole("button");
          const button = Array.from(buttons).find(
            (btn) => container.contains(btn) && /upload/i.test(btn.textContent || ""),
          );
          if (!button) {
            throw new Error("Upload button not found");
          }
          return button as HTMLButtonElement;
        },
        { timeout: 5000 },
      );
      expect(uploadButton).toBeInTheDocument();
      fireEvent.click(uploadButton);

      await waitFor(
        () => {
          expect(mockPost).toHaveBeenCalledWith(
            "/api/v1/users/me/avatar",
            expect.any(FormData),
            expect.objectContaining({
              headers: expect.objectContaining({
                "Content-Type": "multipart/form-data",
              }),
            }),
          );
        },
        { timeout: 5000 },
      );
    });

    it("displays existing avatar if available", async () => {
      mockGet.mockResolvedValue({
        data: {
          ...mockUserData,
          avatar: {
            url: "/users/avatar/user-1",
            mimeType: "image/png",
            bytes: 1024,
            updatedAt: new Date().toISOString(),
          },
        },
      });

      const { container } = renderSettings();

      await waitFor(
        () => {
          const settingsTexts = screen.queryAllByText("Settings");
          expect(
            Array.from(settingsTexts).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      await waitFor(
        () => {
          const avatarImages = container.querySelectorAll('img[alt="Profile avatar"]');
          expect(avatarImages.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );
    });

    it("allows deleting avatar", async () => {
      mockGet.mockResolvedValue({
        data: {
          ...mockUserData,
          avatar: {
            url: "/users/avatar/user-1",
            mimeType: "image/png",
            bytes: 1024,
            updatedAt: new Date().toISOString(),
          },
        },
      });

      const { container } = renderSettings();

      await waitFor(
        () => {
          const settingsTexts = screen.queryAllByText("Settings");
          expect(
            Array.from(settingsTexts).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      await waitFor(
        () => {
          const deleteButtons = screen.getAllByText(/delete/i);
          expect(
            Array.from(deleteButtons).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      const deleteButtons = screen.getAllByText(/delete/i);
      const deleteButton = Array.from(deleteButtons).find((el) => container.contains(el))!;
      fireEvent.click(deleteButton);

      await waitFor(
        () => {
          expect(mockDelete).toHaveBeenCalledWith("/api/v1/users/me/avatar");
        },
        { timeout: 5000 },
      );
    });

    it("handles avatar upload error", async () => {
      const { container } = renderSettings();

      mockPost.mockRejectedValue(new Error("Upload failed"));

      // Wait for component to render
      await waitFor(
        () => {
          const settingsTexts = screen.queryAllByText("Settings");
          expect(
            Array.from(settingsTexts).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Wait for user data to load (avatar section is in profile settings)
      await waitFor(
        () => {
          expect(mockGet).toHaveBeenCalledWith("/api/v1/users/me");
        },
        { timeout: 5000 },
      );

      // Wait for avatar upload input to be available
      await waitFor(
        () => {
          const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
          expect(fileInput).toBeDefined();
        },
        { timeout: 5000 },
      );

      const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
      const file = new File(["fake-image-content"], "test.jpg", { type: "image/jpeg" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Wait for upload button to appear and find it by role
      const uploadButton = await waitFor(
        () => {
          const buttons = screen.getAllByRole("button");
          const button = Array.from(buttons).find(
            (btn) => container.contains(btn) && /upload/i.test(btn.textContent || ""),
          );
          if (!button) {
            throw new Error("Upload button not found");
          }
          return button as HTMLButtonElement;
        },
        { timeout: 5000 },
      );
      expect(uploadButton).toBeInTheDocument();
      fireEvent.click(uploadButton);

      await waitFor(
        () => {
          const errorTexts = screen.queryAllByText(/failed to upload/i);
          const errorElement = Array.from(errorTexts).find((el) => container.contains(el));
          if (!errorElement) {
            throw new Error("Error message not found");
          }
          expect(errorElement).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });

    it("disables upload button while uploading", async () => {
      const { container } = renderSettings();

      mockPost.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { fileUrl: "test.jpg" } }), 100),
          ),
      );

      // Wait for component to render
      await waitFor(
        () => {
          const settingsTexts = screen.queryAllByText("Settings");
          expect(
            Array.from(settingsTexts).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Wait for user data to load (avatar section is in profile settings)
      await waitFor(
        () => {
          expect(mockGet).toHaveBeenCalledWith("/api/v1/users/me");
        },
        { timeout: 5000 },
      );

      // Wait for avatar upload input to be available
      await waitFor(
        () => {
          const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
          expect(fileInput).toBeDefined();
        },
        { timeout: 5000 },
      );

      const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
      const file = new File(["fake-image-content"], "test.jpg", { type: "image/jpeg" });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(
        () => {
          const uploadButtons = screen.getAllByText(/upload/i);
          expect(
            Array.from(uploadButtons).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Wait for upload button to appear and find it by role
      const uploadButton = await waitFor(
        () => {
          const buttons = screen.getAllByRole("button");
          const button = Array.from(buttons).find(
            (btn) => container.contains(btn) && /upload/i.test(btn.textContent || ""),
          );
          if (!button) {
            throw new Error("Upload button not found");
          }
          return button as HTMLButtonElement;
        },
        { timeout: 5000 },
      );
      expect(uploadButton).toBeInTheDocument();
      fireEvent.click(uploadButton);

      // Button should be disabled during upload - find it again after click to get updated state
      await waitFor(
        () => {
          const buttonsAfterClick = screen.getAllByRole("button");
          const buttonAfterClick = Array.from(buttonsAfterClick).find(
            (btn) => container.contains(btn) && /upload/i.test(btn.textContent || ""),
          );
          expect(buttonAfterClick).toBeDefined();
          expect(buttonAfterClick).toBeDisabled();
        },
        { timeout: 5000 },
      );
    });

    it("accepts JPEG, PNG, and WebP formats", async () => {
      const { container } = renderSettings();

      await waitFor(
        () => {
          const settingsTexts = screen.queryAllByText("Settings");
          expect(
            Array.from(settingsTexts).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      const fileInput = container.querySelector("#avatar-upload") as HTMLInputElement;
      expect(fileInput.accept).toBe("image/jpeg,image/png,image/webp");

      // Test JPEG
      const jpegFile = new File(["fake-image"], "test.jpg", { type: "image/jpeg" });
      fireEvent.change(fileInput, { target: { files: [jpegFile] } });
      await waitFor(
        () => {
          const uploadButtons = screen.getAllByText(/upload/i);
          expect(
            Array.from(uploadButtons).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Reset
      fireEvent.change(fileInput, { target: { files: [] } });

      // Test PNG
      const pngFile = new File(["fake-image"], "test.png", { type: "image/png" });
      fireEvent.change(fileInput, { target: { files: [pngFile] } });
      await waitFor(
        () => {
          const uploadButtons = screen.getAllByText(/upload/i);
          expect(
            Array.from(uploadButtons).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Reset
      fireEvent.change(fileInput, { target: { files: [] } });

      // Test WebP
      const webpFile = new File(["fake-image"], "test.webp", { type: "image/webp" });
      fireEvent.change(fileInput, { target: { files: [webpFile] } });
      await waitFor(
        () => {
          const uploadButtons = screen.getAllByText(/upload/i);
          expect(
            Array.from(uploadButtons).find((el) => container.contains(el)),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });
  });
});
