import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import PageIntro from "../components/PageIntro";
import PublicReturnButton from "../components/PublicReturnButton";
import { ConfirmDialog } from "../components/ConfirmDialog";
import PublishedLegalDocument from "../components/PublishedLegalDocument";
import { Card, CardContent, Button } from "../components/ui";
import { useAuthStore } from "../store/auth.store";
import { useToast } from "../contexts/ToastContext";
import {
  acceptTerms,
  getLegalDocumentsStatus,
  revokeTerms,
  type LegalDocumentsStatus,
} from "../services/api";

const Terms: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const signOut = useAuthStore((state) => state.signOut);
  const [status, setStatus] = useState<LegalDocumentsStatus["terms"] | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    void getLegalDocumentsStatus()
      .then((result) => {
        if (!cancelled) setStatus(result.terms);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleAccept = async () => {
    setIsWorking(true);
    try {
      await acceptTerms({ terms_accepted: true });
      const next = await getLegalDocumentsStatus();
      setStatus(next.terms);
      void navigate("/", { replace: true });
    } catch {
      toast.error(t("terms.consent.acceptError"));
    } finally {
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
      setShowRevokeConfirm(false);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <PageIntro
      title={t("terms.title")}
      description={t("terms.description")}
      actions={<PublicReturnButton />}
    >
      <Card style={{ maxWidth: "900px", width: "100%", margin: "0 auto" }}>
        <CardContent style={{ padding: "2rem", lineHeight: 1.8 }}>
          <PublishedLegalDocument documentType="terms" />

          {isAuthenticated && status?.needsAcceptance ? (
            <div className="flex flex--center mt-xl">
              <Button variant="primary" onClick={() => void handleAccept()} disabled={isWorking}>
                {isWorking ? t("terms.consent.accepting") : t("terms.consent.accept")}
              </Button>
            </div>
          ) : null}

          {isAuthenticated && status && !status.needsAcceptance ? (
            <div className="flex flex--center mt-xl">
              <Button
                variant="secondary"
                onClick={() => setShowRevokeConfirm(true)}
                disabled={isWorking}
              >
                {t("terms.consent.revoke")}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={showRevokeConfirm}
        title={t("terms.consent.revokeConfirm.title")}
        message={t("terms.consent.revokeConfirm.message")}
        confirmLabel={t("terms.consent.revokeConfirm.confirm")}
        cancelLabel={t("terms.consent.revokeConfirm.cancel")}
        variant="warning"
        onConfirm={() => void handleRevoke()}
        onCancel={() => setShowRevokeConfirm(false)}
      />
    </PageIntro>
  );
};

export default Terms;
