import React from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { DateRangePicker, type DateRange } from "../DateRangePicker";
import { Card, CardContent } from "../ui/Card";

export type ProgressGroupBy = "day" | "week" | "month";

export interface ProgressFiltersProps {
  rangeMode?: "preset" | "custom";
  period?: number;
  customRange?: DateRange;
  groupBy?: ProgressGroupBy;
  onRangeModeChange?: (mode: "preset" | "custom") => void;
  onPeriodChange?: (period: number) => void;
  onCustomRangeChange?: (range: DateRange) => void;
  onGroupByChange?: (groupBy: ProgressGroupBy) => void;
  onExport?: () => void;
  isExporting?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const periodOptions = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "365", label: "1 year" },
];

const groupByOptions = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/**
 * ProgressFilters component provides filtering options for progress analytics.
 * Supports preset periods, custom date ranges, and grouping options.
 */
export const ProgressFilters: React.FC<ProgressFiltersProps> = ({
  rangeMode = "preset",
  period = 30,
  customRange,
  groupBy = "week",
  onRangeModeChange,
  onPeriodChange,
  onCustomRangeChange,
  onGroupByChange,
  onExport,
  isExporting = false,
  className,
  style,
}) => {
  const { t } = useTranslation("common");

  return (
    <Card className={className} style={style}>
      <CardContent>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-md)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "var(--space-sm)",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Button
              variant={rangeMode === "preset" ? "primary" : "secondary"}
              size="sm"
              onClick={() => onRangeModeChange?.("preset")}
            >
              {t("progress.presetRange") || "Preset Range"}
            </Button>
            <Button
              variant={rangeMode === "custom" ? "primary" : "secondary"}
              size="sm"
              onClick={() => onRangeModeChange?.("custom")}
            >
              {t("progress.customRange") || "Custom Range"}
            </Button>
          </div>

          {rangeMode === "preset" ? (
            <Select
              label={t("progress.period") || "Period"}
              options={periodOptions}
              value={period.toString()}
              onChange={(e) => onPeriodChange?.(parseInt(e.target.value, 10))}
              fullWidth
            />
          ) : (
            customRange && (
              <DateRangePicker
                value={customRange}
                onChange={(range) => onCustomRangeChange?.(range)}
              />
            )
          )}

          <Select
            label={t("progress.groupBy") || "Group By"}
            options={groupByOptions}
            value={groupBy}
            onChange={(e) => onGroupByChange?.(e.target.value as ProgressGroupBy)}
            fullWidth
          />

          {onExport && (
            <Button
              variant="secondary"
              size="md"
              onClick={onExport}
              isLoading={isExporting}
              fullWidth
            >
              {t("progress.export") || "Export Data"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
