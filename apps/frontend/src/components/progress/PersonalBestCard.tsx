import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Trophy } from "lucide-react";
import type { DashboardPersonalRecord } from "../../services/api";
import Skeleton from "../ui/Skeleton";
import { EmptyState } from "../utils/EmptyState";

export interface PersonalBestCardProps {
  records: DashboardPersonalRecord[];
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * PersonalBestCard component displays personal records/PRs.
 * Shows lift name, value, achievement date, and visibility.
 */
export const PersonalBestCard: React.FC<PersonalBestCardProps> = ({
  records,
  loading = false,
  className,
  style,
}) => {
  const { t } = useTranslation("common");

  if (loading) {
    return (
      <Card className={className} style={style}>
        <CardHeader>
          <CardTitle>{t("progress.personalBests") || "Personal Bests"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex--column flex--gap-md">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width="100%" height="60px" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card className={className} style={style}>
        <CardHeader>
          <CardTitle>{t("progress.personalBests") || "Personal Bests"}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title={t("progress.noPersonalBests") || "No Personal Bests"}
            message={
              t("progress.noPersonalBestsDescription") ||
              "Start logging sessions to track your personal records"
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} style={style}>
      <CardHeader>
        <CardTitle>{t("progress.personalBests") || "Personal Bests"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex--column flex--gap-md">
          {records.map((record, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-md)",
                padding: "var(--space-md)",
                background: "var(--color-surface)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "2.5rem",
                  height: "2.5rem",
                  borderRadius: "50%",
                  background: "var(--color-primary)",
                  color: "var(--color-primary-on)",
                  flexShrink: 0,
                }}
              >
                <Trophy size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    marginBottom: "var(--space-xs)",
                  }}
                >
                  {record.lift}
                </div>
                <div
                  style={{
                    fontSize: "var(--font-size-md)",
                    fontWeight: 600,
                    color: "var(--color-primary)",
                    marginBottom: "var(--space-xs)",
                  }}
                >
                  {record.value}
                </div>
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {t("progress.achievedOn", { date: record.achieved }) ||
                    `Achieved on ${record.achieved}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
