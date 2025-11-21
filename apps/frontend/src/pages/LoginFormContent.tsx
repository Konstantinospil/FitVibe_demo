import React, { useState } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "12px",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface-glass)",
  color: "var(--color-text-primary)",
  padding: "0.85rem 1rem",
  fontSize: "1rem",
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
    setIsSubmitting(true);
    setError(null);

    try {
      const { login } = await import("../services/api");
      const response = await login({ email, password });

      if (response.requires2FA) {
        navigate("/login/verify-2fa", {
          state: {
            pendingSessionId: response.pendingSessionId,
            from,
          },
        });
        return;
      }

      signIn(response.user);
      navigate(from, { replace: true });
    } catch {
      setError(t("auth.login.error"));
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
