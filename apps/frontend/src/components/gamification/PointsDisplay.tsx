import React from "react";
import { Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface PointsDisplayProps {
  points: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const PointsDisplay: React.FC<PointsDisplayProps> = ({
  points,
  showLabel = true,
  size = "md",
  className = "",
}) => {
  const { t } = useTranslation();
  const sizeMap = {
    sm: { icon: 16, text: "text-sm" },
    md: { icon: 20, text: "text-base" },
    lg: { icon: 24, text: "text-lg" },
  };

  const styles = sizeMap[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Trophy size={styles.icon} className="text-primary" />
      <span className={`font-semibold text-primary ${styles.text}`}>{points.toLocaleString()}</span>
      {showLabel && (
        <span className={`text-secondary ${styles.text === "text-lg" ? "text-base" : "text-sm"}`}>
          {t("points.label", { defaultValue: "points" })}
        </span>
      )}
    </div>
  );
};
