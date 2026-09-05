import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import PageIntro from "../components/PageIntro";
import PublicReturnButton from "../components/PublicReturnButton";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Card, CardContent, Button } from "../components/ui";
import { ensureLegalTranslationsLoaded } from "../i18n/config";
import { asTranslationList } from "../i18n/lists";
import { useAuthStore } from "../store/auth.store";
import { useToast } from "../contexts/ToastContext";
import {
  acceptTerms,
  getLegalDocumentsStatus,
  revokeTerms,
  type LegalDocumentsStatus,
} from "../services/api";

const contentStyle: React.CSSProperties = {
  maxWidth: "900px",
  margin: "0 auto",
  padding: "2rem",
  lineHeight: 1.8,
  color: "var(--color-text-primary)",
  fontSize: "0.95rem",
};

const Terms: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const signOut = useAuthStore((state) => state.signOut);
  const [termsStatus, setTermsStatus] = useState<LegalDocumentsStatus["terms"] | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    void ensureLegalTranslationsLoaded();
  }, [i18n.language]);

  useEffect(() => {
    if (!isAuthenticated) {
      setTermsStatus(null);
      return;
    }

    let cancelled = false;
    void getLegalDocumentsStatus()
      .then((status) => {
        if (!cancelled) {
          setTermsStatus(status.terms);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTermsStatus({
            accepted: false,
            acceptedAt: null,
            acceptedVersion: null,
            currentVersion: "",
            needsAcceptance: true,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleAccept = async () => {
    setIsWorking(true);
    try {
      await acceptTerms({ terms_accepted: true });
      void navigate("/", { replace: true });
    } catch {
      toast.error(t("terms.consent.acceptError"));
      setIsWorking(false);
    }
  };

  const handleRevoke = async () => {
    setIsWorking(true);
    try {
      await revokeTerms();
      await signOut();
      void navigate("/login", { replace: true });
    } catch {
      toast.error(t("terms.consent.revokeError"));
      setIsWorking(false);
      setShowRevokeConfirm(false);
    }
  };

  return (
    <PageIntro
      title={t("terms.title")}
      description={t("terms.description")}
      actions={<PublicReturnButton />}
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
            <strong>{t("terms.effectiveDate")}:</strong> {t("terms.effectiveDateValue")}
          </div>

          <p className="section-text">{t("terms.intro")}</p>

          <section className="section">
            <h2 className="section-title">{t("terms.section1.title")}</h2>
            <ul className="list">
              {asTranslationList<string>(t("terms.section1.items", { returnObjects: true })).map(
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
              {asTranslationList<string>(t("terms.section2.items", { returnObjects: true })).map(
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
              {asTranslationList<string>(t("terms.section3.items", { returnObjects: true })).map(
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
              {asTranslationList<string>(t("terms.section4.items", { returnObjects: true })).map(
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
              {asTranslationList<string>(t("terms.section7.items", { returnObjects: true })).map(
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
              {asTranslationList<string>(t("terms.section8.items", { returnObjects: true })).map(
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
              {asTranslationList<string>(t("terms.section14.items", { returnObjects: true })).map(
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
              {asTranslationList<string>(t("terms.section15.items", { returnObjects: true })).map(
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
      </Card>
    </PageIntro>
  );
};

export default Terms;
