import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import AuthPageLayout from "../components/AuthPageLayout";
import { Button } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { verify2FALogin } from "../services/api";

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "12px",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface-glass)",
  color: "var(--color-text-primary)",
  padding: "0.85rem 1rem",
  fontSize: "1.2rem",
  textAlign: "center",
  letterSpacing: "0.5rem",
  fontFamily: "monospace",
};

type LocationState = {
  pendingSessionId?: string;
  from?: string;
};

const TwoFactorVerificationLogin: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      navigate("/login", { replace: true });
    }
  }, [pendingSessionId, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!pendingSessionId) {
      setError("Invalid session. Please try logging in again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await verify2FALogin({
        pendingSessionId,
        code,
      });

      // Backend has set HttpOnly cookies; just update auth state with user data
      signIn(response.user);
      navigate(from, { replace: true });
    } catch (err) {
      // Handle specific error types
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: { code?: string } } } };
        const errorCode = axiosError.response?.data?.error?.code;

        if (errorCode === "TERMS_VERSION_OUTDATED") {
          navigate("/terms-reacceptance", { replace: true });
          return;
        }

        if (errorCode === "AUTH_INVALID_2FA_CODE") {
          setError(t("auth.twoFactor.invalidCode") || "Invalid 2FA code. Please try again.");
        } else if (errorCode === "AUTH_2FA_SESSION_EXPIRED") {
          setError(t("auth.twoFactor.sessionExpired") || "Session expired. Please log in again.");
          setTimeout(() => navigate("/login", { replace: true }), 2000);
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
    navigate("/login", { replace: true });
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
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "var(--color-surface-glass)",
            borderRadius: "12px",
            gap: "0.75rem",
          }}
        >
          <Shield size={24} style={{ color: "var(--color-accent)" }} />
          <span style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            {t("auth.twoFactor.securityNotice") ||
              "This extra step ensures it's really you signing in"}
          </span>
        </div>

        <label style={{ display: "grid", gap: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.95rem",
              color: "var(--color-text-secondary)",
              textAlign: "center",
            }}
          >
            {t("auth.twoFactor.codeLabel") || "Authentication Code"}
          </span>
          <input
            name="code"
            type="text"
            inputMode="numeric"
            placeholder="000000"
            style={inputStyle}
            required
            value={code}
            onChange={handleCodeChange}
            autoComplete="one-time-code"
            disabled={isSubmitting}
            maxLength={6}
            autoFocus
          />
          <span
            style={{
              fontSize: "0.85rem",
              color: "var(--color-text-tertiary)",
              textAlign: "center",
            }}
          >
            {t("auth.twoFactor.codeHint") || "6-digit code or backup code"}
          </span>
        </label>

        {error ? (
          <div
            role="alert"
            style={{
              background: "rgba(248, 113, 113, 0.16)",
              color: "#FFFFFF",
              borderRadius: "12px",
              padding: "0.75rem 1rem",
              fontSize: "0.95rem",
              textAlign: "center",
            }}
          >
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

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            fontSize: "0.9rem",
          }}
        >
          <button
            type="button"
            onClick={handleBackToLogin}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {t("auth.twoFactor.backToLogin") || "Back to login"}
          </button>
        </div>
      </form>
    </AuthPageLayout>
  );
};

export default TwoFactorVerificationLogin;
