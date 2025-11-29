import React, { useState } from "react";
import AuthPageLayout from "../components/AuthPageLayout";
import { NavLink } from "react-router-dom";
import { register as registerAccount } from "../services/api";
import { Button } from "../components/ui";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "12px",
  border: "1px solid var(--color-input-border)",
  background: "var(--color-input-bg)",
  color: "var(--color-text-primary)",
  padding: "0.85rem 1rem",
  fontSize: "1rem",
  fontFamily: "var(--font-family-base, 'Inter', sans-serif)",
  transition: "border-color 150ms ease, background-color 150ms ease",
};

const Register: React.FC = () => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    // Validate inputs
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError(t("auth.register.fillAllFields") || "Please fill in all fields");
      return;
    }

    // Check if terms are accepted
    if (!acceptedTerms) {
      setError(
        t("auth.register.termsRequired") ||
          "You must accept the terms and conditions to create an account",
      );
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError(t("auth.register.passwordsDoNotMatch") || "Passwords do not match");
      return;
    }

    // Validate password strength (matches backend requirements)
    if (password.length < 12) {
      setError(
        t("auth.register.passwordMinLength") || "Password must be at least 12 characters long",
      );
      return;
    }
    if (!/(?=.*[a-z])/.test(password)) {
      setError(
        t("auth.register.passwordLowercase") ||
          "Password must contain at least one lowercase letter",
      );
      return;
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      setError(
        t("auth.register.passwordUppercase") ||
          "Password must contain at least one uppercase letter",
      );
      return;
    }
    if (!/(?=.*\d)/.test(password)) {
      setError(t("auth.register.passwordDigit") || "Password must contain at least one digit");
      return;
    }
    if (!/(?=.*[^\w\s])/.test(password)) {
      setError(t("auth.register.passwordSymbol") || "Password must contain at least one symbol");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate username from email (use part before @, sanitized)
      const username = email.split("@")[0].replace(/[^a-zA-Z0-9_.-]/g, "_");

      await registerAccount({
        email: email.trim(),
        password,
        username,
        terms_accepted: acceptedTerms,
        profile: {
          display_name: name.trim(),
        },
      });

      // Registration successful - show success message
      setSuccess(true);
    } catch (err: unknown) {
      console.error("Registration error:", err);

      // Show more specific error if available
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { data?: { error?: { code?: string; message?: string } } };
        };
        const errorCode = axiosError.response?.data?.error?.code;
        const errorMessage = axiosError.response?.data?.error?.message;

        if (errorMessage) {
          setError(errorMessage);
        } else if (errorCode) {
          const translatedError = t(`errors.${errorCode}`);
          setError(
            translatedError !== `errors.${errorCode}` ? translatedError : t("auth.register.error"),
          );
        } else {
          setError(t("auth.register.error") || "Registration failed. Please try again.");
        }
      } else {
        // Network error or other issues
        setError(
          t("auth.register.error") ||
            "Unable to connect to server. Please check if the backend is running.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <AuthPageLayout
        eyebrow={t("auth.register.eyebrow")}
        title={t("auth.register.successTitle")}
        description={t("auth.register.successDescription")}
      >
        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 1rem",
              borderRadius: "50%",
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22c55e"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p style={{ marginBottom: "1rem", color: "var(--color-text-secondary)" }}>
            {t("auth.register.checkEmail", { email })}
          </p>
          <NavLink
            to="/login"
            style={{
              padding: "0.9rem 1.4rem",
              borderRadius: "999px",
              background: "var(--color-accent)",
              color: "#0f172a",
              fontWeight: 600,
              letterSpacing: "0.02em",
              display: "inline-block",
            }}
          >
            {t("auth.register.goToLogin")}
          </NavLink>
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      eyebrow={t("auth.register.eyebrow")}
      title={t("auth.register.title")}
      description={t("auth.register.description")}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.95rem", color: "var(--color-text-secondary)" }}>
            {t("auth.register.nameLabel")}
          </span>
          <input
            name="name"
            type="text"
            placeholder={t("auth.placeholders.name")}
            style={inputStyle}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            disabled={isSubmitting}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-accent, #34d399)";
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(52, 211, 153, 0.2)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--color-input-border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.95rem", color: "var(--color-text-secondary)" }}>
            {t("auth.register.emailLabel")}
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
              e.currentTarget.style.borderColor = "var(--color-input-border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.95rem", color: "var(--color-text-secondary)" }}>
            {t("auth.register.passwordLabel")}
          </span>
          <div style={{ position: "relative" }}>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.placeholders.password")}
              style={inputStyle}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              disabled={isSubmitting}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent, #34d399)";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(52, 211, 153, 0.2)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-input-border)";
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
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              disabled={isSubmitting}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.95rem", color: "var(--color-text-secondary)" }}>
            {t("auth.register.confirmPasswordLabel")}
          </span>
          <div style={{ position: "relative" }}>
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("auth.placeholders.confirmPassword")}
              style={inputStyle}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              disabled={isSubmitting}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent, #34d399)";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(52, 211, 153, 0.2)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-input-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
              aria-label={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              disabled={isSubmitting}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            cursor: "pointer",
            padding: "0.75rem",
            borderRadius: "8px",
            background: "var(--color-surface-glass)",
            border:
              error && !acceptedTerms
                ? "1px solid rgba(248, 113, 113, 0.5)"
                : "1px solid var(--color-input-border)",
            transition: "border-color 150ms ease",
          }}
        >
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            required
            disabled={isSubmitting}
            style={{
              marginTop: "0.2rem",
              cursor: "pointer",
              width: "18px",
              height: "18px",
              accentColor: "var(--color-accent)",
            }}
            aria-required="true"
            aria-invalid={error && !acceptedTerms ? "true" : "false"}
          />
          <span
            style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}
          >
            {t("auth.register.acceptTerms")}{" "}
            <NavLink
              to="/terms"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--color-accent)",
                textDecoration: "underline",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {t("auth.register.termsLink")}
            </NavLink>{" "}
            {t("auth.register.and")}{" "}
            <NavLink
              to="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--color-accent)",
                textDecoration: "underline",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {t("auth.register.privacyLink")}
            </NavLink>
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
            }}
          >
            {error}
          </div>
        ) : null}
        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          disabled={isSubmitting || !acceptedTerms}
        >
          {isSubmitting ? t("auth.register.submitting") : t("auth.register.submit")}
        </Button>
        <p
          style={{
            margin: 0,
            fontSize: "0.9rem",
            color: "var(--color-text-secondary)",
            textAlign: "center",
          }}
        >
          {t("auth.register.loginPrompt")}{" "}
          <NavLink
            to="/login"
            style={{
              color: "var(--color-link-form)",
              textDecoration: "underline",
              transition: "color 150ms ease",
              padding: "0.75rem 0.5rem",
              minHeight: "24px",
              minWidth: "24px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-link-form-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-link-form)";
            }}
          >
            {t("auth.register.loginLink")}
          </NavLink>
        </p>
      </form>
    </AuthPageLayout>
  );
};

export default Register;
