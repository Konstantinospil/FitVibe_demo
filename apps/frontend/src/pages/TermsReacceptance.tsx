import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, NavLink } from "react-router-dom";
import { acceptTerms } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

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
      if (typeof window !== "undefined" && window.location?.reload) {
        window.location.reload();
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const errorCode = (err as { response?: { data?: { error?: { code?: string } } } })?.response
          ?.data?.error?.code;
        setError(errorCode ? t(`errors.${errorCode}`) : t("auth.termsReacceptance.error"));
      } else {
        setError(t("auth.termsReacceptance.error"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut?.();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <section className="terms-reacceptance">
      <p className="terms-reacceptance__eyebrow">{t("auth.termsReacceptance.eyebrow")}</p>
      <h1>{t("auth.termsReacceptance.title")}</h1>
      <p>{t("auth.termsReacceptance.description")}</p>
      <p>{t("auth.termsReacceptance.notice")}</p>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <label>
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            disabled={isSubmitting}
          />
          <span>
            {t("auth.termsReacceptance.acceptTerms")}{" "}
            <NavLink to="/terms">{t("auth.termsReacceptance.termsLink")}</NavLink>{" "}
            {t("auth.termsReacceptance.and")}{" "}
            <NavLink to="/privacy">{t("auth.termsReacceptance.privacyLink")}</NavLink>
          </span>
        </label>

        {error ? <div role="alert">{error}</div> : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? t("auth.termsReacceptance.submitting")
            : t("auth.termsReacceptance.submit")}
        </button>
      </form>

      <button type="button" onClick={() => void handleSignOut()}>
        {t("auth.termsReacceptance.signOut")}
      </button>
    </section>
  );
};

export default TermsReacceptance;
