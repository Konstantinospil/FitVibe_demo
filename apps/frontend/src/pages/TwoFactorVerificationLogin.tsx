import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import AuthPageLayout from "../components/AuthPageLayout";
import { Button } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { verify2FALogin } from "../services/api";
import { useRequiredFieldValidation } from "../hooks/useRequiredFieldValidation";

type LocationState = {
  pendingSessionId?: string;
  from?: string;
};

const TwoFactorVerificationLogin: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const formRef = useRef<HTMLFormElement>(null);
  useRequiredFieldValidation(formRef, t);
  const location = useLocation();
  const state = location.state as LocationState | null;

  const pendingSessionId = state?.pendingSessionId;
  const from = state?.from || "/";

  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if no pending session
  useEffect(() => {
    if (!pendingSessionId) {
      void navigate("/login", { replace: true });
    }
  }, [pendingSessionId, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Set submitting state synchronously before async operations
    setIsSubmitting(true);
    setError(null);

    if (!pendingSessionId) {
      setError(
        t("auth.twoFactor.invalidSession") || "Invalid session. Please try logging in again.",
      );
      setIsSubmitting(false);
      setTimeout(() => void navigate("/login", { replace: true }), 2000);
      return;
    }

    try {
      const response = await verify2FALogin({
        pendingSessionId,
        code,
      });

      // Backend has set HttpOnly cookies; just update auth state with user data
      signIn(response.user);
      void navigate(from, { replace: true });
    } catch (err) {
      // Handle specific error types
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: {
            data?: {
              error?: { code?: string };
              user?: {
                id: string;
                username: string;
                email: string;
                role?: string;
              };
              termsOutdated?: boolean;
              privacyPolicyOutdated?: boolean;
            };
          };
        };
        const errorCode = axiosError.response?.data?.error?.code;
        const userData = axiosError.response?.data?.user;

        if (
          errorCode === "TERMS_VERSION_OUTDATED" ||
          errorCode === "PRIVACY_POLICY_VERSION_OUTDATED" ||
          errorCode === "LEGAL_DOCUMENTS_VERSION_OUTDATED"
        ) {
          // User is authenticated (cookies are set), sign in to update frontend state
          if (userData) {
            signIn({
              id: userData.id,
              username: userData.username,
              email: userData.email,
              role: userData.role,
            });
          }
          // Determine which documents need acceptance from error response
          const termsOutdated = axiosError.response?.data?.termsOutdated ?? true;
          const privacyOutdated = axiosError.response?.data?.privacyPolicyOutdated ?? false;
          const params = new URLSearchParams();
          if (termsOutdated) {
            params.set("terms", "true");
          }
          if (privacyOutdated) {
            params.set("privacy", "true");
          }
          void navigate(`/terms-reacceptance?${params.toString()}`, { replace: true });
          return;
        }

        if (errorCode === "AUTH_INVALID_2FA_CODE") {
          setError(t("auth.twoFactor.invalidCode") || "Invalid 2FA code. Please try again.");
        } else if (errorCode === "AUTH_2FA_SESSION_EXPIRED") {
          setError(t("auth.twoFactor.sessionExpired") || "Session expired. Please log in again.");
          setTimeout(() => void navigate("/login", { replace: true }), 2000);
        } else {
          setError(t("auth.twoFactor.error") || "Verification failed. Please try again.");
        }
      } else {
        setError(t("auth.twoFactor.error") || "Verification failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
  };

  const handleBackToLogin = () => {
    void navigate("/login", { replace: true });
  };

  return (
    <AuthPageLayout
      eyebrow={t("auth.twoFactor.eyebrow") || "Two-Factor Authentication"}
      title={t("auth.twoFactor.title") || "Enter Your Code"}
      description={
        t("auth.twoFactor.description") ||
        "Enter the 6-digit code from your authenticator app or use a backup code."
      }
    >
      {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
      <form ref={formRef} onSubmit={handleSubmit} className="form form--gap-lg">
        <div
          className="flex flex--align-center flex--center p-md rounded-md flex--gap-075"
          style={{ background: "var(--color-surface-glass)" }}
        >
          <Shield size={24} className="icon--accent" />
          <span className="text-09 text-secondary">
            {t("auth.twoFactor.securityNotice") ||
              "This extra step ensures it's really you signing in"}
          </span>
        </div>

        <label className="form-label" style={{ gap: "0.5rem" }}>
          <span className="form-label-text text-center">
            {t("auth.twoFactor.codeLabel") || "Authentication Code"}
          </span>
          <input
            name="code"
            type="text"
            inputMode="numeric"
            placeholder={t("twoFactor.codePlaceholder")}
            className="form-input form-input--code"
            required
            value={code}
            onChange={handleCodeChange}
            autoComplete="one-time-code"
            disabled={isSubmitting}
            maxLength={6}
            autoFocus
          />
          <span className="text-085 text-muted text-center">
            {t("auth.twoFactor.codeHint") || "6-digit code or backup code"}
          </span>
        </label>

        {error ? (
          <div role="alert" className="form-error text-center">
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          disabled={isSubmitting || code.length !== 6}
        >
          {isSubmitting
            ? t("auth.twoFactor.verifying") || "Verifying..."
            : t("auth.twoFactor.verify") || "Verify and Continue"}
        </Button>

        <div className="flex flex--justify-between text-09">
          <button type="button" onClick={handleBackToLogin} className="form-link">
            {t("auth.twoFactor.backToLogin") || "Back to login"}
          </button>
        </div>
      </form>
    </AuthPageLayout>
  );
};

export default TwoFactorVerificationLogin;
