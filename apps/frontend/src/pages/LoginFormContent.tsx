import React, { useState, useRef } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui";
import { LockoutTimer } from "../components/LockoutTimer";
import { AttemptCounter } from "../components/AttemptCounter";
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
  const requestedPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
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
  const [lockoutData, setLockoutData] = useState<{
    remainingSeconds: number;
    lockoutType: "account" | "ip";
  } | null>(null);
  const [attemptWarning, setAttemptWarning] = useState<{
    remainingAccountAttempts: number;
    remainingIPAttempts: number;
    remainingIPDistinctEmails: number;
    accountAttemptCount: number;
    ipTotalAttemptCount: number;
    ipDistinctEmailCount: number;
  } | null>(null);

  const showPasswordLabel = t("auth.login.showPassword", {
    defaultValue: t("auth.showPassword", { defaultValue: "Show password" }),
  });
  const hidePasswordLabel = t("auth.login.hidePassword", {
    defaultValue: t("auth.hidePassword", { defaultValue: "Hide password" }),
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validate inputs
    if (!email.trim() || !password) {
      setError(t("auth.login.fillAllFields") || "Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setLockoutData(null);
    setAttemptWarning(null);

    try {
      const response = await login({ email: email.trim(), password });

      if (response.requires2FA) {
        // Navigate to 2FA verification page
        navigate("/login/verify-2fa", {
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
        navigate(from, { replace: true });
      } else {
        setError(t("auth.login.error") || "Login failed. Please try again.");
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
            };
          };
        };
        const errorCode = axiosError.response?.data?.error?.code;
        const errorMessage = axiosError.response?.data?.error?.message;
        const errorDetails = axiosError.response?.data?.error?.details;

        if (errorCode === "TERMS_VERSION_OUTDATED") {
          navigate("/terms-reacceptance", { replace: true });
          return;
        }

        // Handle lockout errors with timer
        if (
          (errorCode === "AUTH_ACCOUNT_LOCKED" || errorCode === "AUTH_IP_LOCKED") &&
          errorDetails?.remainingSeconds !== undefined &&
          errorDetails?.lockoutType
        ) {
          setLockoutData({
            remainingSeconds: errorDetails.remainingSeconds,
            lockoutType: errorDetails.lockoutType,
          });
          setError(errorMessage || t("auth.lockout.locked", { defaultValue: "Account locked" }));
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
          setAttemptWarning({
            remainingAccountAttempts: errorDetails.remainingAccountAttempts,
            remainingIPAttempts: errorDetails.remainingIPAttempts,
            remainingIPDistinctEmails: errorDetails.remainingIPDistinctEmails,
            accountAttemptCount: errorDetails.accountAttemptCount ?? 0,
            ipTotalAttemptCount: errorDetails.ipTotalAttemptCount ?? 0,
            ipDistinctEmailCount: errorDetails.ipDistinctEmailCount ?? 0,
          });
        }

        // Show specific error message if available
        if (errorMessage) {
          setError(errorMessage);
        } else if (errorCode) {
          const translatedError = t(`errors.${errorCode}`);
          setError(
            translatedError !== `errors.${errorCode}` ? translatedError : t("auth.login.error"),
          );
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
