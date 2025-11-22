import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthPageLayout from "../components/AuthPageLayout";
import { Button } from "../components/ui";
import { acceptTerms } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { NavLink } from "react-router-dom";

const TermsReacceptance: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!acceptedTerms) {
      setError(t("auth.termsReacceptance.termsRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      await acceptTerms({ terms_accepted: true });
      // Refresh the page to get new tokens
      window.location.reload();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { data?: { error?: { code?: string; message?: string } } };
        };
        const errorCode = axiosError.response?.data?.error?.code;
        setError(errorCode ? t(`errors.${errorCode}`) : t("auth.termsReacceptance.error"));
      } else {
        setError(t("auth.termsReacceptance.error"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = (): void => {
    signOut();
    navigate("/login", { replace: true });
  };

  return (
    <AuthPageLayout
      eyebrow={t("auth.termsReacceptance.eyebrow")}
      title={t("auth.termsReacceptance.title")}
      description={t("auth.termsReacceptance.description")}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
        <div
          style={{
            padding: "1rem",
            borderRadius: "12px",
            background: "rgba(251, 191, 36, 0.1)",
            border: "1px solid rgba(251, 191, 36, 0.3)",
            marginBottom: "1rem",
          }}
        >
          <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.95rem" }}>
            {t("auth.termsReacceptance.notice")}
          </p>
        </div>

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
                : "1px solid var(--color-border)",
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
            {t("auth.termsReacceptance.acceptTerms")}{" "}
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
              {t("auth.termsReacceptance.termsLink")}
            </NavLink>{" "}
            {t("auth.termsReacceptance.and")}{" "}
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
              {t("auth.termsReacceptance.privacyLink")}
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

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Button
            type="submit"
            fullWidth
            isLoading={isSubmitting}
            disabled={isSubmitting || !acceptedTerms}
          >
            {isSubmitting
              ? t("auth.termsReacceptance.submitting")
              : t("auth.termsReacceptance.submit")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={handleSignOut}
            disabled={isSubmitting}
          >
            {t("auth.termsReacceptance.signOut")}
          </Button>
        </div>
      </form>
    </AuthPageLayout>
  );
};

export default TermsReacceptance;
