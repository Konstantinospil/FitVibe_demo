import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import PageIntro from "../components/PageIntro";
import { Card, CardContent, Button } from "../components/ui";
import { useAuthStore } from "../store/auth.store";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  revokePrivacyPolicy,
  acceptPrivacyPolicy,
  getLegalDocumentsStatus,
  type LegalDocumentsStatus,
} from "../services/api";
import { useAuth } from "../contexts/AuthContext";

// Helper function to safely get array from translation
const getTranslationArray = <T,>(translation: unknown, fallback: T[] = []): T[] => {
  if (Array.isArray(translation)) {
    return translation as T[];
  }
  return fallback;
};

const Privacy: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { isInitializing } = useAuth();
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [legalStatus, setLegalStatus] = useState<LegalDocumentsStatus | null>(null);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if acceptance is needed - default to true if status not loaded yet (show accept button)
  const needsAcceptance = legalStatus ? (legalStatus.privacy.needsAcceptance ?? false) : true;

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

  const handleAcceptPrivacy = async () => {
    setError(null);

    if (!acceptedPrivacy) {
      setError(
        t("auth.legalDocumentsReacceptance.privacyRequired", {
          defaultValue: "You must accept the Privacy Policy to continue.",
        }),
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isAuthenticated) {
        const returnUrl = "/privacy";
        void navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
        return;
      }

      await acceptPrivacyPolicy({ privacy_policy_accepted: true });

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
              defaultValue: "You must be logged in to accept the policy. Redirecting to login...",
            }),
          );
          const returnUrl = "/privacy";
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
      await revokePrivacyPolicy();
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

  return (
    <PageIntro
      eyebrow={t("privacy.eyebrow")}
      title={t("privacy.title")}
      description={t("privacy.description")}
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
        <CardContent
          className="text-095 text-primary"
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            padding: "var(--space-xl)",
            lineHeight: 1.8,
          }}
        >
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
          <div className="mb-1 text-muted text-09">
            <strong>{t("privacy.effectiveDate")}:</strong> {t("privacy.effectiveDateValue")}
          </div>

          <p className="section-text">{t("privacy.intro1")}</p>

          <p className="section-text">{t("privacy.intro2")}</p>

          <section className="section">
            <h2 className="section-title">{t("privacy.section1.title")}</h2>
            <p className="section-text">{t("privacy.section1.subtitle")}</p>
            <ul className="list">
              {getTranslationArray<string>(
                t("privacy.section1.items", { returnObjects: true }),
              ).map((item: string, index: number) => (
                <li key={index} className="list-item" dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section2.title")}</h2>
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
                <strong>{t("privacy.section2.dpo")}</strong> {t("privacy.section2.dpoValue")}
              </li>
              <li className="list-item">
                <strong>{t("privacy.section2.euRepresentative")}</strong>{" "}
                {t("privacy.section2.euRepresentativeValue")}
              </li>
            </ul>
            <p className="section-text">{t("privacy.section2.contactNote")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section3.title")}</h2>
            <p className="section-text">{t("privacy.section3.subtitle")}</p>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "var(--space-md)",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {t("privacy.section3.table.headers.category")}
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {t("privacy.section3.table.headers.examples")}
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {t("privacy.section3.table.headers.source")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.accountData.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.accountData.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.accountData.source")}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.profilePreferences.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.profilePreferences.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.profilePreferences.source")}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.trainingWellness.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.trainingWellness.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.trainingWellness.source")}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.socialCommunity.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.socialCommunity.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.socialCommunity.source")}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.deviceTechnical.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.deviceTechnical.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.deviceTechnical.source")}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.usageDiagnostics.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.usageDiagnostics.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.usageDiagnostics.source")}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.supportCommunication.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.supportCommunication.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.supportCommunication.source")}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.paymentBilling.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.paymentBilling.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.paymentBilling.source")}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.cookiesIds.category")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.cookiesIds.examples")}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {t("privacy.section3.table.rows.cookiesIds.source")}
                  </td>
                </tr>
              </tbody>
            </table>
            <p
              className="section-text"
              dangerouslySetInnerHTML={{ __html: t("privacy.section3.specialCategoriesNote") }}
            />
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section4.title")}</h2>
            <p className="section-text">{t("privacy.section4.subtitle")}</p>
            <ul className="list">
              {getTranslationArray<string>(
                t("privacy.section4.items", { returnObjects: true }),
              ).map((item: string, index: number) => (
                <li key={index} className="list-item" dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section5.title")}</h2>
            <p className="section-text">{t("privacy.section5.subtitle")}</p>
            <ul className="list">
              {getTranslationArray<string>(
                t("privacy.section5.items", { returnObjects: true }),
              ).map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section6.title")}</h2>
            <p className="section-text">{t("privacy.section6.subtitle")}</p>
            <ul className="list">
              {getTranslationArray<{ title: string; content: string }>(
                t("privacy.section6.items", { returnObjects: true }),
              ).map((item: { title: string; content: string }, index: number) => (
                <li key={index} className="list-item">
                  <strong>{item.title}</strong> {item.content}
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section7.title")}</h2>
            <p className="section-text">{t("privacy.section7.subtitle")}</p>
            <ul className="list">
              {getTranslationArray<string>(
                t("privacy.section7.items", { returnObjects: true }),
              ).map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
            <p className="section-text">{t("privacy.section7.cookieNote")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section8.title")}</h2>
            <p
              className="section-text"
              dangerouslySetInnerHTML={{ __html: t("privacy.section8.notSold") }}
            />
            <p className="section-text">{t("privacy.section8.subtitle")}</p>
            <ul className="list">
              {getTranslationArray<{ title: string; content: string }>(
                t("privacy.section8.items", { returnObjects: true }),
              ).map((item: { title: string; content: string }, index: number) => (
                <li key={index} className="list-item">
                  <strong>{item.title}</strong> {item.content}
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section9.title")}</h2>
            <p className="section-text">{t("privacy.section9.paragraph1")}</p>
            <p className="section-text">{t("privacy.section9.paragraph2")}</p>
            <ul className="list">
              {getTranslationArray<string>(
                t("privacy.section9.items", { returnObjects: true }),
              ).map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
            <p className="section-text">{t("privacy.section9.paragraph3")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section10.title")}</h2>
            <p className="section-text">{t("privacy.section10.paragraph1")}</p>
            <p className="section-text">{t("privacy.section10.paragraph2")}</p>
            <ul className="list">
              {getTranslationArray<{ title: string; content: string }>(
                t("privacy.section10.items", { returnObjects: true }),
              ).map((item: { title: string; content: string }, index: number) => (
                <li key={index} className="list-item">
                  <strong>{item.title}</strong> {item.content}
                </li>
              ))}
            </ul>
            <p className="section-text">{t("privacy.section10.paragraph3")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section11.title")}</h2>
            <p className="section-text">{t("privacy.section11.subtitle")}</p>
            <ul className="list">
              {getTranslationArray<string>(
                t("privacy.section11.items", { returnObjects: true }),
              ).map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
            <p className="section-text">{t("privacy.section11.note")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section12.title")}</h2>
            <p className="section-text">{t("privacy.section12.subtitle")}</p>
            <ul className="list">
              {getTranslationArray<{ title: string; content: string }>(
                t("privacy.section12.items", { returnObjects: true }),
              ).map((item: { title: string; content: string }, index: number) => (
                <li key={index} className="list-item">
                  <strong>{item.title}</strong> {item.content}
                </li>
              ))}
            </ul>
            <p className="section-text">{t("privacy.section12.additionalRights")}</p>
            <p className="section-text">{t("privacy.section12.exerciseRights")}</p>
            <p className="section-text">{t("privacy.section12.verification")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section13.title")}</h2>
            <p
              className="section-text"
              dangerouslySetInnerHTML={{ __html: t("privacy.section13.subtitle") }}
            />
            <ul className="list">
              {getTranslationArray<string>(
                t("privacy.section13.items", { returnObjects: true }),
              ).map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
            <p className="section-text">{t("privacy.section13.contact")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section14.title")}</h2>
            <p
              className="section-text"
              dangerouslySetInnerHTML={{ __html: t("privacy.section14.paragraph1") }}
            />
            <p className="section-text">{t("privacy.section14.paragraph2")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section15.title")}</h2>
            <p className="section-text">{t("privacy.section15.paragraph1")}</p>
            <ul className="list">
              {getTranslationArray<string>(
                t("privacy.section15.items", { returnObjects: true }),
              ).map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
            <p className="section-text">{t("privacy.section15.paragraph2")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("privacy.section16.title")}</h2>
            <p className="section-text">{t("privacy.section16.subtitle")}</p>
            <ul className="list">
              <li className="list-item">
                <strong>{t("privacy.section16.email")}</strong> {t("privacy.section16.emailValue")}
              </li>
              <li className="list-item">
                <strong>{t("privacy.section16.dpo")}</strong> {t("privacy.section16.dpoValue")}
              </li>
            </ul>
            <p className="section-text">{t("privacy.section16.responseTime")}</p>
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
                    const returnUrl = "/privacy";
                    void navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, {
                      replace: true,
                    });
                  }}
                  className="w-full"
                >
                  {t("auth.login.title", { defaultValue: "Login to Accept Privacy Policy" })}
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
                      error && !acceptedPrivacy
                        ? "1px solid var(--color-danger-border)"
                        : "1px solid var(--color-border)",
                    transition: "border-color 150ms ease",
                    marginBottom: "var(--space-md)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
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
                    aria-invalid={error && !acceptedPrivacy ? "true" : "false"}
                  />
                  <span className="checkbox-label">
                    {t("auth.legalDocumentsReacceptance.acceptPrivacy", {
                      defaultValue: "I have read and accept the Privacy Policy",
                    })}
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
                    onClick={() => void handleAcceptPrivacy()}
                    disabled={isSubmitting || !acceptedPrivacy}
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
                  {t("privacy.revokeConsent")}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={showRevokeConfirm}
        title={t("privacy.revokeConfirm.title")}
        message={t("privacy.revokeConfirm.message")}
        confirmLabel={t("privacy.revokeConfirm.confirm")}
        cancelLabel={t("privacy.revokeConfirm.cancel")}
        variant="warning"
        onConfirm={() => void handleRevokeConsent()}
        onCancel={() => setShowRevokeConfirm(false)}
      />
    </PageIntro>
  );
};

export default Privacy;
