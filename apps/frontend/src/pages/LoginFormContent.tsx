import React, { useState, useRef } from "react";
import { useNavigate, useLocation, NavLink, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { login } from "../services/api";
import { logger } from "../utils/logger.js";
import { useRequiredFieldValidation } from "../hooks/useRequiredFieldValidation";

const LoginFormContent: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const formRef = useRef<HTMLFormElement>(null);
  useRequiredFieldValidation(formRef, t);
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Check for returnUrl in query params first, then location.state
  const returnUrl = searchParams.get("returnUrl");
  const requestedPath =
    returnUrl || (location.state as { from?: { pathname?: string } })?.from?.pathname;
  const from =
    typeof requestedPath === "string" &&
    requestedPath.startsWith("/") &&
    !requestedPath.startsWith("//") &&
    !requestedPath.includes("://")
      ? requestedPath
      : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showPasswordLabel = t("auth.login.showPassword", {
    defaultValue: t("auth.showPassword"),
  });
  const hidePasswordLabel = t("auth.login.hidePassword", {
    defaultValue: t("auth.hidePassword"),
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validate inputs
    if (!email.trim() || !password) {
      setError(t("auth.login.fillAllFields"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await login({ email: email.trim(), password });

      if (response.requires2FA) {
        // Navigate to 2FA verification page
        void navigate("/login/verify-2fa", {
          state: {
            pendingSessionId: response.pendingSessionId,
            from,
          },
          replace: false,
        });
        return;
      }

      // Login successful - sign in and navigate
      if (response.user) {
        signIn(response.user);
        void navigate(from, { replace: true });
      } else {
        setError(t("auth.login.error"));
      }
    } catch (err: unknown) {
      logger.error("Login error", err instanceof Error ? err : new Error(String(err)), {
        context: "login",
      });

      // Handle terms version outdated error
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: {
            data?: {
              error?: {
                code?: string;
                message?: string;
                details?: {
                  remainingSeconds?: number;
                  lockoutType?: "account" | "ip";
                  attemptCount?: number;
                  totalAttemptCount?: number;
                  distinctEmailCount?: number;
                  maxAttempts?: number;
                  warning?: boolean;
                  remainingAccountAttempts?: number;
                  remainingIPAttempts?: number;
                  remainingIPDistinctEmails?: number;
                  accountAttemptCount?: number;
                  ipTotalAttemptCount?: number;
                  ipDistinctEmailCount?: number;
                };
              };
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
        const errorMessage = axiosError.response?.data?.error?.message;
        const errorDetails = axiosError.response?.data?.error?.details;
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

        // Handle lockout errors with timer
        if (
          (errorCode === "AUTH_ACCOUNT_LOCKED" || errorCode === "AUTH_IP_LOCKED") &&
          errorDetails?.remainingSeconds !== undefined &&
          errorDetails?.lockoutType
        ) {
          setError(errorMessage || t("auth.lockout.locked"));
          return;
        }

        // Handle warning for approaching lockout
        if (
          errorCode === "AUTH_INVALID_CREDENTIALS" &&
          errorDetails?.warning &&
          errorDetails.remainingAccountAttempts !== undefined &&
          errorDetails.remainingIPAttempts !== undefined &&
          errorDetails.remainingIPDistinctEmails !== undefined
        ) {
          // Warning state is handled by error message
        }

        // Show specific error message if available
        // Prioritize errorCode translation, but also check if errorMessage is an error code
        if (errorCode) {
          const translatedError = t(`errors.${errorCode}`);
          setError(
            translatedError !== `errors.${errorCode}` ? translatedError : t("auth.login.error"),
          );
        } else if (errorMessage) {
          // Check if errorMessage looks like an error code (e.g., "AUTH_INVALID_CREDENTIALS")
          // If so, try to translate it
          if (errorMessage.includes("_") && errorMessage === errorMessage.toUpperCase()) {
            const translatedError = t(`errors.${errorMessage}`);
            setError(translatedError !== `errors.${errorMessage}` ? translatedError : errorMessage);
          } else {
            setError(errorMessage);
          }
        } else {
          setError(t("auth.login.error") || "Login failed. Please check your credentials.");
        }
      } else {
        // Network error or other issues
        setError(
          t("auth.login.error") ||
            "Unable to connect to server. Please check if the backend is running.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    <form ref={formRef} onSubmit={handleSubmit} className="form">
      <label className="form-label">
        <span className="form-label-text">{t("auth.login.emailLabel")}</span>
        <input
          name="email"
          type="email"
          placeholder={t("auth.placeholders.email")}
          className="form-input"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          disabled={isSubmitting}
        />
      </label>
      <label className="form-label">
        <span className="form-label-text">{t("auth.login.passwordLabel")}</span>
        <div className="form-input-wrapper">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder={t("auth.placeholders.password")}
            className="form-input form-input--password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="form-password-toggle"
            aria-label={showPassword ? hidePasswordLabel : showPasswordLabel}
            disabled={isSubmitting}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </label>
      {error ? (
        <div role="alert" className="form-error">
          {error}
        </div>
      ) : null}
      <Button type="submit" fullWidth isLoading={isSubmitting} disabled={isSubmitting}>
        {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
      </Button>
      <div className="form-links">
        <NavLink to="/register" className="form-link">
          {t("auth.login.registerPrompt")}
        </NavLink>
        <NavLink to="/forgot-password" className="form-link">
          {t("auth.login.forgot")}
        </NavLink>
      </div>
    </form>
  );
};

export default LoginFormContent;
