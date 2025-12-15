import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Chart, type ChartDatum } from "../ui/Chart";
import Skeleton from "../ui/Skeleton";

export interface ProgressChartProps {
  title: string;
  data: ChartDatum[];
  loading?: boolean;
  type?: "area" | "bar";
  color?: string;
  height?: number;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number) => string;
  className?: string;
  style?: React.CSSProperties;
  dateRange?: { from: string; to: string };
}

/**
 * ProgressChart component displays progress data in a chart format.
 * Wraps the Chart component with card styling and loading states.
 */
export const ProgressChart: React.FC<ProgressChartProps> = ({
  title,
  data,
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
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
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
      </CardContent>
    </Card>
  );
};
