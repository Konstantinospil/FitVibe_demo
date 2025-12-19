import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
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
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "../helpers/testQueryClient";

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
export const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

export const mockUserData = {
  id: "user-1",
  email: "user@example.com",
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

export const mockSignOut = vi.fn();

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
        "settings.profile.avatar": "Avatar",
        "settings.profile.avatarSelect": "Select Image",
        "settings.profile.avatarUpload": "Upload",
        "settings.profile.avatarDelete": "Delete",
        "settings.profile.avatarInvalidType": "Invalid file type. Please use JPEG, PNG, or WebP.",
        "settings.profile.avatarTooLarge": "File is too large. Maximum size is 5MB.",
        "settings.profile.avatarHelp":
          "Upload a JPEG, PNG, or WebP image (max 5MB). Recommended size: 256×256 pixels.",
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
        "common.cancel": "Cancel",
        "common.confirm": "Confirm",
      },
    },
  },
});

// Helper to render Settings with all required providers
export const renderSettings = () => {
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
  // Store queryClient on result for cleanup if needed
  (result as any).queryClient = queryClient;
  return result;
};

// Setup function for tests
export const setupSettingsTests = () => {
  const mockGet = vi.mocked(apiClient.get);
  const mockPatch = vi.mocked(apiClient.patch);
  const mockPost = vi.mocked(apiClient.post);
  const mockDelete = vi.mocked(apiClient.delete);

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

  return { mockGet, mockPatch, mockPost, mockDelete };
};
<<<<<<< Updated upstream
=======


>>>>>>> Stashed changes
