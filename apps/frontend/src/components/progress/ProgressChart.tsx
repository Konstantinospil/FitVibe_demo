import React from "react";
import { useTranslation } from "react-i18next";
<<<<<<< Updated upstream
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Chart, type ChartDatum } from "../ui/Chart";
import Skeleton from "../ui/Skeleton";
=======
import { Card, CardContent } from "../ui/Card";
import { Chart, type ChartDatum } from "../ui/Chart";
import Skeleton from "../ui/Skeleton";
import { Button } from "../ui/Button";
import ErrorBoundary from "../ErrorBoundary";

export type ChartType = "area" | "bar";
>>>>>>> Stashed changes

export interface ProgressChartProps {
  title: string;
  data: ChartDatum[];
<<<<<<< Updated upstream
  loading?: boolean;
  type?: "area" | "bar";
  color?: string;
  height?: number;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number) => string;
  className?: string;
  style?: React.CSSProperties;
=======
  type?: ChartType;
  color?: string;
  valueFormatter?: (value: number) => string;
  height?: number;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  emptyMessage?: string;
>>>>>>> Stashed changes
  dateRange?: { from: string; to: string };
}

/**
<<<<<<< Updated upstream
 * ProgressChart component displays progress data in a chart format.
 * Wraps the Chart component with card styling and loading states.
=======
 * ProgressChart component wraps the Chart component with loading, error, and empty states.
 * Provides consistent chart display for progress analytics.
>>>>>>> Stashed changes
 */
export const ProgressChart: React.FC<ProgressChartProps> = ({
  title,
  data,
<<<<<<< Updated upstream
  loading = false,
  type = "area",
  color,
  height = 240,
  labelFormatter,
  valueFormatter,
  className,
  style,
}) => {
  const { t } = useTranslation("common");

  if (loading) {
    return (
      <Card className={className} style={style}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton width="100%" height={height} />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className} style={style}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
=======
  type = "area",
  color = "rgba(52, 211, 153, 1)",
  valueFormatter,
  height = 240,
  loading = false,
  error = null,
  onRetry,
  emptyMessage,
  dateRange,
}) => {
  const { t } = useTranslation("common");

  const chartErrorFallback = (
    <div
      style={{
        padding: "2rem",
        textAlign: "center",
        color: "var(--color-text-secondary)",
        background: "rgba(248, 113, 113, 0.1)",
        borderRadius: "12px",
        border: "1px solid rgba(248, 113, 113, 0.3)",
      }}
    >
      <p style={{ margin: 0, marginBottom: "1rem" }}>
        {t("progress.chartRenderFailed") || `Failed to render ${title} chart`}
      </p>
      {onRetry && (
        <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
          {t("progress.retry")}
        </Button>
      )}
    </div>
  );

  return (
    <Card>
      <CardContent>
        <div className="flex flex--justify-between flex--align-center mb-md">
          <strong className="text-lg">{title}</strong>
          {dateRange && (
            <span className="text-sm text-secondary">
              {dateRange.from} → {dateRange.to}
            </span>
          )}
        </div>
        {loading ? (
          <Skeleton width="100%" height={`${height}px`} />
        ) : error ? (
>>>>>>> Stashed changes
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
<<<<<<< Updated upstream
              color: "var(--color-text-muted)",
            }}
          >
            {t("progress.noChartData") || "No data available"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} style={style}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Chart
          data={data}
          type={type}
          height={height}
          color={color}
          labelFormatter={labelFormatter}
          valueFormatter={valueFormatter}
        />
=======
              color: "var(--color-text-secondary)",
              background: "rgba(248, 113, 113, 0.1)",
              borderRadius: "12px",
              border: "1px solid rgba(248, 113, 113, 0.3)",
            }}
          >
            <p style={{ margin: 0, marginBottom: "1rem" }}>{t("progress.failedToLoad")}</p>
            {onRetry && (
              <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
                {t("progress.retry")}
              </Button>
            )}
          </div>
        ) : data.length > 0 ? (
          <ErrorBoundary fallback={chartErrorFallback}>
            <Chart
              data={data}
              type={type}
              height={height}
              color={color}
              valueFormatter={valueFormatter}
            />
          </ErrorBoundary>
        ) : (
          <div
            style={{
              height: `${height}px`,
              display: "grid",
              placeItems: "center",
              color: "var(--color-text-muted)",
              border: "1px solid var(--color-border)",
              borderRadius: "12px",
            }}
          >
            {emptyMessage || t("progress.noData")}
          </div>
        )}
>>>>>>> Stashed changes
      </CardContent>
    </Card>
  );
};
