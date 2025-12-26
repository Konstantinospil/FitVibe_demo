import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Save, Trash2, Shield, User, Globe, Upload } from "lucide-react";
import PageIntro from "../components/PageIntro";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/Card";
import { useAuthStore } from "../store/auth.store";
import {
  apiClient,
  setup2FA,
  verify2FA,
  disable2FA,
  get2FAStatus,
  uploadAvatar,
} from "../services/api";
import { logger } from "../utils/logger";
import { useToast } from "../contexts/ToastContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { SessionManagement } from "../components/SessionManagement";

type SessionVisibility = "private" | "followers" | "link" | "public";
type Units = "metric" | "imperial";
type FitnessLevel = "beginner" | "intermediate" | "advanced" | "elite";
type TrainingFrequency = "rarely" | "1_2_per_week" | "3_4_per_week" | "5_plus_per_week";
type SettingsSection = "profile" | "preferences" | "security" | "danger";

interface UserProfile {
  alias: string | null;
  bio: string | null;
  weight: number | null;
  weightUnit: string | null;
  fitnessLevel: string | null;
  trainingFrequency: string | null;
}

interface UserData {
  id: string;
  email: string;
  username: string;
  roleCode: string;
  status: string;
  profile?: UserProfile;
  avatar?: {
    url: string;
    mimeType: string | null;
    bytes: number | null;
    updatedAt: string | null;
  } | null;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuthStore();
  const toast = useToast();
  const { t } = useTranslation();

  // Active section
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");

  // User data
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // User preferences
  const [displayName, setDisplayName] = useState("");
  const [defaultVisibility, setDefaultVisibility] = useState<SessionVisibility>("private");
  const [units, setUnits] = useState<Units>("metric");
  const [locale, setLocale] = useState("en");

  // Profile fields (FR-009)
  const [alias, setAlias] = useState("");
  const [weight, setWeight] = useState<string>("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | "">("");
  const [trainingFrequency, setTrainingFrequency] = useState<TrainingFrequency | "">("");

  // Avatar upload
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user data and 2FA status on mount
  useEffect(() => {
    void loadUserData();
    void load2FAStatus();
  }, []); // Intentionally empty - these functions are stable and should only run once on mount

  const loadUserData = async () => {
    setLoadingUser(true);
    try {
      const response = await apiClient.get<
        UserData & {
          locale?: string;
          preferredLang?: string;
          defaultVisibility?: SessionVisibility;
          units?: Units;
          profile?: UserProfile;
        }
      >("/api/v1/users/me");
      setUserData(response.data);
      // Load user preferences from the API response
      if (response.data.defaultVisibility) {
        setDefaultVisibility(response.data.defaultVisibility);
      }
      if (response.data.units) {
        setUnits(response.data.units);
      }
      if (response.data.locale) {
        setLocale(response.data.locale);
      }
      // Load avatar
      if (response.data.avatar?.url) {
        // Backend returns /users/avatar/{userId}, convert to API endpoint
        const avatarUrl = response.data.avatar.url;
        if (avatarUrl.startsWith("/users/avatar/")) {
          const userId = avatarUrl.replace("/users/avatar/", "");
          setAvatarUrl(`/api/v1/users/avatar/${userId}`);
        } else {
          setAvatarUrl(avatarUrl);
        }
      }
      // Load profile data (FR-009)
      if (response.data.profile) {
        setAlias(response.data.profile.alias ?? "");
        if (response.data.profile.weight !== null) {
          // Convert kg to user's preferred unit for display
          const displayWeight =
            response.data.profile.weightUnit === "lb"
              ? (response.data.profile.weight / 0.453592).toFixed(1)
              : response.data.profile.weight.toFixed(1);
          setWeight(displayWeight);
          setWeightUnit((response.data.profile.weightUnit as "kg" | "lb") ?? "kg");
        }
        setFitnessLevel((response.data.profile.fitnessLevel as FitnessLevel) ?? "");
        setTrainingFrequency((response.data.profile.trainingFrequency as TrainingFrequency) ?? "");
      }
    } catch (error) {
      logger.apiError("Failed to load user data", error, "/api/v1/users/me", "GET");
    } finally {
      setLoadingUser(false);
    }
  };

  const load2FAStatus = async () => {
    try {
      const status = await get2FAStatus();
      setTwoFAEnabled(status.enabled);
    } catch (error) {
      logger.apiError("Failed to load 2FA status", error, "/api/v1/auth/2fa/status", "GET");
    }
  };

  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [showTwoFASetup, setShowTwoFASetup] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAQRCode, setTwoFAQRCode] = useState<string | null>(null);
  const [twoFABackupCodes, setTwoFABackupCodes] = useState<string[]>([]);
  const [loading2FA, setLoading2FA] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState("");

  // Account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");

  // Confirmation dialogs
  const [showDisable2FAConfirm, setShowDisable2FAConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Avatar upload validation
  const validateAvatarFile = (file: File): string | null => {
    // Check file type - only allow image formats
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return t("settings.profile.avatarInvalidFormat");
    }

    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return t("settings.profile.avatarFileTooLarge");
    }

    // Additional validation: check file extension as backup
    const fileName = file.name.toLowerCase();
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const hasValidExtension = allowedExtensions.some((ext) => fileName.endsWith(ext));
    if (!hasValidExtension) {
      return t("settings.profile.avatarInvalidFile");
    }

    return null;
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file
    const validationError = validateAvatarFile(file);
    if (validationError) {
      toast.error(validationError);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setUploadingAvatar(true);
    try {
      const response = await uploadAvatar(file);

      const fileUrl = response?.fileUrl;
      if (fileUrl && typeof fileUrl === "string") {
        // Backend returns relative path like /users/avatar/{userId}
        // Convert to API endpoint: /api/v1/users/avatar/{userId}
        let avatarUrl: string;
        if (fileUrl.startsWith("http")) {
          avatarUrl = fileUrl;
        } else if (fileUrl.startsWith("/users/avatar/")) {
          // Convert /users/avatar/{userId} to /api/v1/users/avatar/{userId}
          const userId = fileUrl.replace("/users/avatar/", "");
          avatarUrl = `/api/v1/users/avatar/${userId}`;
        } else {
          avatarUrl = fileUrl;
        }
        setAvatarUrl(avatarUrl);
        toast.success(t("settings.profile.avatarUploadSuccess"));
        // Reload user data to get updated avatar
        await loadUserData();
      } else {
        toast.error(t("settings.profile.avatarUploadError"));
      }
    } catch (error: unknown) {
      logger.apiError("Failed to upload avatar", error, "/api/v1/users/avatar", "POST");

      // Try to extract more specific error message
      let errorMessage = t("settings.profile.avatarUploadError");
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { error?: string; message?: string } };
        };
        if (axiosError.response?.data?.error) {
          const errorCode = axiosError.response.data.error;
          if (errorCode === "UPLOAD_UNSUPPORTED_TYPE") {
            errorMessage = t("settings.profile.avatarInvalidFormat");
          } else if (errorCode === "UPLOAD_TOO_LARGE") {
            errorMessage = t("settings.profile.avatarFileTooLarge");
          } else if (axiosError.response.data.message) {
            errorMessage = axiosError.response.data.message;
          }
        }
      }

      toast.error(errorMessage);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const payload: Record<string, unknown> = {
        displayName,
        locale,
        defaultVisibility,
        units,
      };

      // Add profile fields (FR-009)
      if (alias.trim()) {
        payload.alias = alias.trim();
      }
      if (weight.trim()) {
        const weightValue = parseFloat(weight);
        if (!isNaN(weightValue) && weightValue > 0) {
          payload.weight = weightValue;
          payload.weightUnit = weightUnit;
        }
      }
      if (fitnessLevel) {
        payload.fitnessLevel = fitnessLevel;
      }
      if (trainingFrequency) {
        payload.trainingFrequency = trainingFrequency;
      }

      await apiClient.patch("/api/v1/users/me", payload);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      // Reload user data to get updated profile
      await loadUserData();
    } catch (error) {
      logger.apiError("Failed to save preferences", error, "/api/v1/users/me", "PATCH");
      const errorMessage =
        (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? t("settings.preferences.saveError");
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnable2FA = async () => {
    setLoading2FA(true);
    try {
      const response = await setup2FA();
      setTwoFAQRCode(response.qrCode);
      setTwoFABackupCodes(response.backupCodes);
      setShowTwoFASetup(true);
    } catch (error) {
      logger.apiError("Failed to enable 2FA", error, "/api/v1/auth/2fa/setup", "GET");
      toast.error(t("settings.twoFactor.enableError"));
    } finally {
      setLoading2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (twoFACode.length !== 6) {
      toast.warning(t("settings.twoFactor.invalidCode"));
      return;
    }

    setLoading2FA(true);
    try {
      await verify2FA(twoFACode);
      setTwoFAEnabled(true);
      setShowTwoFASetup(false);
      setTwoFACode("");
      setTwoFAQRCode(null);
      setTwoFABackupCodes([]);
      toast.success(t("settings.twoFactor.enableSuccess"));
    } catch (error) {
      logger.apiError("Failed to verify 2FA", error, "/api/v1/auth/2fa/verify", "POST");
      toast.error(t("settings.twoFactor.verifyError"));
    } finally {
      setLoading2FA(false);
    }
  };

  const handleDisable2FA = () => {
    if (!disable2FAPassword) {
      toast.warning(t("settings.twoFactor.enterPasswordWarning"));
      return;
    }

    setShowDisable2FAConfirm(true);
  };

  const confirmDisable2FA = async () => {
    setShowDisable2FAConfirm(false);
    setLoading2FA(true);
    try {
      await disable2FA(disable2FAPassword);
      setTwoFAEnabled(false);
      setDisable2FAPassword("");
      toast.success(t("settings.twoFactor.disableSuccess"));
    } catch (error) {
      logger.apiError("Failed to disable 2FA", error, "/api/v1/auth/2fa/disable", "POST");
      toast.error(t("settings.twoFactor.disableError"));
    } finally {
      setLoading2FA(false);
    }
  };

  const handleDeleteAccount = () => {
    if (!deleteConfirmPassword) {
      toast.warning(t("settings.dangerZone.deletePasswordWarning"));
      return;
    }

    setShowDeleteAccountConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    setShowDeleteAccountConfirm(false);

    try {
      // SECURITY: Send password for verification before account deletion
      await apiClient.delete("/api/v1/users/me", {
        data: { password: deleteConfirmPassword },
      });

      toast.success(t("settings.dangerZone.deleteSuccess"));
      setTimeout(() => {
        void (async () => {
          await signOut();
          void navigate("/");
        })();
      }, 2000);
    } catch (error) {
      logger.apiError("Failed to delete account", error, "/api/v1/users/me", "DELETE");
      toast.error(t("settings.dangerZone.deleteError"));
    }
  };

  const renderProfileSection = () => (
    <Card>
      <CardHeader>
        <div className="flex flex--align-center flex--gap-075">
          <User size={20} />
          <CardTitle>{t("settings.profile.title")}</CardTitle>
        </div>
        <CardDescription>{t("settings.profile.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid--gap-md">
          {/* Avatar Upload */}
          <div>
            <label className="form-label-text block mb-05 font-weight-600">
              {t("settings.profile.avatar")}
            </label>
            <div className="flex flex--align-center flex--gap-md">
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "var(--color-surface-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid var(--color-border)",
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <User size={40} style={{ color: "var(--color-text-muted)" }} />
                )}
              </div>
              <div className="flex flex--gap-sm">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => {
                    void handleAvatarUpload(e);
                  }}
                  style={{ display: "none" }}
                  id="avatar-upload"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Upload size={16} />}
                  disabled={uploadingAvatar}
                  isLoading={uploadingAvatar}
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current && !uploadingAvatar) {
                      fileInputRef.current.click();
                    }
                  }}
                >
                  {uploadingAvatar
                    ? t("settings.profile.avatarUploading")
                    : avatarUrl
                      ? t("settings.profile.avatarChange")
                      : t("settings.profile.avatarUpload")}
                </Button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="display-name" className="form-label-text block mb-05 font-weight-600">
              {t("settings.profile.displayName")}
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("settings.profile.displayNamePlaceholder")}
              className="form-input"
              style={{ background: "var(--color-surface)" }}
            />
          </div>

          <div>
            <label htmlFor="email" className="form-label-text block mb-05 font-weight-600">
              {t("settings.profile.email")}
            </label>
            <input
              id="email"
              type="email"
              value={
                loadingUser
                  ? t("settings.loading")
                  : (userData?.email ?? t("settings.notAvailable"))
              }
              disabled
              className="form-input"
              style={{
                background: "rgba(0, 0, 0, 0.2)",
                color: "var(--color-text-secondary)",
              }}
            />
            <p className="mt-05 text-085 text-muted">{t("settings.profile.emailCannotChange")}</p>
          </div>

          {/* Alias field (FR-009) */}
          <div>
            <label htmlFor="alias" className="form-label-text block mb-05 font-weight-600">
              {t("settings.profile.alias")}
            </label>
            <input
              id="alias"
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder={t("settings.profile.aliasPlaceholder")}
              className="form-input"
              style={{ background: "var(--color-surface)" }}
            />
            <p className="mt-05 text-085 text-muted">{t("settings.profile.aliasHelp")}</p>
          </div>

          {/* Weight field (FR-009) */}
          <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: "0.75rem" }}>
            <div>
              <label htmlFor="weight" className="form-label-text block mb-05 font-weight-600">
                {t("settings.profile.weight")}
              </label>
              <input
                id="weight"
                type="number"
                min="20"
                max="500"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={t("settings.profile.weightPlaceholder")}
                className="form-input"
                style={{ background: "var(--color-surface)" }}
              />
            </div>
            <div>
              <label htmlFor="weight-unit" className="form-label-text block mb-05 font-weight-600">
                {t("settings.profile.weightUnit")}
              </label>
              <select
                id="weight-unit"
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value as "kg" | "lb")}
                className="form-input"
                style={{ background: "var(--color-surface)" }}
              >
                <option value="kg">{t("settings.profile.weightKg")}</option>
                <option value="lb">{t("settings.profile.weightLb")}</option>
              </select>
            </div>
          </div>

          {/* Fitness Level field (FR-009) */}
          <div>
            <label htmlFor="fitness-level" className="form-label-text block mb-05 font-weight-600">
              {t("settings.profile.fitnessLevel")}
            </label>
            <select
              id="fitness-level"
              value={fitnessLevel}
              onChange={(e) => setFitnessLevel(e.target.value as FitnessLevel)}
              className="form-input"
              style={{ background: "var(--color-surface)" }}
            >
              <option value="">{t("common.loading")}</option>
              <option value="beginner">{t("settings.profile.fitnessLevelBeginner")}</option>
              <option value="intermediate">{t("settings.profile.fitnessLevelIntermediate")}</option>
              <option value="advanced">{t("settings.profile.fitnessLevelAdvanced")}</option>
              <option value="elite">{t("settings.profile.fitnessLevelElite")}</option>
            </select>
          </div>

          {/* Training Frequency field (FR-009) */}
          <div>
            <label
              htmlFor="training-frequency"
              className="form-label-text block mb-05 font-weight-600"
            >
              {t("settings.profile.trainingFrequency")}
            </label>
            <select
              id="training-frequency"
              value={trainingFrequency}
              onChange={(e) => setTrainingFrequency(e.target.value as TrainingFrequency)}
              className="form-input"
              style={{ background: "var(--color-surface)" }}
            >
              <option value="">{t("common.loading")}</option>
              <option value="rarely">{t("settings.profile.trainingFrequencyRarely")}</option>
              <option value="1_2_per_week">{t("settings.profile.trainingFrequency1_2")}</option>
              <option value="3_4_per_week">{t("settings.profile.trainingFrequency3_4")}</option>
              <option value="5_plus_per_week">
                {t("settings.profile.trainingFrequency5Plus")}
              </option>
            </select>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="primary"
          onClick={() => {
            void handleSavePreferences();
          }}
          isLoading={isSaving}
          leftIcon={<Save size={18} />}
        >
          {isSaving ? t("settings.preferences.saving") : t("common.save")}
        </Button>
      </CardFooter>
    </Card>
  );

  const renderPreferencesSection = () => (
    <Card>
      <CardHeader>
        <div className="flex flex--align-center flex--gap-075">
          <Globe size={20} />
          <CardTitle>{t("settings.preferences.title")}</CardTitle>
        </div>
        <CardDescription>{t("settings.preferences.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid--gap-md">
          <div>
            <label
              htmlFor="default-visibility"
              className="form-label-text block mb-05 font-weight-600"
            >
              {t("settings.preferences.defaultVisibility")}
            </label>
            <select
              id="default-visibility"
              value={defaultVisibility}
              onChange={(e) => setDefaultVisibility(e.target.value as SessionVisibility)}
              className="form-input"
              style={{ background: "var(--color-surface)" }}
            >
              <option value="private">{t("settings.preferences.visibilityOptions.private")}</option>
              <option value="followers">
                {t("settings.preferences.visibilityOptions.followers")}
              </option>
              <option value="link">{t("settings.preferences.visibilityOptions.link")}</option>
              <option value="public">{t("settings.preferences.visibilityOptions.public")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="units" className="form-label-text block mb-05 font-weight-600">
              {t("settings.preferences.units")}
            </label>
            <select
              id="units"
              value={units}
              onChange={(e) => setUnits(e.target.value as Units)}
              className="form-input"
              style={{ background: "var(--color-surface)" }}
            >
              <option value="metric">{t("settings.preferences.unitsOptions.metric")}</option>
              <option value="imperial">{t("settings.preferences.unitsOptions.imperial")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="locale" className="form-label-text block mb-05 font-weight-600">
              {t("settings.preferences.language")}
            </label>
            <select
              id="locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="form-input"
              style={{ background: "var(--color-surface)" }}
            >
              <option value="en">{t("settings.preferences.languageOptions.en")}</option>
              <option value="de">{t("settings.preferences.languageOptions.de")}</option>
            </select>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        {saveSuccess && (
          <div
            className="text-085"
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: "rgba(52, 211, 153, 0.15)",
              color: "var(--color-accent)",
              marginRight: "1rem",
            }}
          >
            {t("settings.preferences.saveSuccess")}
          </div>
        )}
        {saveError && (
          <div
            className="text-085"
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.15)",
              color: "var(--color-danger)",
              marginRight: "1rem",
            }}
          >
            {saveError}
          </div>
        )}
        <Button
          variant="primary"
          onClick={() => void handleSavePreferences()}
          isLoading={isSaving}
          leftIcon={<Save size={18} />}
        >
          {isSaving ? t("settings.preferences.saving") : t("settings.preferences.saveButton")}
        </Button>
      </CardFooter>
    </Card>
  );

  const renderSecuritySection = () => (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex--align-center flex--gap-075">
            <Shield size={20} />
            <CardTitle>{t("settings.twoFactor.title")}</CardTitle>
          </div>
          <CardDescription>{t("settings.twoFactor.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!twoFAEnabled && !showTwoFASetup && (
            <div>
              <p
                className="text-secondary mb-md"
                dangerouslySetInnerHTML={{ __html: t("settings.twoFactor.disabled") }}
              />
              <Button
                variant="primary"
                onClick={() => void handleEnable2FA()}
                leftIcon={<Shield size={18} />}
                disabled={loading2FA}
                isLoading={loading2FA}
              >
                {t("settings.twoFactor.enable")}
              </Button>
            </div>
          )}

          {showTwoFASetup && (
            <div>
              <p className="text-secondary mb-md">{t("settings.twoFactor.scanQRCode")}</p>
              <div
                style={{
                  padding: "2rem",
                  background: "rgba(255, 255, 255, 0.9)",
                  borderRadius: "12px",
                  textAlign: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    width: "200px",
                    height: "200px",
                    background: "#fff",
                    margin: "0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #ddd",
                    borderRadius: "8px",
                  }}
                >
                  {twoFAQRCode ? (
                    <img
                      src={twoFAQRCode}
                      alt="2FA QR Code"
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <span style={{ color: "#666" }}>{t("settings.twoFactor.loadingQRCode")}</span>
                  )}
                </div>
              </div>

              <label htmlFor="2fa-code" className="form-label-text block mb-05 font-weight-600">
                {t("settings.twoFactor.enterCode")}
              </label>
              <div className="flex flex--gap-sm">
                <input
                  id="2fa-code"
                  type="text"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder={t("settings.profile.twoFactorCodePlaceholder")}
                  maxLength={6}
                  className="form-input"
                  style={{
                    flex: 1,
                    fontSize: "1.5rem",
                    textAlign: "center",
                    fontFamily: "monospace",
                    letterSpacing: "0.5rem",
                    background: "var(--color-surface)",
                  }}
                />
                <Button
                  variant="primary"
                  onClick={() => void handleVerify2FA()}
                  disabled={twoFACode.length !== 6 || loading2FA}
                  isLoading={loading2FA}
                >
                  {t("settings.twoFactor.verifyAndEnable")}
                </Button>
              </div>

              {twoFABackupCodes.length > 0 && (
                <div
                  style={{
                    marginTop: "1.5rem",
                    padding: "1rem",
                    background: "rgba(251, 191, 36, 0.1)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    borderRadius: "8px",
                  }}
                >
                  <h4 className="mb-05 font-weight-600">{t("settings.twoFactor.backupCodes")}</h4>
                  <p className="text-085 text-secondary mb-md">
                    {t("settings.twoFactor.backupCodesDescription")}
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "0.5rem",
                      fontFamily: "monospace",
                      fontSize: "0.9rem",
                    }}
                  >
                    {twoFABackupCodes.map((code, index) => (
                      <div
                        key={index}
                        style={{
                          padding: "0.5rem",
                          background: "rgba(0,0,0,0.2)",
                          borderRadius: "4px",
                        }}
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {twoFAEnabled && (
            <div>
              <p
                className="mb-md font-weight-600"
                style={{ color: "var(--color-accent)" }}
                dangerouslySetInnerHTML={{ __html: t("settings.twoFactor.enabled") }}
              />
              <p className="text-secondary mb-md">{t("settings.twoFactor.enabledDescription")}</p>
              <div className="mb-md">
                <label
                  htmlFor="disable-2fa-password"
                  className="form-label-text block mb-05 font-weight-600"
                >
                  {t("settings.twoFactor.enterPasswordToDisable")}
                </label>
                <input
                  type="password"
                  id="disable-2fa-password"
                  value={disable2FAPassword}
                  onChange={(e) => setDisable2FAPassword(e.target.value)}
                  placeholder={t("settings.profile.passwordPlaceholder")}
                  className="form-input"
                  style={{ background: "var(--color-surface)" }}
                />
              </div>
              <Button
                variant="danger"
                onClick={() => void handleDisable2FA()}
                disabled={!disable2FAPassword || loading2FA}
                isLoading={loading2FA}
              >
                {t("settings.twoFactor.disable")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <SessionManagement />
    </>
  );

  const renderDangerZoneSection = () => (
    <Card>
      <CardHeader>
        <div className="flex flex--align-center flex--gap-075">
          <Trash2 size={20} style={{ color: "var(--color-danger)" }} />
          <CardTitle style={{ color: "var(--color-danger)" }}>
            {t("settings.dangerZone.title")}
          </CardTitle>
        </div>
        <CardDescription>{t("settings.dangerZone.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!showDeleteConfirm && (
          <div>
            <p className="text-secondary mb-md">{t("settings.dangerZone.deleteDescription")}</p>
            <ul
              style={{
                marginLeft: "1.5rem",
                marginBottom: "1rem",
                color: "var(--color-text-secondary)",
              }}
            >
              <li>{t("settings.dangerZone.deleteItems.data")}</li>
              <li>{t("settings.dangerZone.deleteItems.sessions")}</li>
              <li>{t("settings.dangerZone.deleteItems.profile")}</li>
              <li>{t("settings.dangerZone.deleteItems.irreversible")}</li>
            </ul>
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              leftIcon={<Trash2 size={18} />}
            >
              {t("settings.dangerZone.deleteAccount")}
            </Button>
          </div>
        )}

        {showDeleteConfirm && (
          <div>
            <p className="mb-md font-weight-600" style={{ color: "var(--color-danger)" }}>
              {t("settings.dangerZone.deleteWarning")}
            </p>
            <p className="text-secondary mb-md">{t("settings.dangerZone.deletePasswordPrompt")}</p>
            <div className="mb-md">
              <input
                type="password"
                value={deleteConfirmPassword}
                onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                placeholder={t("settings.profile.passwordPlaceholder")}
                className="form-input"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-danger)",
                }}
              />
            </div>
            <div className="flex flex--gap-sm">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmPassword("");
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="danger"
                onClick={() => void handleDeleteAccount()}
                disabled={!deleteConfirmPassword}
              >
                {t("settings.dangerZone.deleteConfirmLabel")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return renderProfileSection();
      case "preferences":
        return renderPreferencesSection();
      case "security":
        return renderSecuritySection();
      case "danger":
        return renderDangerZoneSection();
      default:
        return renderProfileSection();
    }
  };

  const sidebarItems = [
    { id: "profile" as SettingsSection, label: t("settings.profile.title"), icon: User },
    { id: "preferences" as SettingsSection, label: t("settings.preferences.title"), icon: Globe },
    { id: "security" as SettingsSection, label: t("settings.twoFactor.title"), icon: Shield },
    { id: "danger" as SettingsSection, label: t("settings.dangerZone.title"), icon: Trash2 },
  ];

  return (
    <PageIntro
      eyebrow={t("settings.eyebrow")}
      title={t("settings.title")}
      description={t("settings.description")}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "250px 1fr",
          gap: "2rem",
          maxWidth: "1200px",
        }}
      >
        {/* Left Sidebar */}
        <nav
          aria-label={t("settings.title")}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {sidebarItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className="flex flex--align-center flex--gap-sm"
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  border: "none",
                  background: isActive ? "var(--color-surface)" : "transparent",
                  color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                  textAlign: "left",
                  fontWeight: isActive ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--color-surface-muted)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <IconComponent size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Center Content */}
        <div style={{ minWidth: 0 }}>{renderContent()}</div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showDisable2FAConfirm}
        title={t("settings.twoFactor.disableConfirmTitle")}
        message={t("settings.twoFactor.disableConfirmMessage")}
        confirmLabel={t("settings.twoFactor.disableConfirmLabel")}
        cancelLabel={t("common.cancel")}
        variant="warning"
        onConfirm={() => void confirmDisable2FA()}
        onCancel={() => setShowDisable2FAConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showDeleteAccountConfirm}
        title={t("settings.dangerZone.deleteConfirmTitle")}
        message={t("settings.dangerZone.deleteConfirmMessage")}
        confirmLabel={t("settings.dangerZone.deleteConfirmLabel")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={() => void confirmDeleteAccount()}
        onCancel={() => setShowDeleteAccountConfirm(false)}
      />
    </PageIntro>
  );
};

export default Settings;
