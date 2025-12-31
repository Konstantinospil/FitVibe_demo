import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Save, Trash2, Shield, User, Globe } from "lucide-react";
import PageIntro from "../components/PageIntro";
import { Button } from "../components/ui/Button";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ThemeToggle from "../components/ThemeToggle";
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
  const { t, i18n } = useTranslation();

  const labels = {
    title: t("settings.title"),
    description: t("settings.description"),
    loading: t("settings.loading"),
    notAvailable: t("settings.notAvailable"),
    profileTitle: t("settings.profile.title"),
    profileDescription: t("settings.profile.description"),
    displayName: t("settings.profile.displayName"),
    displayNamePlaceholder: t("settings.profile.displayNamePlaceholder"),
    alias: t("settings.profile.alias"),
    aliasPlaceholder: t("settings.profile.aliasPlaceholder"),
    aliasHelp: t("settings.profile.aliasHelp"),
    email: t("settings.profile.email"),
    emailCannotChange: t("settings.profile.emailCannotChange"),
    weight: t("settings.profile.weight"),
    weightPlaceholder: t("settings.profile.weightPlaceholder"),
    weightUnit: t("settings.profile.weightUnit"),
    weightKg: t("settings.profile.weightKg"),
    weightLb: t("settings.profile.weightLb"),
    fitnessLevel: t("settings.profile.fitnessLevel"),
    fitnessLevelBeginner: t("settings.profile.fitnessLevelBeginner"),
    fitnessLevelIntermediate: t("settings.profile.fitnessLevelIntermediate"),
    fitnessLevelAdvanced: t("settings.profile.fitnessLevelAdvanced"),
    fitnessLevelElite: t("settings.profile.fitnessLevelElite"),
    trainingFrequency: t("settings.profile.trainingFrequency"),
    trainingFrequencyRarely: t("settings.profile.trainingFrequencyRarely"),
    trainingFrequency1_2: t("settings.profile.trainingFrequency1_2"),
    trainingFrequency3_4: t("settings.profile.trainingFrequency3_4"),
    trainingFrequency5Plus: t("settings.profile.trainingFrequency5Plus"),
    twoFactorCodePlaceholder: t("settings.profile.twoFactorCodePlaceholder"),
    passwordPlaceholder: t("settings.profile.passwordPlaceholder"),
    preferencesTitle: t("settings.preferences.title"),
    preferencesDescription: t("settings.preferences.description"),
    defaultVisibility: t("settings.preferences.defaultVisibility"),
    units: t("settings.preferences.units"),
    language: t("settings.preferences.language"),
    saveButton: t("settings.preferences.saveButton"),
    saving: t("settings.preferences.saving"),
    saveSuccess: t("settings.preferences.saveSuccess"),
    saveError: t("settings.preferences.saveError"),
    twoFactorTitle: t("settings.twoFactor.title"),
    twoFactorEnable: t("settings.twoFactor.enable"),
    twoFactorDisable: t("settings.twoFactor.disable"),
    twoFactorVerifyAndEnable: t("settings.twoFactor.verifyAndEnable"),
    twoFactorEnabled: t("settings.twoFactor.enabled"),
    twoFactorEnableSuccess: t("settings.twoFactor.enableSuccess"),
    scanQRCode: t("settings.twoFactor.scanQRCode"),
    dangerTitle: t("settings.dangerZone.title"),
    deleteAccount: t("settings.dangerZone.deleteAccount"),
    deleteWarning: t("settings.dangerZone.deleteWarning"),
    deleteConfirmLabel: t("settings.dangerZone.deleteConfirmLabel"),
    deleteConfirmTitle: t("settings.dangerZone.deleteConfirmTitle"),
    confirmDeleteLabel: t("settings.dangerZone.confirmDeleteLabel"),
    deleteError: t("settings.dangerZone.deleteError"),
    cancel: t("common.cancel"),
  };

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

  // Load user data and 2FA status on mount
  useEffect(() => {
    void loadUserData();
    void load2FAStatus();
  }, []); // Intentionally empty - these functions are stable and should only run once on mount

  useEffect(() => {
    if (i18n.language) {
      setLocale(i18n.language);
    }
  }, [i18n.language]);

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
        } else {
          setWeight("");
          setWeightUnit("kg");
        }
        setFitnessLevel((response.data.profile.fitnessLevel as FitnessLevel) ?? "");
        setTrainingFrequency((response.data.profile.trainingFrequency as TrainingFrequency) ?? "");
      } else {
        setAlias("");
        setWeight("");
        setWeightUnit("kg");
        setFitnessLevel("");
        setTrainingFrequency("");
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
          ?.message ?? labels.saveError;
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
      toast.success(labels.twoFactorEnableSuccess);
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
      toast.error(labels.deleteError);
    }
  };

  const renderProfileSection = () => (
    <Card>
      <CardHeader>
        <div className="flex flex--align-center flex--gap-075">
          <User size={20} />
          <CardTitle>{labels.profileTitle}</CardTitle>
        </div>
        <CardDescription>{labels.profileDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid--gap-md">
          <div>
            <label htmlFor="display-name" className="form-label-text block mb-05 font-weight-600">
              {labels.displayName}
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={labels.displayNamePlaceholder}
              className="form-input form-input--surface"
            />
          </div>

          <div>
            <label htmlFor="email" className="form-label-text block mb-05 font-weight-600">
              {labels.email}
            </label>
            <input
              id="email"
              type="email"
              value={loadingUser ? labels.loading : (userData?.email ?? labels.notAvailable)}
              disabled
              className="form-input form-input--muted"
            />
            <p className="mt-05 text-085 text-muted">{labels.emailCannotChange}</p>
          </div>

          {/* Alias field (FR-009) */}
          <div>
            <label htmlFor="alias" className="form-label-text block mb-05 font-weight-600">
              {labels.alias}
            </label>
            <input
              id="alias"
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder={labels.aliasPlaceholder}
              className="form-input form-input--surface"
            />
            <p className="mt-05 text-085 text-muted">{labels.aliasHelp}</p>
          </div>

          {/* Weight field (FR-009) */}
          <div className="grid grid--two-one grid--gap-sm">
            <div>
              <label htmlFor="weight" className="form-label-text block mb-05 font-weight-600">
                {labels.weight}
              </label>
              <input
                id="weight"
                type="number"
                min="20"
                max="300"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={labels.weightPlaceholder}
                className="form-input form-input--surface"
              />
            </div>
            <div>
              <label htmlFor="weight-unit" className="form-label-text block mb-05 font-weight-600">
                {labels.weightUnit}
              </label>
              <select
                id="weight-unit"
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value as "kg" | "lb")}
                className="form-input form-input--surface"
              >
                <option value="kg">{labels.weightKg}</option>
                <option value="lb">{labels.weightLb}</option>
              </select>
            </div>
          </div>

          {/* Fitness Level field (FR-009) */}
          <div>
            <label htmlFor="fitness-level" className="form-label-text block mb-05 font-weight-600">
              {labels.fitnessLevel}
            </label>
            <select
              id="fitness-level"
              value={fitnessLevel}
              onChange={(e) => setFitnessLevel(e.target.value as FitnessLevel)}
              className="form-input form-input--surface"
            >
              <option value="">{t("common.loading")}</option>
              <option value="beginner">{labels.fitnessLevelBeginner}</option>
              <option value="intermediate">{labels.fitnessLevelIntermediate}</option>
              <option value="advanced">{labels.fitnessLevelAdvanced}</option>
              <option value="elite">{labels.fitnessLevelElite}</option>
            </select>
          </div>

          {/* Training Frequency field (FR-009) */}
          <div>
            <label
              htmlFor="training-frequency"
              className="form-label-text block mb-05 font-weight-600"
            >
              {labels.trainingFrequency}
            </label>
            <select
              id="training-frequency"
              value={trainingFrequency}
              onChange={(e) => setTrainingFrequency(e.target.value as TrainingFrequency)}
              className="form-input form-input--surface"
            >
              <option value="">{t("common.loading")}</option>
              <option value="rarely">{labels.trainingFrequencyRarely}</option>
              <option value="1_2_per_week">{labels.trainingFrequency1_2}</option>
              <option value="3_4_per_week">{labels.trainingFrequency3_4}</option>
              <option value="5_plus_per_week">{labels.trainingFrequency5Plus}</option>
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
          <CardTitle>{labels.preferencesTitle}</CardTitle>
        </div>
        <CardDescription>{labels.preferencesDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid--gap-md">
          <div>
            <label
              htmlFor="default-visibility"
              className="form-label-text block mb-05 font-weight-600"
            >
              {labels.defaultVisibility}
            </label>
            <select
              id="default-visibility"
              value={defaultVisibility}
              onChange={(e) => setDefaultVisibility(e.target.value as SessionVisibility)}
              className="form-input form-input--surface"
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
              {labels.units}
            </label>
            <select
              id="units"
              value={units}
              onChange={(e) => setUnits(e.target.value as Units)}
              className="form-input form-input--surface"
            >
              <option value="metric">{t("settings.preferences.unitsOptions.metric")}</option>
              <option value="imperial">{t("settings.preferences.unitsOptions.imperial")}</option>
            </select>
          </div>

          <div>
            <div className="flex flex--align-center flex--justify-between flex--gap-md">
              <div>
                <div className="form-label-text block mb-05 font-weight-600">{labels.language}</div>
              </div>
              <LanguageSwitcher />
            </div>
          </div>

          <div>
            <div className="flex flex--align-center flex--justify-between flex--gap-md">
              <div>
                <div className="form-label-text block mb-05 font-weight-600">
                  {t("settings.preferences.theme")}
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        {saveSuccess && (
          <div className="text-085 settings-flash settings-flash--success">
            {labels.saveSuccess}
          </div>
        )}
        {saveError && (
          <div className="text-085 settings-flash settings-flash--error">{saveError}</div>
        )}
        <Button
          variant="primary"
          onClick={() => void handleSavePreferences()}
          isLoading={isSaving}
          leftIcon={<Save size={18} />}
        >
          {isSaving ? labels.saving : labels.saveButton}
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
            <CardTitle>{labels.twoFactorTitle}</CardTitle>
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
                {labels.twoFactorEnable}
              </Button>
            </div>
          )}

          {showTwoFASetup && (
            <div>
              <p className="text-secondary mb-md">{labels.scanQRCode}</p>
              <div className="settings-qr-card">
                <div className="settings-qr-frame">
                  {twoFAQRCode ? (
                    <img src={twoFAQRCode} alt="2FA QR Code" className="settings-qr-image" />
                  ) : (
                    <span className="settings-qr-loading">
                      {t("settings.twoFactor.loadingQRCode")}
                    </span>
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
                  placeholder={labels.twoFactorCodePlaceholder}
                  maxLength={6}
                  className="form-input form-input--surface form-input--code form-input--code-lg settings-2fa-code"
                />
                <Button
                  variant="primary"
                  onClick={() => void handleVerify2FA()}
                  disabled={twoFACode.length !== 6 || loading2FA}
                  isLoading={loading2FA}
                >
                  {labels.twoFactorVerifyAndEnable}
                </Button>
              </div>

              {twoFABackupCodes.length > 0 && (
                <div className="settings-backup-codes">
                  <h4 className="mb-05 font-weight-600">{t("settings.twoFactor.backupCodes")}</h4>
                  <p className="text-085 text-secondary mb-md">
                    {t("settings.twoFactor.backupCodesDescription")}
                  </p>
                  <div className="settings-backup-grid">
                    {twoFABackupCodes.map((code, index) => (
                      <div key={index} className="settings-backup-code">
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
                className="mb-md font-weight-600 text-accent"
                dangerouslySetInnerHTML={{ __html: labels.twoFactorEnabled }}
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
                  placeholder={labels.passwordPlaceholder}
                  className="form-input form-input--surface"
                />
              </div>
              <Button
                variant="danger"
                onClick={() => void handleDisable2FA()}
                disabled={!disable2FAPassword || loading2FA}
                isLoading={loading2FA}
              >
                {labels.twoFactorDisable}
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
          <Trash2 size={20} className="icon icon--danger" />
          <CardTitle className="text-danger">{labels.dangerTitle}</CardTitle>
        </div>
        <CardDescription>{t("settings.dangerZone.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!showDeleteConfirm && (
          <div>
            <p className="text-secondary mb-md">{t("settings.dangerZone.deleteDescription")}</p>
            <ul className="settings-delete-list">
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
              {labels.deleteAccount}
            </Button>
          </div>
        )}

        {showDeleteConfirm && (
          <div>
            <p className="mb-md font-weight-600 text-danger">{labels.deleteWarning}</p>
            <p className="text-secondary mb-md">{t("settings.dangerZone.deletePasswordPrompt")}</p>
            <div className="mb-md">
              <input
                type="password"
                value={deleteConfirmPassword}
                onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                placeholder={labels.passwordPlaceholder}
                className="form-input form-input--surface form-input--danger"
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
                {labels.cancel}
              </Button>
              <Button
                variant="danger"
                onClick={() => void handleDeleteAccount()}
                disabled={!deleteConfirmPassword}
              >
                {labels.deleteConfirmLabel}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderContent = () => (
    <div className="grid grid--gap-15">
      <section id="settings-section-profile">{renderProfileSection()}</section>
      <section id="settings-section-preferences">{renderPreferencesSection()}</section>
      <section id="settings-section-security">{renderSecuritySection()}</section>
      <section id="settings-section-danger">{renderDangerZoneSection()}</section>
    </div>
  );

  const scrollToSection = (sectionId: SettingsSection) => {
    if (typeof document === "undefined") {
      return;
    }
    const target = document.getElementById(`settings-section-${sectionId}`);
    if (target?.scrollIntoView) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const sidebarItems = [
    { id: "profile" as SettingsSection, label: labels.profileTitle, icon: User },
    { id: "preferences" as SettingsSection, label: labels.preferencesTitle, icon: Globe },
    { id: "security" as SettingsSection, label: labels.twoFactorTitle, icon: Shield },
    { id: "danger" as SettingsSection, label: labels.dangerTitle, icon: Trash2 },
  ];

  return (
    <PageIntro
      eyebrow={t("settings.eyebrow")}
      title={labels.title}
      description={labels.description}
    >
      <div className="settings-layout">
        {/* Left Sidebar */}
        <nav aria-label={t("settings.title")} className="settings-sidebar">
          {sidebarItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  scrollToSection(item.id);
                }}
                className={
                  isActive
                    ? "settings-sidebar-button settings-sidebar-button--active"
                    : "settings-sidebar-button"
                }
              >
                <IconComponent size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Center Content */}
        <div className="min-w-0">{renderContent()}</div>
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
        title={labels.deleteConfirmTitle}
        message={t("settings.dangerZone.deleteConfirmMessage")}
        confirmLabel={labels.confirmDeleteLabel}
        cancelLabel={labels.cancel}
        variant="danger"
        onConfirm={() => void confirmDeleteAccount()}
        onCancel={() => setShowDeleteAccountConfirm(false)}
      />
    </PageIntro>
  );
};

export default Settings;
