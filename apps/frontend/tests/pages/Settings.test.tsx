import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Settings from "../../src/pages/Settings";
import { useAuthStore } from "../../src/store/auth.store";
import { apiClient, setup2FA, verify2FA, disable2FA, get2FAStatus } from "../../src/services/api";
import { ToastProvider } from "../../src/contexts/ToastContext";

// Mock auth store
vi.mock("../../src/store/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

// Mock API client
vi.mock("../../src/services/api", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  setup2FA: vi.fn(),
  verify2FA: vi.fn(),
  disable2FA: vi.fn(),
  get2FAStatus: vi.fn(),
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
  username: "testuser",
  roleCode: "athlete",
  status: "active",
};

const mockSignOut = vi.fn();

// Helper to render Settings with all required providers
const renderSettings = () => {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    </ToastProvider>,
  );
};

describe("Settings", () => {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const mockGet = vi.mocked(apiClient.get);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const mockPatch = vi.mocked(apiClient.patch);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const mockDelete = vi.mocked(apiClient.delete);

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
  });

  it("renders settings page", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Your preferences and account settings")).toBeInTheDocument();
    });

    expect(screen.getByText("Profile Settings")).toBeInTheDocument();
    expect(screen.getByText("Preferences")).toBeInTheDocument();
    expect(screen.getByText("Two-Factor Authentication (2FA)")).toBeInTheDocument();
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
  });

  it("loads user data on mount", async () => {
    renderSettings();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/v1/users/me");
    });
  });

  it("displays user email after loading", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByDisplayValue("user@example.com")).toBeInTheDocument();
    });
  });

  it("allows changing display name", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Your display name")).toBeInTheDocument();
    });

    const displayNameInput = screen.getByPlaceholderText("Your display name");
    fireEvent.change(displayNameInput, { target: { value: "New Display Name" } });

    expect(displayNameInput).toHaveValue("New Display Name");
  });

  it("allows changing default visibility", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText("Default Session Visibility")).toBeInTheDocument();
    });

    const visibilitySelect = screen.getByLabelText(
      "Default Session Visibility",
    ) as HTMLSelectElement;
    fireEvent.change(visibilitySelect, { target: { value: "public" } });

    expect(visibilitySelect.value).toBe("public");
  });

  it("allows changing units preference", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText("Units")).toBeInTheDocument();
    });

    const unitsSelect = screen.getByLabelText("Units") as HTMLSelectElement;
    fireEvent.change(unitsSelect, { target: { value: "imperial" } });

    expect(unitsSelect.value).toBe("imperial");
  });

  it("allows changing language preference", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText("Language")).toBeInTheDocument();
    });

    const languageSelect = screen.getByLabelText("Language") as HTMLSelectElement;
    fireEvent.change(languageSelect, { target: { value: "de" } });

    expect(languageSelect.value).toBe("de");
  });

  it("saves preferences when save button clicked", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Save Preferences")).toBeInTheDocument();
    });

    const displayNameInput = screen.getByPlaceholderText("Your display name");
    fireEvent.change(displayNameInput, { target: { value: "Test Name" } });

    const saveButton = screen.getByText("Save Preferences");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith("/api/v1/users/me", {
        displayName: "Test Name",
        locale: "en",
        defaultVisibility: "private",
        units: "metric",
      });
    });
  });

  it("shows success message after saving preferences", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Save Preferences")).toBeInTheDocument();
    });

    const saveButton = screen.getByText("Save Preferences");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Preferences saved successfully!")).toBeInTheDocument();
    });
  });

  it("shows error message when saving preferences fails", async () => {
    mockPatch.mockRejectedValue(new Error("Save failed"));

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Save Preferences")).toBeInTheDocument();
    });

    const saveButton = screen.getByText("Save Preferences");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to save preferences. Please try again.")).toBeInTheDocument();
    });
  });

  it("shows enable 2FA button when 2FA is disabled", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Enable 2FA")).toBeInTheDocument();
    });
  });

  it("shows 2FA setup when enable button clicked", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Enable 2FA")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Enable 2FA"));

    await waitFor(() => {
      expect(screen.getByText(/Scan this QR code/)).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
  });

  it("disables verify button when code is not 6 digits", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Enable 2FA")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Enable 2FA"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    });

    const codeInput = screen.getByPlaceholderText("000000");
    fireEvent.change(codeInput, { target: { value: "123" } });

    const verifyButton = screen.getByRole("button", { name: /verify/i });
    expect(verifyButton).toBeDisabled();
  });

  it("enables 2FA after successful verification", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Enable 2FA")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Enable 2FA"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    });

    const codeInput = screen.getByPlaceholderText("000000");
    fireEvent.change(codeInput, { target: { value: "123456" } });

    const verifyButton = screen.getByText("Verify and Enable");
    fireEvent.click(verifyButton);

    // Check for toast notification instead of alert
    await waitFor(() => {
      expect(screen.getByText("2FA enabled successfully!")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/2FA is currently/)).toBeInTheDocument();
    });
  });

  it("shows delete account confirmation when delete button clicked", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Delete My Account")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete My Account"));

    await waitFor(() => {
      expect(
        screen.getByText(/⚠️ Warning: This will permanently delete your account/),
      ).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
  });

  it("allows cancelling account deletion", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Delete My Account")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete My Account"));

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Enter your password")).not.toBeInTheDocument();
    });
  });

  it("disables delete button when no password entered", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Delete My Account")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete My Account"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /yes, delete my account/i })).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: /yes, delete my account/i });
    expect(deleteButton).toBeDisabled();
  });

  it("deletes account when confirmed with password", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Delete My Account")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete My Account"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText("Enter your password");
    fireEvent.change(passwordInput, { target: { value: "mypassword" } });

    // Click the button that opens the confirmation dialog
    fireEvent.click(screen.getByText("Yes, Delete My Account"));

    // Wait for ConfirmDialog to appear
    await waitFor(() => {
      expect(screen.getByText("Delete Account")).toBeInTheDocument();
    });

    // Find and click the confirm button in the dialog
    const confirmButton = screen.getByRole("button", { name: /confirm delete/i });
    fireEvent.click(confirmButton);

    // Now the API should be called
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("/api/v1/users/me", {
        data: { password: "mypassword" },
      });
    });

    // Wait for setTimeout to execute (2000ms delay) - the toast should appear during this time
    await waitFor(
      () => {
        expect(mockSignOut).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("does not delete account when confirmation declined", async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Delete My Account")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete My Account"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText("Enter your password");
    fireEvent.change(passwordInput, { target: { value: "mypassword" } });

    // Click the button that opens the confirmation dialog
    fireEvent.click(screen.getByText("Yes, Delete My Account"));

    // Wait for ConfirmDialog to appear and click Cancel
    await waitFor(() => {
      expect(screen.getByText("Delete Account")).toBeInTheDocument();
    });

    // Get all Cancel buttons and click the one in the dialog (last one)
    const cancelButtons = screen.getAllByText("Cancel");
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    // Dialog should close and delete should not be called
    await waitFor(() => {
      expect(screen.queryByText("Delete Account")).not.toBeInTheDocument();
    });

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("shows error when account deletion fails", async () => {
    mockDelete.mockRejectedValue(new Error("Delete failed"));

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText("Delete My Account")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete My Account"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText("Enter your password");
    fireEvent.change(passwordInput, { target: { value: "mypassword" } });

    // Click the button that opens the confirmation dialog
    fireEvent.click(screen.getByText("Yes, Delete My Account"));

    // Wait for ConfirmDialog to appear and click confirm
    await waitFor(() => {
      expect(screen.getByText("Delete Account")).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: /confirm delete/i });
    fireEvent.click(confirmButton);

    // Check for error toast instead of alert
    await waitFor(() => {
      expect(screen.getByText("Failed to delete account. Please try again.")).toBeInTheDocument();
    });
  });
});
