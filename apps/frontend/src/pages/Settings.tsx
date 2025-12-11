import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Save, Trash2, Shield, User, Globe } from "lucide-react";
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
import { apiClient, setup2FA, verify2FA, disable2FA, get2FAStatus } from "../services/api";
import { logger } from "../utils/logger";
import { useToast } from "../contexts/ToastContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { SessionManagement } from "../components/SessionManagement";

type SessionVisibility = "private" | "followers" | "link" | "public";
type Units = "metric" | "imperial";
type FitnessLevel = "beginner" | "intermediate" | "advanced" | "elite";
type TrainingFrequency = "rarely" | "1_2_per_week" | "3_4_per_week" | "5_plus_per_week";

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
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuthStore();
  const toast = useToast();
  const { t } = useTranslation("common");

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
      toast.error("Failed to enable 2FA. Please try again.");
    } finally {
      setLoading2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (twoFACode.length !== 6) {
      toast.warning("Please enter a valid 6-digit code");
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
      toast.success("2FA enabled successfully!");
    } catch (error) {
      logger.apiError("Failed to verify 2FA", error, "/api/v1/auth/2fa/verify", "POST");
      toast.error("Invalid code. Please try again.");
    } finally {
      setLoading2FA(false);
    }
  };

  const handleDisable2FA = () => {
    if (!disable2FAPassword) {
      toast.warning("Please enter your password to disable 2FA");
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
      toast.success("2FA disabled successfully");
    } catch (error) {
      logger.apiError("Failed to disable 2FA", error, "/api/v1/auth/2fa/disable", "POST");
      toast.error("Failed to disable 2FA. Please check your password and try again.");
    } finally {
      setLoading2FA(false);
    }
  };

  const handleDeleteAccount = () => {
    if (!deleteConfirmPassword) {
      toast.warning("Please enter your password to confirm account deletion");
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

      toast.success("Your account has been scheduled for deletion. You will be logged out now.");
      setTimeout(() => {
        void (async () => {
          await signOut();
          void navigate("/");
        })();
      }, 2000);
    } catch (error) {
      logger.apiError("Failed to delete account", error, "/api/v1/users/me", "DELETE");
      toast.error("Failed to delete account. Please try again.");
    }
  };

  return (
    <PageIntro
      eyebrow="Settings"
      title="Your preferences and account settings"
      description="Manage your profile, privacy, security, and account settings."
    >
      <div className="grid grid--gap-15" style={{ maxWidth: "900px" }}>
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex flex--align-center flex--gap-075">
              <User size={20} />
              <CardTitle>Profile Settings</CardTitle>
            </div>
            <CardDescription>Update your display name and basic information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid--gap-md">
              <div>
                <label
                  htmlFor="display-name"
                  className="form-label-text block mb-05 font-weight-600"
                >
                  Display Name
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
                  value={loadingUser ? "Loading..." : (userData?.email ?? "Not available")}
                  disabled
                  className="form-input"
                  style={{
                    background: "rgba(0, 0, 0, 0.2)",
                    color: "var(--color-text-secondary)",
                  }}
                />
                <p className="mt-05 text-085 text-muted">
                  {t("settings.profile.emailCannotChange")}
                </p>
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
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "12px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      color: "var(--color-text-primary)",
                      fontSize: "1rem",
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="weight-unit"
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                    }}
                  >
                    {t("settings.profile.weightUnit")}
                  </label>
                  <select
                    id="weight-unit"
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value as "kg" | "lb")}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "12px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      color: "var(--color-text-primary)",
                      fontSize: "1rem",
                    }}
                  >
                    <option value="kg">{t("settings.profile.weightKg")}</option>
                    <option value="lb">{t("settings.profile.weightLb")}</option>
                  </select>
                </div>
              </div>

              {/* Fitness Level field (FR-009) */}
              <div>
                <label
                  htmlFor="fitness-level"
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  {t("settings.profile.fitnessLevel")}
                </label>
                <select
                  id="fitness-level"
                  value={fitnessLevel}
                  onChange={(e) => setFitnessLevel(e.target.value as FitnessLevel)}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "12px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-text-primary)",
                    fontSize: "1rem",
                  }}
                >
                  <option value="">{t("common.loading")}</option>
                  <option value="beginner">{t("settings.profile.fitnessLevelBeginner")}</option>
                  <option value="intermediate">
                    {t("settings.profile.fitnessLevelIntermediate")}
                  </option>
                  <option value="advanced">{t("settings.profile.fitnessLevelAdvanced")}</option>
                  <option value="elite">{t("settings.profile.fitnessLevelElite")}</option>
                </select>
              </div>

              {/* Training Frequency field (FR-009) */}
              <div>
                <label
                  htmlFor="training-frequency"
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  {t("settings.profile.trainingFrequency")}
                </label>
                <select
                  id="training-frequency"
                  value={trainingFrequency}
                  onChange={(e) => setTrainingFrequency(e.target.value as TrainingFrequency)}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "12px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-text-primary)",
                    fontSize: "1rem",
                  }}
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
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Globe size={20} />
              <CardTitle>Preferences</CardTitle>
            </div>
            <CardDescription>
              Set your default session visibility, units, and language
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: "grid", gap: "1.5rem" }}>
              <div>
                <label
                  htmlFor="default-visibility"
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  Default Session Visibility
                </label>
                <select
                  id="default-visibility"
                  value={defaultVisibility}
                  onChange={(e) => setDefaultVisibility(e.target.value as SessionVisibility)}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "12px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-text-primary)",
                    fontSize: "1rem",
                  }}
                >
                  <option value="private">Private (only you)</option>
                  <option value="followers">Followers</option>
                  <option value="link">Link only</option>
                  <option value="public">Public</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="units"
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  Units
                </label>
                <select
                  id="units"
                  value={units}
                  onChange={(e) => setUnits(e.target.value as Units)}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "12px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-text-primary)",
                    fontSize: "1rem",
                  }}
                >
                  <option value="metric">Metric (kg, km)</option>
                  <option value="imperial">Imperial (lb, mi)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="locale"
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  Language
                </label>
                <select
                  id="locale"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "12px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-text-primary)",
                    fontSize: "1rem",
                  }}
                >
                  <option value="en">English</option>
                  <option value="de">Deutsch (German)</option>
                </select>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            {saveSuccess && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  background: "rgba(52, 211, 153, 0.15)",
                  color: "var(--color-accent)",
                  fontSize: "0.9rem",
                  marginRight: "1rem",
                }}
              >
                {t("settings.preferences.saveSuccess")}
              </div>
            )}
            {saveError && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "var(--color-danger)",
                  fontSize: "0.9rem",
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

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Shield size={20} />
              <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
            </div>
            <CardDescription>
              Add an extra layer of security to your account with 2FA
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!twoFAEnabled && !showTwoFASetup && (
              <div>
                <p style={{ marginBottom: "1rem", color: "var(--color-text-secondary)" }}>
                  2FA is currently <strong>disabled</strong>. Enable it to secure your account with
                  a time-based one-time password (TOTP).
                </p>
                <Button
                  variant="primary"
                  onClick={() => void handleEnable2FA()}
                  leftIcon={<Shield size={18} />}
                  disabled={loading2FA}
                  isLoading={loading2FA}
                >
                  Enable 2FA
                </Button>
              </div>
            )}

            {showTwoFASetup && (
              <div>
                <p style={{ marginBottom: "1rem", color: "var(--color-text-secondary)" }}>
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
                </p>
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
                      <span style={{ color: "#666" }}>Loading QR Code...</span>
                    )}
                  </div>
                </div>

                <label
                  htmlFor="2fa-code"
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  Enter the 6-digit code from your app:
                </label>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <input
                    id="2fa-code"
                    type="text"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder={t("settings.profile.twoFactorCodePlaceholder")}
                    maxLength={6}
                    style={{
                      flex: 1,
                      padding: "0.75rem 1rem",
                      borderRadius: "12px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      color: "var(--color-text-primary)",
                      fontSize: "1.5rem",
                      textAlign: "center",
                      fontFamily: "monospace",
                      letterSpacing: "0.5rem",
                    }}
                  />
                  <Button
                    variant="primary"
                    onClick={() => void handleVerify2FA()}
                    disabled={twoFACode.length !== 6 || loading2FA}
                    isLoading={loading2FA}
                  >
                    Verify and Enable
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
                    <h4 style={{ marginBottom: "0.5rem", fontSize: "0.95rem", fontWeight: 600 }}>
                      Backup Codes
                    </h4>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        marginBottom: "1rem",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Save these backup codes in a secure location. You can use them to access your
                      account if you lose your authenticator device.
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
                <p style={{ marginBottom: "1rem", color: "var(--color-accent)", fontWeight: 600 }}>
                  ✓ 2FA is currently <strong>enabled</strong>
                </p>
                <p style={{ marginBottom: "1rem", color: "var(--color-text-secondary)" }}>
                  Your account is protected with two-factor authentication.
                </p>
                <div style={{ marginBottom: "1rem" }}>
                  <label
                    htmlFor="disable-2fa-password"
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                    }}
                  >
                    Enter your password to disable 2FA
                  </label>
                  <input
                    type="password"
                    id="disable-2fa-password"
                    value={disable2FAPassword}
                    onChange={(e) => setDisable2FAPassword(e.target.value)}
                    placeholder={t("settings.profile.passwordPlaceholder")}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      color: "var(--color-text-primary)",
                      fontSize: "1rem",
                    }}
                  />
                </div>
                <Button
                  variant="danger"
                  onClick={() => void handleDisable2FA()}
                  disabled={!disable2FAPassword || loading2FA}
                  isLoading={loading2FA}
                >
                  Disable 2FA
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Management */}
        <SessionManagement />

        {/* Danger Zone */}
        <Card>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Trash2 size={20} style={{ color: "var(--color-danger)" }} />
              <CardTitle style={{ color: "var(--color-danger)" }}>Danger Zone</CardTitle>
            </div>
            <CardDescription>
              Irreversible actions that will permanently affect your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm && (
              <div>
                <p style={{ marginBottom: "1rem", color: "var(--color-text-secondary)" }}>
                  Deleting your account will:
                </p>
                <ul
                  style={{
                    marginLeft: "1.5rem",
                    marginBottom: "1rem",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <li>Permanently delete all your workout data</li>
                  <li>Remove all your sessions and progress records</li>
                  <li>Delete your profile and account information</li>
                  <li>This action cannot be undone</li>
                </ul>
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  leftIcon={<Trash2 size={18} />}
                >
                  Delete My Account
                </Button>
              </div>
            )}

            {showDeleteConfirm && (
              <div>
                <p style={{ marginBottom: "1rem", color: "var(--color-danger)", fontWeight: 600 }}>
                  ⚠️ Warning: This will permanently delete your account
                </p>
                <p style={{ marginBottom: "1rem", color: "var(--color-text-secondary)" }}>
                  Please enter your password to confirm account deletion:
                </p>
                <div style={{ marginBottom: "1rem" }}>
                  <input
                    type="password"
                    value={deleteConfirmPassword}
                    onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                    placeholder={t("settings.profile.passwordPlaceholder")}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "12px",
                      border: "1px solid var(--color-danger)",
                      background: "var(--color-surface)",
                      color: "var(--color-text-primary)",
                      fontSize: "1rem",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmPassword("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => void handleDeleteAccount()}
                    disabled={!deleteConfirmPassword}
                  >
                    Yes, Delete My Account
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showDisable2FAConfirm}
        title="Disable Two-Factor Authentication"
        message="Are you sure you want to disable 2FA? This will make your account less secure."
        confirmLabel="Yes, Disable 2FA"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={() => void confirmDisable2FA()}
        onCancel={() => setShowDisable2FAConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showDeleteAccountConfirm}
        title="Delete Account"
        message="This will permanently delete your account and all your data. This action cannot be undone. Are you absolutely sure?"
        confirmLabel="Confirm Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => void confirmDeleteAccount()}
        onCancel={() => setShowDeleteAccountConfirm(false)}
      />
    </PageIntro>
  );
};

export default Settings;
