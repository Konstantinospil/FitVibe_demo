import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthPageLayout from "../components/AuthPageLayout";
import { Button } from "../components/ui";
import { CardContent } from "../components/ui";
import {
  acceptTerms,
  acceptPrivacyPolicy,
  getLegalDocumentsStatus,
  type LegalDocumentsStatus,
} from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useRequiredFieldValidation } from "../hooks/useRequiredFieldValidation";
import { useAuthStore } from "../store/auth.store";

const contentStyle: React.CSSProperties = {
  maxWidth: "900px",
  margin: "0 auto",
  padding: "var(--space-xl)",
  lineHeight: "var(--line-height-relaxed)",
  color: "var(--color-text-primary)",
  fontSize: "var(--font-size-md)",
};

type DocumentType = "terms" | "privacy";

const TermsReacceptance: React.FC = () => {
  const { t } = useTranslation();
  const formRef = useRef<HTMLFormElement>(null);
  const termsScrollRef = useRef<HTMLDivElement>(null);
  const privacyScrollRef = useRef<HTMLDivElement>(null);
  useRequiredFieldValidation(formRef, t);
  const navigate = useNavigate();
  const { signOut, isAuthenticated, isInitializing } = useAuth();
  const [legalStatus, setLegalStatus] = useState<LegalDocumentsStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const [hasScrolledPrivacy, setHasScrolledPrivacy] = useState(false);
  const [activeTab, setActiveTab] = useState<DocumentType>("terms");

  // Determine which documents need acceptance
  const needsTerms = legalStatus?.terms.needsAcceptance ?? false;
  const needsPrivacy = legalStatus?.privacy.needsAcceptance ?? false;

  // Redirect to login if not authenticated (after initialization)
  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      const timeoutId = setTimeout(() => {
        const authState = useAuthStore.getState();
        const stillNotAuthenticated = !authState.isAuthenticated;
        if (stillNotAuthenticated) {
          const returnUrl = "/terms-reacceptance";
          void navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
        }
      }, 500);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [isAuthenticated, isInitializing, navigate]);

  // Fetch legal document status
  useEffect(() => {
    const fetchStatus = async () => {
      if (!isAuthenticated || isInitializing) {
        return;
      }

      setIsLoadingStatus(true);
      try {
        const status = await getLegalDocumentsStatus();
        setLegalStatus(status);
        // Set initial active tab based on what needs acceptance
        if (status.terms.needsAcceptance) {
          setActiveTab("terms");
        } else if (status.privacy.needsAcceptance) {
          setActiveTab("privacy");
        }
      } catch (err) {
        console.error("Failed to fetch legal document status:", err);
        setError(
          t("auth.termsReacceptance.errorLoadingStatus", {
            defaultValue: "Failed to load document status.",
          }),
        );
      } finally {
        setIsLoadingStatus(false);
      }
    };

    void fetchStatus();
  }, [isAuthenticated, isInitializing, t]);

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

    if (termsContainer && needsTerms) {
      checkTermsScroll();
      termsContainer.addEventListener("scroll", checkTermsScroll);
      window.addEventListener("resize", checkTermsScroll);
    }

    if (privacyContainer && needsPrivacy) {
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
  }, [needsTerms, needsPrivacy]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (needsTerms && !acceptedTerms) {
      setError(t("auth.termsReacceptance.termsRequired"));
      return;
    }

    if (needsPrivacy && !acceptedPrivacy) {
      setError(
        t("auth.termsReacceptance.privacyRequired", {
          defaultValue: "You must accept the Privacy Policy to continue.",
        }),
      );
      return;
    }

    // Check scroll requirements
    if (needsTerms && activeTab === "terms" && !hasScrolledTerms) {
      setError(
        t("auth.termsReacceptance.scrollRequired", {
          defaultValue: "Please scroll to the end of the terms to continue.",
        }),
      );
      return;
    }

    if (needsPrivacy && activeTab === "privacy" && !hasScrolledPrivacy) {
      setError(
        t("auth.termsReacceptance.scrollRequired", {
          defaultValue: "Please scroll to the end of the document to continue.",
        }),
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isAuthenticated) {
        setError(
          t("auth.termsReacceptance.notAuthenticated", {
            defaultValue: "You must be logged in to accept terms. Redirecting to login...",
          }),
        );
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
          setError(
            t("auth.termsReacceptance.notAuthenticated", {
              defaultValue: "You must be logged in to accept terms. Redirecting to login...",
            }),
          );
          const returnUrl = "/terms-reacceptance";
          setTimeout(() => {
            void navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
          }, 2000);
          return;
        }

        setError(errorCode ? t(`errors.${errorCode}`) : t("auth.termsReacceptance.error"));
      } else {
        setError(t("auth.termsReacceptance.error"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    void navigate("/login", { replace: true });
  };

  // Show loading state while checking authentication or loading status
  if (isInitializing || isLoadingStatus) {
    return (
      <AuthPageLayout
        eyebrow={t("auth.termsReacceptance.eyebrow")}
        title={t("auth.termsReacceptance.title")}
        description={t("auth.termsReacceptance.description")}
      >
        <div
          className="flex h-screen w-full items-center justify-center text-primary-500"
          role="status"
          aria-live="polite"
        >
          {t("common.loading", { defaultValue: "Loading..." })}
        </div>
      </AuthPageLayout>
    );
  }

  // Don't render form if not authenticated (will redirect)
  if (!isAuthenticated) {
    return (
      <AuthPageLayout
        eyebrow={t("auth.termsReacceptance.eyebrow")}
        title={t("auth.termsReacceptance.title")}
        description={t("auth.termsReacceptance.description")}
      >
        <div className="p-lg text-center text-secondary">
          <p>
            {t("auth.termsReacceptance.redirecting", { defaultValue: "Redirecting to login..." })}
          </p>
        </div>
      </AuthPageLayout>
    );
  }

  // If no documents need acceptance, redirect to home
  if (legalStatus && !needsTerms && !needsPrivacy) {
    void navigate("/", { replace: true });
    return null;
  }

  const canSubmit =
    (!needsTerms || acceptedTerms) &&
    (!needsPrivacy || acceptedPrivacy) &&
    (!needsTerms || hasScrolledTerms) &&
    (!needsPrivacy || hasScrolledPrivacy);

  return (
    <AuthPageLayout
      eyebrow={t("auth.termsReacceptance.eyebrow")}
      title={t("auth.termsReacceptance.title")}
      description={t("auth.termsReacceptance.description")}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
      <form ref={formRef} onSubmit={handleSubmit} className="form">
        <div className="p-md rounded-md mb-1 alert alert--warning">
          <p className="m-0 text-secondary text-095">{t("auth.termsReacceptance.notice")}</p>
        </div>

        {/* Tabs for switching between documents (only if both need acceptance) */}
        {needsTerms && needsPrivacy && (
          <div className="flex flex--gap-sm mb-lg">
            <Button
              type="button"
              variant={activeTab === "terms" ? "primary" : "ghost"}
              onClick={() => setActiveTab("terms")}
              className="flex-1"
            >
              {t("auth.legalDocumentsReacceptance.termsTab", { defaultValue: "Terms" })}
            </Button>
            <Button
              type="button"
              variant={activeTab === "privacy" ? "primary" : "ghost"}
              onClick={() => setActiveTab("privacy")}
              className="flex-1"
            >
              {t("auth.legalDocumentsReacceptance.privacyTab", { defaultValue: "Privacy Policy" })}
            </Button>
          </div>
        )}

        {/* Terms Content */}
        {needsTerms && (activeTab === "terms" || !needsPrivacy) && (
          <div className="mb-lg">
            <div
              ref={termsScrollRef}
              className="w-full"
              style={{
                maxWidth: "900px",
                margin: "0 auto var(--space-lg)",
                maxHeight: "60vh",
                overflowY: "auto",
                background: "var(--color-bg-card)",
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-e3)",
              }}
            >
              <CardContent style={contentStyle}>
                <div className="mb-1 text-muted text-sm">
                  <strong>{t("terms.effectiveDate")}:</strong> {t("terms.effectiveDateValue")}
                </div>

                <p className="section-text">{t("terms.intro")}</p>

                <section className="section">
                  <h2 className="section-title">{t("terms.section1.title")}</h2>
                  <ul className="list">
                    {getArrayTranslation("terms.section1.items").map(
                      (item: string, index: number) => (
                        <li key={index} className="list-item">
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </section>

                <section className="section">
                  <h2 className="section-title">{t("terms.section2.title")}</h2>
                  <ul className="list">
                    {getArrayTranslation("terms.section2.items").map(
                      (item: string, index: number) => (
                        <li key={index} className="list-item">
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </section>

                <section className="section">
                  <h2 className="section-title">{t("terms.section3.title")}</h2>
                  <p className="section-text">{t("terms.section3.subtitle")}</p>
                  <ul className="list">
                    {getArrayTranslation("terms.section3.items").map(
                      (item: string, index: number) => (
                        <li key={index} className="list-item">
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </section>

                <section className="section">
                  <h2 className="section-title">{t("terms.section4.title")}</h2>
                  <ul className="list">
                    {getArrayTranslation("terms.section4.items").map(
                      (item: string, index: number) => (
                        <li key={index} className="list-item">
                          {item}
                        </li>
                      ),
                    )}
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
                    {getArrayTranslation("terms.section7.items").map(
                      (item: string, index: number) => (
                        <li key={index} className="list-item">
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </section>

                <section className="section">
                  <h2 className="section-title">{t("terms.section8.title")}</h2>
                  <ul className="list">
                    {getArrayTranslation("terms.section8.items").map(
                      (item: string, index: number) => (
                        <li key={index} className="list-item">
                          {item}
                        </li>
                      ),
                    )}
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
                    {getArrayTranslation("terms.section14.items").map(
                      (item: string, index: number) => (
                        <li key={index} className="list-item">
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </section>

                <section className="section">
                  <h2 className="section-title">{t("terms.section15.title")}</h2>
                  <ul className="list">
                    {getArrayTranslation("terms.section15.items").map(
                      (item: string, index: number) => (
                        <li key={index} className="list-item">
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </section>

                <section className="section">
                  <h2 className="section-title">{t("terms.section16.title")}</h2>
                  <p className="section-text">{t("terms.section16.content")}</p>
                </section>
              </CardContent>
            </div>

            {!hasScrolledTerms && (
              <div className="mb-1 p-md rounded-md text-center text-secondary text-sm alert alert--warning">
                {t("auth.termsReacceptance.scrollPrompt", {
                  defaultValue: "Please scroll to the end of the terms to continue.",
                })}
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
                marginBottom: "var(--space-md)",
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
              <span className="checkbox-label">{t("auth.termsReacceptance.acceptTerms")}</span>
            </label>
          </div>
        )}

        {/* Privacy Content */}
        {needsPrivacy && (activeTab === "privacy" || !needsTerms) && (
          <div className="mb-lg">
            <div
              ref={privacyScrollRef}
              className="w-full"
              style={{
                maxWidth: "900px",
                margin: "0 auto var(--space-lg)",
                maxHeight: "60vh",
                overflowY: "auto",
                background: "var(--color-bg-card)",
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-e3)",
              }}
            >
              <CardContent style={contentStyle}>
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
              <div className="mb-1 p-md rounded-md text-center text-secondary text-sm alert alert--warning">
                {t("auth.termsReacceptance.scrollPrompt", {
                  defaultValue: "Please scroll to the end of the document to continue.",
                })}
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
                marginBottom: "var(--space-md)",
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
                {t("auth.legalDocumentsReacceptance.acceptPrivacy", {
                  defaultValue: "I have read and accept the Privacy Policy",
                })}
              </span>
            </label>
          </div>
        )}

        {error ? (
          <div role="alert" className="form-error mb-1">
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
              ? t("auth.termsReacceptance.submitting")
              : t("auth.termsReacceptance.submit")}
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
            {t("auth.termsReacceptance.signOut")}
          </Button>
        </div>
      </form>
    </AuthPageLayout>
  );
};

export default TermsReacceptance;
