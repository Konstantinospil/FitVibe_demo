import React, { useState } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { login } from "../services/api";

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "12px",
  border: "1px solid var(--color-border, rgba(46, 91, 73, 0.2))",
  background: "var(--color-surface-glass, rgba(22, 44, 34, 0.45))",
  color: "var(--color-text-primary, #FFFFFF)",
  padding: "0.85rem 1rem",
  fontSize: "1rem",
  fontFamily: "var(--font-family-base, 'Inter', sans-serif)",
  transition: "border-color 150ms ease, background-color 150ms ease",
};

const LoginFormContent: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      console.error("Login error:", err);

      // Handle terms version outdated error
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: {
            data?: {
              error?: {
                code?: string;
                message?: string;
              };
            };
          };
        };
        const errorCode = axiosError.response?.data?.error?.code;
        const errorMessage = axiosError.response?.data?.error?.message;

        if (errorCode === "TERMS_VERSION_OUTDATED") {
          navigate("/terms-reacceptance", { replace: true });
          return;
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
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
      <label style={{ display: "grid", gap: "0.35rem" }}>
        <span style={{ fontSize: "0.95rem", color: "var(--color-text-secondary)" }}>
          {t("auth.login.emailLabel")}
        </span>
        <input
          name="email"
          type="email"
          placeholder={t("auth.placeholders.email")}
          style={inputStyle}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          disabled={isSubmitting}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-accent, #34d399)";
            e.currentTarget.style.boxShadow = "0 0 0 2px rgba(52, 211, 153, 0.2)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border, rgba(46, 91, 73, 0.2))";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </label>
      <label style={{ display: "grid", gap: "0.35rem" }}>
        <span style={{ fontSize: "0.95rem", color: "var(--color-text-secondary)" }}>
          {t("auth.login.passwordLabel")}
        </span>
        <div style={{ position: "relative" }}>
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder={t("auth.placeholders.password")}
            style={{ ...inputStyle, paddingRight: "3rem" }}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={isSubmitting}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-accent, #34d399)";
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(52, 211, 153, 0.2)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border, rgba(46, 91, 73, 0.2))";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.25rem",
              transition: "color 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
            aria-label={showPassword ? hidePasswordLabel : showPasswordLabel}
            disabled={isSubmitting}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
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
          }}
        >
          {error}
        </div>
      ) : null}
      <Button type="submit" fullWidth isLoading={isSubmitting} disabled={isSubmitting}>
        {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
      </Button>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.9rem",
          color: "var(--color-text-secondary)",
        }}
      >
        <NavLink to="/register" style={{ color: "var(--color-text-secondary)" }}>
          {t("auth.login.registerPrompt")}
        </NavLink>
        <NavLink to="/forgot-password" style={{ color: "var(--color-text-secondary)" }}>
          {t("auth.login.forgot")}
        </NavLink>
      </div>
    </form>
  );
};

export default LoginFormContent;
