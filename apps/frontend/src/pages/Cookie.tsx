import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n, { translationsLoadingPromise } from "../i18n/config";
import PageIntro from "../components/PageIntro";
import { Card, CardContent } from "../components/ui";

const contentStyle: React.CSSProperties = {
  maxWidth: "900px",
  margin: "0 auto",
  padding: "2rem",
  lineHeight: 1.8,
  color: "var(--color-text-primary)",
  fontSize: "0.95rem",
};

const Cookie: React.FC = () => {
  const { t } = useTranslation();
  const [translationsReady, setTranslationsReady] = useState(false);

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
        Loading...
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
          <div
            style={{ marginBottom: "1rem", color: "var(--color-text-muted)", fontSize: "0.9rem" }}
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
        </CardContent>
      </Card>
    </PageIntro>
  );
};

export default Cookie;
