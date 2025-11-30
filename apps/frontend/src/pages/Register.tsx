import React, { useState, useRef } from "react";
import AuthPageLayout from "../components/AuthPageLayout";
import { NavLink } from "react-router-dom";
import { register as registerAccount } from "../services/api";
import { Button } from "../components/ui";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { useRequiredFieldValidation } from "../hooks/useRequiredFieldValidation";

const Register: React.FC = () => {
  const { t } = useTranslation();
  const formRef = useRef<HTMLFormElement>(null);
  useRequiredFieldValidation(formRef, t);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    // Validate required fields
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError(t("auth.register.fillAllFields"));
      return;
    }

    // Check if terms and privacy are accepted
    if (!termsAccepted || !privacyAccepted) {
      setError(t("auth.register.termsRequired"));
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError(t("auth.register.passwordMismatch"));
      return;
    }

    // Validate password strength
    const passwordErrors: string[] = [];
    if (password.length < 12) {
      passwordErrors.push(t("validation.passwordMinLength"));
    }
    if (!/[a-z]/.test(password)) {
      passwordErrors.push(t("validation.passwordLowercase"));
    }
    if (!/[A-Z]/.test(password)) {
      passwordErrors.push(t("validation.passwordUppercase"));
    }
    if (!/\d/.test(password)) {
      passwordErrors.push(t("validation.passwordDigit"));
    }
    if (!/[^\w\s]/.test(password)) {
      passwordErrors.push(t("validation.passwordSymbol"));
    }

    if (passwordErrors.length > 0) {
      setError(t("errors.WEAK_PASSWORD") + ": " + passwordErrors.join(", "));
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate username from email (use part before @, sanitized)
      const username = email.split("@")[0].replace(/[^a-zA-Z0-9_.-]/g, "_");

      await registerAccount({
        email,
        password,
        username,
        terms_accepted: termsAccepted && privacyAccepted,
        profile: {
          display_name: name,
        },
      });

      // Registration successful - show success message
      setSuccess(true);
    } catch (err: unknown) {
      // Show more specific error if available
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { data?: { error?: { code?: string; message?: string } } };
        };
        const errorCode = axiosError.response?.data?.error?.code;
        setError(errorCode ? t(`errors.${errorCode}`) : t("auth.register.error"));
      } else {
        setError(t("auth.register.error"));
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
        <div className="text-center p-2rem">
          <div
            className="flex flex--center mb-1"
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 1rem",
              borderRadius: "50%",
              backgroundColor: "rgba(34, 197, 94, 0.1)",
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
          <p className="mb-1 text-secondary">{t("auth.register.checkEmail", { email })}</p>
          <NavLink
            to="/login"
            className="rounded-xl"
            style={{
              padding: "0.9rem 1.4rem",
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
      <form ref={formRef} onSubmit={handleSubmit} className="form">
        <label className="form-label">
          <span className="form-label-text">{t("auth.register.nameLabel")}</span>
          <input
            name="name"
            type="text"
            placeholder={t("auth.placeholders.name")}
            className="form-input"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            disabled={isSubmitting}
          />
        </label>
        <label className="form-label">
          <span className="form-label-text">{t("auth.register.emailLabel")}</span>
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
          <span className="form-label-text">{t("auth.register.passwordLabel")}</span>
          <div className="form-input-wrapper">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.placeholders.password")}
              className="form-input form-input--password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="form-password-toggle"
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              disabled={isSubmitting}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </label>
        <label className="form-label">
          <span className="form-label-text">{t("auth.register.confirmPasswordLabel")}</span>
          <div className="form-input-wrapper">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("auth.placeholders.confirmPassword")}
              className="form-input form-input--password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="form-password-toggle"
              aria-label={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              disabled={isSubmitting}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </label>
        <div className="password-requirements">
          <label className="checkbox-wrapper">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              disabled={isSubmitting}
              style={{
                marginTop: "0.2rem",
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            />
            <span className="checkbox-label">
              {t("auth.register.acceptTerms")}{" "}
              <NavLink
                to="/terms"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {t("auth.register.termsLink")}
              </NavLink>
            </span>
          </label>
          <label className="checkbox-wrapper">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              disabled={isSubmitting}
              style={{
                marginTop: "0.2rem",
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            />
            <span className="checkbox-label">
              {t("auth.register.acceptTerms")}{" "}
              <NavLink
                to="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {t("auth.register.privacyLink")}
              </NavLink>
            </span>
          </label>
        </div>
        {error ? (
          <div role="alert" className="form-error">
            {error}
          </div>
        ) : null}
        <Button type="submit" fullWidth isLoading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? t("auth.register.submitting") : t("auth.register.submit")}
        </Button>
        <p className="m-0 text-09 text-secondary text-center">
          {t("auth.register.loginPrompt")}{" "}
          <NavLink to="/login" className="text-secondary">
            {t("auth.register.loginLink")}
          </NavLink>
        </p>
      </form>
    </AuthPageLayout>
  );
};

export default Register;
