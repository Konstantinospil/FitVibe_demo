import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import i18n, { translationsLoadingPromise } from "../i18n/config";
import PageIntro from "../components/PageIntro";
import { Card, CardContent, Button } from "../components/ui";
import { useAuthStore } from "../store/auth.store";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { revokeTerms } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const contentStyle: React.CSSProperties = {
  maxWidth: "900px",
  margin: "0 auto",
  padding: "var(--space-xl)",
  lineHeight: 1.8,
  color: "var(--color-text-primary)",
  fontSize: "var(--font-size-md)",
};

const Cookie: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { signOut } = useAuth();
  const [translationsReady, setTranslationsReady] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const handleRevokeConsent = async () => {
    setIsRevoking(true);
    try {
      await revokeTerms();
      // User will be logged out by the backend, redirect to login
      await signOut();
      void navigate("/login", { replace: true });
    } catch (error) {
      console.error("Failed to revoke consent:", error);
      setIsRevoking(false);
      setShowRevokeConfirm(false);
      // TODO: Show error toast
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
        const testTranslation = i18n.t("cookie.title");
        if (testTranslation && testTranslation !== "cookie.title") {
          setTranslationsReady(true);
        } else {
          // If still not ready, poll for a bit
          let attempts = 0;
          const checkInterval = setInterval(() => {
            attempts++;
            const translation = i18n.t("cookie.title");
            if (translation && translation !== "cookie.title") {
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
      eyebrow={t("cookie.eyebrow")}
      title={t("cookie.policy.title")}
      description={t("cookie.policy.description")}
    >
      <Card
        style={{
          maxWidth: "900px",
          width: "100%",
          margin: "0 auto",
          maxHeight: "80vh",
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
            <strong>{t("cookie.effectiveDate")}:</strong> {t("cookie.effectiveDateValue")}
          </div>

          <section className="section">
            <h2 className="section-title">{t("cookie.section1.title")}</h2>
            <p className="section-text">{t("cookie.section1.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("cookie.section2.title")}</h2>
            <ul className="list">
              {getArrayTranslation("cookie.section2.items").map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("cookie.section3.title")}</h2>
            <p className="section-text">{t("cookie.section3.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("cookie.section4.title")}</h2>
            <ul className="list">
              {getArrayTranslation("cookie.section4.items").map((item: string, index: number) => (
                <li key={index} className="list-item">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="section">
            <h2 className="section-title">{t("cookie.section5.title")}</h2>
            <p className="section-text">{t("cookie.section5.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("cookie.section6.title")}</h2>
            <p className="section-text">{t("cookie.section6.content")}</p>
          </section>

          <section className="section">
            <h2 className="section-title">{t("cookie.section7.title")}</h2>
            <p className="section-text">{t("cookie.section7.content")}</p>
          </section>

          {isAuthenticated && (
            <div
              className="flex flex--center"
              style={{
                marginTop: "var(--space-xl)",
                paddingTop: "var(--space-xl)",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <Button
                variant="secondary"
                onClick={() => setShowRevokeConfirm(true)}
                disabled={isRevoking}
              >
                {t("cookie.revokeConsent", { defaultValue: "Revoke Consent" })}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={showRevokeConfirm}
        title={t("cookie.revokeConfirm.title")}
        message={t("cookie.revokeConfirm.message")}
        confirmLabel={t("cookie.revokeConfirm.confirm")}
        cancelLabel={t("cookie.revokeConfirm.cancel")}
        variant="warning"
        onConfirm={() => void handleRevokeConsent()}
        onCancel={() => setShowRevokeConfirm(false)}
      />
    </PageIntro>
  );
};

export default Cookie;
