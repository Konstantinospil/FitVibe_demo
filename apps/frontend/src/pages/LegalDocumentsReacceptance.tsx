import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthPageLayout from "../components/AuthPageLayout";
import { Button, CardContent } from "../components/ui";
import { acceptTerms, acceptPrivacyPolicy } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useRequiredFieldValidation } from "../hooks/useRequiredFieldValidation";
import { useAuthStore } from "../store/auth.store";

type DocumentType = "terms" | "privacy";

const LegalDocumentsReacceptance: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const termsScrollRef = useRef<HTMLDivElement>(null);
  const privacyScrollRef = useRef<HTMLDivElement>(null);
  useRequiredFieldValidation(formRef, t);
  const navigate = useNavigate();
  const { signOut, isAuthenticated, isInitializing } = useAuth();

  // Determine which documents need acceptance from URL params
  // If no params provided, default to both (backward compatibility)
  const hasParams = searchParams.has("terms") || searchParams.has("privacy");
  const needsTerms = searchParams.get("terms") === "true" || (!hasParams && true);
  const needsPrivacy = searchParams.get("privacy") === "true" || (!hasParams && true);

  const [activeTab, setActiveTab] = useState<DocumentType>(needsTerms ? "terms" : "privacy");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const [hasScrolledPrivacy, setHasScrolledPrivacy] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      const timeoutId = setTimeout(() => {
        const authState = useAuthStore.getState();
        if (!authState.isAuthenticated) {
          const returnUrl = "/terms-reacceptance";
          void navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, isInitializing, navigate]);

  // Helper function to safely get array translations
  const getArrayTranslation = (key: string): string[] => {
    const result = t(key, { returnObjects: true });
    if (Array.isArray(result)) {
      return (result as unknown[]).filter((item): item is string => typeof item === "string");
    }
    return [];
  };

  // Helper function to check if a translation key exists
  const hasTranslation = (key: string): boolean => {
    const result = t(key, { returnObjects: true });
    return typeof result === "string" && result !== key;
  };

  // Check scroll position for terms
  const checkTermsScroll = () => {
    const container = termsScrollRef.current;
    if (!container) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtEnd = scrollTop + clientHeight >= scrollHeight - 50;
    setHasScrolledTerms(isAtEnd);
  };

  // Check scroll position for privacy
  const checkPrivacyScroll = () => {
    const container = privacyScrollRef.current;
    if (!container) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtEnd = scrollTop + clientHeight >= scrollHeight - 50;
    setHasScrolledPrivacy(isAtEnd);
  };

  useEffect(() => {
    const termsContainer = termsScrollRef.current;
    const privacyContainer = privacyScrollRef.current;

    if (termsContainer) {
      checkTermsScroll();
      termsContainer.addEventListener("scroll", checkTermsScroll);
      window.addEventListener("resize", checkTermsScroll);
    }

    if (privacyContainer) {
      checkPrivacyScroll();
      privacyContainer.addEventListener("scroll", checkPrivacyScroll);
      window.addEventListener("resize", checkPrivacyScroll);
    }

    return () => {
      if (termsContainer) {
        termsContainer.removeEventListener("scroll", checkTermsScroll);
        window.removeEventListener("resize", checkTermsScroll);
      }
      if (privacyContainer) {
        privacyContainer.removeEventListener("scroll", checkPrivacyScroll);
        window.removeEventListener("resize", checkPrivacyScroll);
      }
    };
  }, [activeTab]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    // Validate based on which documents need acceptance
    if (needsTerms && !acceptedTerms) {
      setError(t("auth.legalDocumentsReacceptance.termsRequired"));
      return;
    }

    if (needsPrivacy && !acceptedPrivacy) {
      setError(t("auth.legalDocumentsReacceptance.privacyRequired"));
      return;
    }

    // Check scroll requirements
    if (needsTerms && activeTab === "terms" && !hasScrolledTerms) {
      setError(t("auth.legalDocumentsReacceptance.scrollRequired"));
      return;
    }

    if (needsPrivacy && activeTab === "privacy" && !hasScrolledPrivacy) {
      setError(t("auth.legalDocumentsReacceptance.scrollRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isAuthenticated) {
        setError(t("auth.legalDocumentsReacceptance.notAuthenticated"));
        const returnUrl = "/terms-reacceptance";
        setTimeout(() => {
          void navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
        }, 2000);
        return;
      }

      // Accept documents that need acceptance
      const acceptPromises: Promise<unknown>[] = [];
      if (needsTerms && acceptedTerms) {
        acceptPromises.push(acceptTerms({ terms_accepted: true }));
      }
      if (needsPrivacy && acceptedPrivacy) {
        acceptPromises.push(acceptPrivacyPolicy({ privacy_policy_accepted: true }));
      }

      await Promise.all(acceptPromises);

      // Refresh the page to get new tokens
      window.location.reload();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { data?: { error?: { code?: string; message?: string } } };
        };
        const errorCode = axiosError.response?.data?.error?.code;

        if (errorCode === "UNAUTHENTICATED") {
          setError(t("auth.legalDocumentsReacceptance.notAuthenticated"));
          const returnUrl = "/terms-reacceptance";
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

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    void navigate("/login", { replace: true });
  };

  // Show loading state
  if (isInitializing) {
    return (
      <AuthPageLayout
        eyebrow={t("auth.legalDocumentsReacceptance.eyebrow")}
        title={t("auth.legalDocumentsReacceptance.title")}
        description={t("auth.legalDocumentsReacceptance.description")}
      >
        <div className="flex h-screen w-full items-center justify-center text-primary-500">
          {t("common.loading", { defaultValue: "Loading..." })}
        </div>
      </AuthPageLayout>
    );
  }

  // Don't render form if not authenticated
  if (!isAuthenticated) {
    return (
      <AuthPageLayout
        eyebrow={t("auth.legalDocumentsReacceptance.eyebrow")}
        title={t("auth.legalDocumentsReacceptance.title")}
        description={t("auth.legalDocumentsReacceptance.description")}
      >
        <div className="p-lg text-center text-secondary">
          <p>{t("auth.legalDocumentsReacceptance.redirecting")}</p>
        </div>
      </AuthPageLayout>
    );
  }

  const canSubmit =
    (!needsTerms || acceptedTerms) &&
    (!needsPrivacy || acceptedPrivacy) &&
    (!needsTerms || hasScrolledTerms) &&
    (!needsPrivacy || hasScrolledPrivacy);

  return (
    <AuthPageLayout
      eyebrow={t("auth.legalDocumentsReacceptance.eyebrow")}
      title={t("auth.legalDocumentsReacceptance.title")}
      description={t("auth.legalDocumentsReacceptance.description")}
    >
      <form
        ref={formRef}
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="form"
      >
        <div className="alert alert--warning p-md rounded-md mb-lg">
          <p className="m-0 text-secondary">{t("auth.legalDocumentsReacceptance.notice")}</p>
        </div>

        {/* Tabs for switching between documents */}
        {needsTerms && needsPrivacy && (
          <div className="flex flex--gap-sm mb-lg">
            <Button
              type="button"
              variant={activeTab === "terms" ? "primary" : "ghost"}
              onClick={() => setActiveTab("terms")}
              className="flex-1"
            >
              {t("auth.legalDocumentsReacceptance.termsTab")}
            </Button>
            <Button
              type="button"
              variant={activeTab === "privacy" ? "primary" : "ghost"}
              onClick={() => setActiveTab("privacy")}
              className="flex-1"
            >
              {t("auth.legalDocumentsReacceptance.privacyTab")}
            </Button>
          </div>
        )}

        {/* Terms Content */}
        {needsTerms && (activeTab === "terms" || !needsPrivacy) && (
          <div className="mb-lg">
            <div
              ref={termsScrollRef}
              className="card"
              style={{
                maxHeight: "60vh",
                overflowY: "auto",
              }}
            >
              <CardContent className="card-content--padded">
                <div className="mb-md text-muted text-sm">
                  <strong>{t("terms.effectiveDate")}:</strong> {t("terms.effectiveDateValue")}
                </div>

                <p className="section-text">{t("terms.intro")}</p>

                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num) => (
                  <section key={num} className="section">
                    <h2 className="section-title">{t(`terms.section${num}.title`)}</h2>
                    {t(`terms.section${num}.subtitle`) && (
                      <p className="section-text">{t(`terms.section${num}.subtitle`)}</p>
                    )}
                    {t(`terms.section${num}.content`) && (
                      <p className="section-text">{t(`terms.section${num}.content`)}</p>
                    )}
                    {getArrayTranslation(`terms.section${num}.items`).length > 0 && (
                      <ul className="list">
                        {getArrayTranslation(`terms.section${num}.items`).map(
                          (item: string, index: number) => (
                            <li key={index} className="list-item">
                              {item}
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </section>
                ))}
              </CardContent>
            </div>

            {!hasScrolledTerms && (
              <div className="alert alert--warning p-md rounded-md text-center text-secondary text-sm mt-md">
                {t("auth.legalDocumentsReacceptance.scrollPrompt")}
              </div>
            )}

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
                marginTop: "var(--space-md)",
              }}
            >
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required={needsTerms}
                disabled={isSubmitting || !hasScrolledTerms}
                style={{
                  marginTop: "0.2rem",
                  cursor: hasScrolledTerms ? "pointer" : "not-allowed",
                  width: "18px",
                  height: "18px",
                  accentColor: "var(--color-accent)",
                }}
                aria-required={needsTerms ? "true" : "false"}
                aria-invalid={error && !acceptedTerms ? "true" : "false"}
              />
              <span className="checkbox-label">
                {t("auth.legalDocumentsReacceptance.acceptTerms")}
              </span>
            </label>
          </div>
        )}

        {/* Privacy Content */}
        {needsPrivacy && (activeTab === "privacy" || !needsTerms) && (
          <div className="mb-lg">
            <div
              ref={privacyScrollRef}
              className="card"
              style={{
                maxHeight: "60vh",
                overflowY: "auto",
              }}
            >
              <CardContent className="card-content--padded">
                <div className="mb-md text-muted text-sm">
                  <strong>{t("privacy.effectiveDate")}:</strong> {t("privacy.effectiveDateValue")}
                </div>

                <p className="section-text">{t("privacy.intro1")}</p>
                <p className="section-text">{t("privacy.intro2")}</p>

                {/* Privacy sections */}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num) => {
                  const sectionKey = `privacy.section${num}`;
                  const hasTitle = hasTranslation(`${sectionKey}.title`);

                  if (!hasTitle) {
                    return null;
                  }

                  return (
                    <section key={num} className="section">
                      <h2 className="section-title">{t(`${sectionKey}.title`)}</h2>
                      {hasTranslation(`${sectionKey}.subtitle`) && (
                        <p className="section-text">{t(`${sectionKey}.subtitle`)}</p>
                      )}
                      {hasTranslation(`${sectionKey}.paragraph1`) && (
                        <p className="section-text">{t(`${sectionKey}.paragraph1`)}</p>
                      )}
                      {hasTranslation(`${sectionKey}.paragraph2`) && (
                        <p className="section-text">{t(`${sectionKey}.paragraph2`)}</p>
                      )}
                      {hasTranslation(`${sectionKey}.paragraph3`) && (
                        <p className="section-text">{t(`${sectionKey}.paragraph3`)}</p>
                      )}
                      {hasTranslation(`${sectionKey}.content`) && (
                        <p className="section-text">{t(`${sectionKey}.content`)}</p>
                      )}
                      {hasTranslation(`${sectionKey}.notSold`) && (
                        <p
                          className="section-text"
                          dangerouslySetInnerHTML={{ __html: t(`${sectionKey}.notSold`) }}
                        />
                      )}
                      {getArrayTranslation(`${sectionKey}.items`).length > 0 && (
                        <ul className="list">
                          {getArrayTranslation(`${sectionKey}.items`).map(
                            (item: string | { title: string; content: string }, index: number) => {
                              if (typeof item === "string") {
                                return (
                                  <li
                                    key={index}
                                    className="list-item"
                                    dangerouslySetInnerHTML={{ __html: item }}
                                  />
                                );
                              }
                              return (
                                <li key={index} className="list-item">
                                  <strong>{item.title}</strong> {item.content}
                                </li>
                              );
                            },
                          )}
                        </ul>
                      )}
                      {hasTranslation(`${sectionKey}.note`) && (
                        <p className="section-text">{t(`${sectionKey}.note`)}</p>
                      )}
                      {hasTranslation(`${sectionKey}.contact`) && (
                        <p className="section-text">{t(`${sectionKey}.contact`)}</p>
                      )}
                      {hasTranslation(`${sectionKey}.additionalRights`) && (
                        <p className="section-text">{t(`${sectionKey}.additionalRights`)}</p>
                      )}
                      {hasTranslation(`${sectionKey}.exerciseRights`) && (
                        <p className="section-text">{t(`${sectionKey}.exerciseRights`)}</p>
                      )}
                      {hasTranslation(`${sectionKey}.verification`) && (
                        <p className="section-text">{t(`${sectionKey}.verification`)}</p>
                      )}
                      {hasTranslation(`${sectionKey}.responseTime`) && (
                        <p className="section-text">{t(`${sectionKey}.responseTime`)}</p>
                      )}
                      {hasTranslation(`${sectionKey}.specialCategoriesNote`) && (
                        <p
                          className="section-text"
                          dangerouslySetInnerHTML={{
                            __html: t(`${sectionKey}.specialCategoriesNote`),
                          }}
                        />
                      )}
                      {num === 2 && (
                        <ul className="list">
                          <li className="list-item">
                            <strong>{t("privacy.section2.controller")}</strong>{" "}
                            {t("privacy.section2.controllerValue")}
                          </li>
                          <li className="list-item">
                            <strong>{t("privacy.section2.privacyInquiries")}</strong>{" "}
                            {t("privacy.section2.privacyInquiriesValue")}
                          </li>
                          <li className="list-item">
                            <strong>{t("privacy.section2.dpo")}</strong>{" "}
                            {t("privacy.section2.dpoValue")}
                          </li>
                          <li className="list-item">
                            <strong>{t("privacy.section2.euRepresentative")}</strong>{" "}
                            {t("privacy.section2.euRepresentativeValue")}
                          </li>
                        </ul>
                      )}
                      {num === 16 && (
                        <ul className="list">
                          <li className="list-item">
                            <strong>{t("privacy.section16.email")}</strong>{" "}
                            {t("privacy.section16.emailValue")}
                          </li>
                          <li className="list-item">
                            <strong>{t("privacy.section16.dpo")}</strong>{" "}
                            {t("privacy.section16.dpoValue")}
                          </li>
                        </ul>
                      )}
                    </section>
                  );
                })}
              </CardContent>
            </div>

            {!hasScrolledPrivacy && (
              <div className="alert alert--warning p-md rounded-md text-center text-secondary text-sm mt-md">
                {t("auth.legalDocumentsReacceptance.scrollPrompt")}
              </div>
            )}

            <label
              className="checkbox-wrapper"
              style={{
                padding: "var(--space-sm)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface-glass)",
                border:
                  error && !acceptedPrivacy
                    ? "1px solid var(--color-danger-border)"
                    : "1px solid var(--color-border)",
                transition: "border-color 150ms ease",
                marginTop: "var(--space-md)",
              }}
            >
              <input
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                required={needsPrivacy}
                disabled={isSubmitting || !hasScrolledPrivacy}
                style={{
                  marginTop: "0.2rem",
                  cursor: hasScrolledPrivacy ? "pointer" : "not-allowed",
                  width: "18px",
                  height: "18px",
                  accentColor: "var(--color-accent)",
                }}
                aria-required={needsPrivacy ? "true" : "false"}
                aria-invalid={error && !acceptedPrivacy ? "true" : "false"}
              />
              <span className="checkbox-label">
                {t("auth.legalDocumentsReacceptance.acceptPrivacy")}
              </span>
            </label>
          </div>
        )}

        {error ? (
          <div role="alert" className="form-error mb-md">
            {error}
          </div>
        ) : null}

        <div className="flex flex--gap-md flex--wrap">
          <Button
            type="submit"
            fullWidth
            isLoading={isSubmitting}
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting
              ? t("auth.legalDocumentsReacceptance.submitting")
              : t("auth.legalDocumentsReacceptance.submit")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={() => {
              void handleSignOut();
            }}
            disabled={isSubmitting}
          >
            {t("auth.legalDocumentsReacceptance.signOut")}
          </Button>
        </div>
      </form>
    </AuthPageLayout>
  );
};

export default LegalDocumentsReacceptance;
