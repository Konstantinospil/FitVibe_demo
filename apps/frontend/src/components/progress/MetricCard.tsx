import React from "react";
import { Card, CardContent } from "../ui/Card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { DashboardSummaryMetric } from "../../services/api";
import Skeleton from "../ui/Skeleton";

export interface MetricCardProps {
  metric?: DashboardSummaryMetric;
  key?: string;
  label?: string;
  value?: string | number;
  trend?: string;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * MetricCard component displays a single metric with optional trend indicator.
 * Used in progress dashboard to show key statistics.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  metric: metricProp,
  key: _key,
  label,
  value,
  trend,
  loading = false,
  className,
  style,
}) => {
  const metric = metricProp || {
    id: _key || "",
    label: label || "",
    value: value || 0,
    trend: trend as "up" | "down" | "neutral" | undefined,
  };
  if (loading) {
    return (
      <Card className={className} style={style}>
        <CardContent>
          <Skeleton width="100%" height="80px" />
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    if (!metric.trend) {
      return null;
    }
    if (metric.trend === "up") {
      return <TrendingUp size={16} style={{ color: "var(--color-success)" }} />;
    }
    if (metric.trend === "down") {
      return <TrendingDown size={16} style={{ color: "var(--color-danger)" }} />;
    }
    return <Minus size={16} style={{ color: "var(--color-text-muted)" }} />;
  };

  return (
    <Card className={className} style={style}>
      <CardContent>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
                fontWeight: 500,
              }}
            >
              {metric.label}
            </span>
            {getTrendIcon()}
          </div>
          <div
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: 600,
              color: "var(--color-text-primary)",
            }}
          >
            {typeof metric.value === "number" ? metric.value.toLocaleString() : metric.value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
