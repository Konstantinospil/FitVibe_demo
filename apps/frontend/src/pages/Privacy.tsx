import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import PageIntro from "../components/PageIntro";
import PublicReturnButton from "../components/PublicReturnButton";
import PublishedLegalDocument from "../components/PublishedLegalDocument";
import { Card, CardContent, Button } from "../components/ui";
import { useAuthStore } from "../store/auth.store";
import { useToast } from "../contexts/ToastContext";
import {
  acceptPrivacyPolicy,
  getLegalDocumentsStatus,
  revokePrivacyPolicy,
  type LegalDocumentsStatus,
} from "../services/api";

const Privacy: React.FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [status, setStatus] = useState<LegalDocumentsStatus["privacy"] | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    void getLegalDocumentsStatus()
      .then((result) => {
        if (!cancelled) {
          setStatus(result.privacy);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleAcknowledge = async () => {
    setIsWorking(true);
    try {
      await acceptPrivacyPolicy({ privacy_policy_accepted: true });
      const next = await getLegalDocumentsStatus();
      setStatus(next.privacy);
    } catch {
      toast.error(
        t("privacy.consent.acceptError", { defaultValue: "Could not save acknowledgement." }),
      );
    } finally {
      setIsWorking(false);
    }
  };

  const handleRevoke = async () => {
    setIsWorking(true);
    try {
      await revokePrivacyPolicy();
      const next = await getLegalDocumentsStatus();
      setStatus(next.privacy);
    } catch {
      toast.error(
        t("privacy.consent.revokeError", { defaultValue: "Could not revoke acknowledgement." }),
      );
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <PageIntro
      title={t("privacy.title")}
      description={t("privacy.description")}
      actions={<PublicReturnButton />}
    >
      <Card style={{ maxWidth: "900px", width: "100%", margin: "0 auto" }}>
        <CardContent style={{ padding: "2rem", lineHeight: 1.8 }}>
          <PublishedLegalDocument documentType="privacy" />

          {isAuthenticated && status?.needsAcceptance ? (
            <div className="flex flex--center mt-xl">
              <Button
                variant="primary"
                onClick={() => void handleAcknowledge()}
                disabled={isWorking}
              >
                {t("privacy.consent.acknowledge", { defaultValue: "Acknowledge" })}
              </Button>
            </div>
          ) : null}

          {isAuthenticated && status && !status.needsAcceptance && status.acceptedVersion ? (
            <div className="flex flex--center mt-xl">
              <Button variant="secondary" onClick={() => void handleRevoke()} disabled={isWorking}>
                {t("privacy.consent.revoke", { defaultValue: "Revoke acknowledgement" })}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PageIntro>
  );
};

export default Privacy;
