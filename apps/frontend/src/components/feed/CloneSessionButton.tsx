import React, { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "../ui/Button";
import { cloneSessionFromFeed } from "../../services/api";
import { useToast } from "../ui/Toast";
import { useTranslation } from "react-i18next";

export interface CloneSessionButtonProps {
  sessionId: string;
  onCloned?: (sessionId: string) => void;
  onCloneSuccess?: (newSessionId: string) => void;
  size?: "sm" | "md" | "lg";
  variant?: "minimal" | "default";
}

export const CloneSessionButton: React.FC<CloneSessionButtonProps> = ({
  sessionId,
  onCloned,
  onCloneSuccess,
  size = "md",
  variant = "default",
}) => {
  const { t } = useTranslation("common");
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await cloneSessionFromFeed(sessionId);
      showToast({
        variant: "success",
        title: t("feed.cloneSuccess") || "Session Cloned",
        message: t("feed.cloneSuccessMessage") || "Session has been cloned successfully",
      });
      onCloned?.(result.sessionId);
      onCloneSuccess?.(result.sessionId);
    } catch {
      showToast({
        variant: "error",
        title: t("feed.cloneFailed") || "Clone Failed",
        message: t("feed.cloneFailedMessage") || "Failed to clone session. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant === "minimal" ? "ghost" : "secondary"}
      size={size}
      onClick={() => {
        void handleClick();
      }}
      isLoading={isLoading}
      leftIcon={<Copy size={16} />}
      aria-label={t("feed.clone") || "Clone session"}
    />
  );
};
