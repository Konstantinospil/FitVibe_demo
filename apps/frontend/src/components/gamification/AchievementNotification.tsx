import type React from "react";
import { useEffect } from "react";
import { useToast } from "../../contexts/ToastContext";
import type { BadgeCatalogEntry } from "../../services/api";

export interface AchievementNotificationProps {
  badge: BadgeCatalogEntry;
  show?: boolean;
  onDismiss?: () => void;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  badge,
  show = true,
  onDismiss,
}) => {
  const toast = useToast();

  useEffect(() => {
    if (show) {
      toast.success(`Achievement unlocked: ${badge.name}! ${badge.description}`, 5000);
      if (onDismiss) {
        setTimeout(() => {
          onDismiss();
        }, 5000);
      }
    }
  }, [show, badge, toast, onDismiss]);

  return null; // Toast handles the display
};
