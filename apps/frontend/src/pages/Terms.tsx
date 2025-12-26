import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import i18n, { translationsLoadingPromise } from "../i18n/config";
import PageIntro from "../components/PageIntro";
import { Card, CardContent, Button } from "../components/ui";
import { useAuthStore } from "../store/auth.store";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  revokeTerms,
  acceptTerms,
  getLegalDocumentsStatus,
  type LegalDocumentsStatus,
} from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const contentStyle: React.CSSProperties = {
  maxWidth: "900px",
  margin: "0 auto",
  padding: "var(--space-xl)",
  lineHeight: 1.8,
  color: "var(--color-text-primary)",
  fontSize: "var(--font-size-md)",
};

const Terms: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { isInitializing } = useAuth();
  const [translationsReady, setTranslationsReady] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [legalStatus, setLegalStatus] = useState<LegalDocumentsStatus | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if acceptance is needed - default to true if status not loaded yet (show accept button)
  const needsAcceptance = legalStatus ? (legalStatus.terms.needsAcceptance ?? false) : true;

  // Fetch legal document status
  useEffect(() => {
    const fetchStatus = async () => {
      if (!isAuthenticated || isInitializing) {
        return;
      }
      try {
        const status = await getLegalDocumentsStatus();
        setLegalStatus(status);
      } catch (err) {
        console.error("Failed to fetch legal document status:", err);
        // If 401, user needs to login - but don't redirect here, let them see the page
      }
    };

    void fetchStatus();
  }, [isAuthenticated, isInitializing]);

  const handleAcceptTerms = async () => {
    setError(null);

    if (!acceptedTerms) {
      setError(t("auth.legalDocumentsReacceptance.termsRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isAuthenticated) {
        const returnUrl = "/terms";
        void navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
        return;
      }

      await acceptTerms({ terms_accepted: true });

      // Redirect to home page after successful acceptance
      void navigate("/", { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { error?: { code?: string; message?: string } } };
        };
        const status = axiosError.response?.status;
        const errorCode = axiosError.response?.data?.error?.code;

        if (status === 401 || errorCode === "UNAUTHENTICATED") {
          setError(
            t("auth.legalDocumentsReacceptance.notAuthenticated", {
              defaultValue: "You must be logged in to accept terms. Redirecting to login...",
            }),
          );
          const returnUrl = "/terms";
          setTimeout(() => {
            void navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
          }, 2000);
          return;
        }

        setError(errorCode ? t(`errors.${errorCode}`) : t("auth.legalDocumentsReacceptance.error"));
      } else {
        setError(t("auth.legalDocumentsReacceptance.error"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeConsent = async () => {
    setIsRevoking(true);
    try {
      await revokeTerms();
      // Refetch status - user stays logged in and will see acceptance UI
      try {
        const status = await getLegalDocumentsStatus();
        setLegalStatus(status);
      } catch (err) {
        console.error("Failed to fetch legal document status after revoke:", err);
      }
      setShowRevokeConfirm(false);
    } catch (error) {
      console.error("Failed to revoke consent:", error);
      setIsRevoking(false);
      setShowRevokeConfirm(false);
      // TODO: Show error toast
    } finally {
      setIsRevoking(false);
    }
  };

  // Helper function to safely get array translations
  const getArrayTranslation = (key: string): string[] => {
    const result = t(key, { returnObjects: true });
    // If result is an array of strings, return it; otherwise return empty array
    if (Array.isArray(result)) {
      return (result as unknown[]).filter((item): item is string => typeof item === "string");
    }
    return [];
  };

  // Wait for translations to load
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        // Wait for the translation loading promise to complete
        await translationsLoadingPromise;

        // Verify translations are actually loaded
        const testTranslation = i18n.t("terms.title");
        if (testTranslation && testTranslation !== "terms.title") {
          setTranslationsReady(true);
        } else {
          // If still not ready, poll for a bit
          let attempts = 0;
          const checkInterval = setInterval(() => {
            attempts++;
            const translation = i18n.t("terms.title");
            if (translation && translation !== "terms.title") {
              clearInterval(checkInterval);
              setTranslationsReady(true);
            } else if (attempts >= 20) {
              // After 2 seconds, render anyway
              clearInterval(checkInterval);
              setTranslationsReady(true);
            }
          }, 100);
        }
      } catch (error) {
        console.error("Failed to load translations:", error);
        // Render anyway on error
        setTranslationsReady(true);
      }
    };

    void loadTranslations();
  }, []);

  if (!translationsReady) {
    return (
      <div
        className="flex h-screen w-full items-center justify-center text-primary-500"
        role="status"
        aria-live="polite"
      >
        {t("common.loading", { defaultValue: "Loading..." })}
      </div>
    );
  }

  return (
    <PageIntro
      eyebrow={t("terms.eyebrow")}
      title={t("terms.title")}
      description={t("terms.description")}
    >
      <Card
        style={{
          maxWidth: "900px",
          width: "100%",
          margin: "0 auto",
          maxHeight: needsAcceptance ? "60vh" : "80vh",
          overflowY: "auto",
        }}
      >
        <CardContent style={contentStyle}>
          <div style={{ marginBottom: "var(--space-lg)" }}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Home size={16} />}
              onClick={() => {
                void navigate(isAuthenticated ? "/" : "/login");
              }}
            >
              {isAuthenticated
                ? t("navigation.home", { defaultValue: "Home" })
                : t("auth.login.title", { defaultValue: "Login" })}
            </Button>
          </div>
          <div
            style={{
              marginBottom: "var(--space-md)",
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            <strong>{t("terms.effectiveDate")}:</strong> {t("terms.effectiveDateValue")}
          </div>

          <p className="section-text">{t("terms.intro")}</p>

          <section className="section">
            <h2 className="section-title">{t("terms.section1.title")}</h2>
            <ul className="list">
              {getArrayTranslation("terms.section1.items").map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section2.title")}</h2>
            <ul className="list">
              {getArrayTranslation("terms.section2.items").map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section3.title")}</h2>
            <p className="section-text">{t("terms.section3.subtitle")}</p>
            <ul className="list">
              {getArrayTranslation("terms.section3.items").map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section4.title")}</h2>
            <ul className="list">
              {getArrayTranslation("terms.section4.items").map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section5.title")}</h2>
            <p className="section-text">{t("terms.section5.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section6.title")}</h2>
            <p className="section-text">{t("terms.section6.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section7.title")}</h2>
            <ul className="list">
              {getArrayTranslation("terms.section7.items").map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section8.title")}</h2>
            <ul className="list">
              {getArrayTranslation("terms.section8.items").map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section9.title")}</h2>
            <p className="section-text">{t("terms.section9.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section10.title")}</h2>
            <p className="section-text">{t("terms.section10.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section11.title")}</h2>
            <p className="section-text">{t("terms.section11.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section12.title")}</h2>
            <p className="section-text">{t("terms.section12.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section13.title")}</h2>
            <p className="section-text">{t("terms.section13.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section14.title")}</h2>
            <ul className="list">
              {getArrayTranslation("terms.section14.items").map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section15.title")}</h2>
            <ul className="list">
              {getArrayTranslation("terms.section15.items").map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("terms.section16.title")}</h2>
            <p className="section-text">{t("terms.section16.content")}</p>
          </section>

          <div
            style={{
              marginTop: "var(--space-xl)",
              paddingTop: "var(--space-xl)",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            {!isAuthenticated ? (
              <div className="flex flex--center">
                <Button
                  variant="primary"
                  onClick={() => {
                    const returnUrl = "/terms";
                    void navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, {
                      replace: true,
                    });
                  }}
                  className="w-full"
                >
                  {t("auth.login.title", { defaultValue: "Login to Accept Terms" })}
                </Button>
              </div>
            ) : needsAcceptance ? (
              <>
                <label
                  className="checkbox-wrapper"
                  style={{
                    padding: "var(--space-sm)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-surface-glass)",
                    border:
                      error && !acceptedTerms
                        ? "1px solid var(--color-danger-border)"
                        : "1px solid var(--color-border)",
                    transition: "border-color 150ms ease",
                    marginBottom: "var(--space-md)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    required={needsAcceptance}
                    disabled={isSubmitting}
                    style={{
                      marginTop: "0.2rem",
                      cursor: "pointer",
                      width: "18px",
                      height: "18px",
                      accentColor: "var(--color-accent)",
                    }}
                    aria-required={needsAcceptance ? "true" : "false"}
                    aria-invalid={error && !acceptedTerms ? "true" : "false"}
                  />
                  <span className="checkbox-label">
                    {t("auth.legalDocumentsReacceptance.acceptTerms")}
                  </span>
                </label>

                {error && (
                  <div role="alert" className="form-error mb-1">
                    {error}
                  </div>
                )}

                <div className="flex flex--center">
                  <Button
                    variant="primary"
                    onClick={() => void handleAcceptTerms()}
                    disabled={isSubmitting || !acceptedTerms}
                    isLoading={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting
                      ? t("auth.legalDocumentsReacceptance.submitting")
                      : t("auth.legalDocumentsReacceptance.submit")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex--center">
                <Button
                  variant="secondary"
                  onClick={() => setShowRevokeConfirm(true)}
                  disabled={isRevoking}
                  className="w-full"
                >
                  {t("terms.revokeConsent")}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={showRevokeConfirm}
        title={t("terms.revokeConfirm.title")}
        message={t("terms.revokeConfirm.message")}
        confirmLabel={t("terms.revokeConfirm.confirm")}
        cancelLabel={t("terms.revokeConfirm.cancel")}
        variant="warning"
        onConfirm={() => void handleRevokeConsent()}
        onCancel={() => setShowRevokeConfirm(false)}
      />
    </PageIntro>
  );
};

export default Terms;
