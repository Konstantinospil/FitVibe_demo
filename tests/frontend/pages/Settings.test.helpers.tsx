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
  getPrivacySettings,
  updatePrivacySettings,
  exportUserData,
} from "../../src/services/api";
import { ToastProvider } from "../../src/contexts/ToastContext";
import { I18nextProvider, initReactI18next } from "react-i18next";
import i18n from "i18next";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "../helpers/testQueryClient";
import enCommon from "../../src/i18n/locales/en/common.json";
import enAuth from "../../src/i18n/locales/en/auth.json";

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
  getPrivacySettings: vi.fn(),
  updatePrivacySettings: vi.fn(),
  exportUserData: vi.fn(),
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

const enResources = { ...enCommon, ...enAuth };

const testI18n = i18n.createInstance();
void testI18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  defaultNS: "translation",
  fallbackNS: "common",
  ns: ["translation", "common"],
  resources: {
    en: {
      translation: enResources,
      common: enResources,
    },
  },
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
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
  vi.mocked(getPrivacySettings).mockResolvedValue({
    defaultVisibility: "private",
    allowFollowers: true,
    showEmail: false,
    showWeight: false,
    showFitnessLevel: false,
  });
  vi.mocked(updatePrivacySettings).mockResolvedValue({
    defaultVisibility: "private",
    allowFollowers: true,
    showEmail: false,
    showWeight: false,
    showFitnessLevel: false,
  });
  vi.mocked(exportUserData).mockResolvedValue(new Blob(["export"]));

  return { mockGet, mockPatch, mockPost, mockDelete };
};
