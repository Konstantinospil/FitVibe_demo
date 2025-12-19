import React from "react";
import { useTranslation } from "react-i18next";
<<<<<<< Updated upstream
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { DateRangePicker, type DateRange } from "../DateRangePicker";
import { Card, CardContent } from "../ui/Card";
=======
import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import DateRangePicker, { type DateRange } from "../DateRangePicker";
>>>>>>> Stashed changes

export type ProgressGroupBy = "day" | "week" | "month";

export interface ProgressFiltersProps {
<<<<<<< Updated upstream
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
=======
  rangeMode: "preset" | "custom";
  onRangeModeChange: (mode: "preset" | "custom") => void;
  period: number;
  onPeriodChange: (period: number) => void;
  customRange: DateRange;
  onCustomRangeChange: (range: DateRange) => void;
  groupBy: ProgressGroupBy;
  onGroupByChange: (groupBy: ProgressGroupBy) => void;
  onExport?: () => void;
  isExporting?: boolean;
}

/**
 * ProgressFilters component for filtering progress data.
 * Supports preset periods, custom date ranges, and grouping options.
 */
export const ProgressFilters: React.FC<ProgressFiltersProps> = ({
  rangeMode,
  onRangeModeChange,
  period,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
  groupBy,
  onGroupByChange,
  onExport,
  isExporting = false,
}) => {
  const { t } = useTranslation("common");

  const selectStyle: React.CSSProperties = {
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
    background: "var(--color-input-bg)",
    color: "var(--color-text-primary)",
    fontSize: "0.9rem",
    cursor: "pointer",
  };

  return (
    <Card>
      <CardContent>
        <div className="flex flex--column flex--gap-md">
          {/* Range Mode Toggle */}
          <div className="flex flex--gap-sm">
            <Button
              type="button"
              variant={rangeMode === "preset" ? "primary" : "ghost"}
              size="sm"
              onClick={() => onRangeModeChange("preset")}
            >
              {t("progress.presetRange")}
            </Button>
            <Button
              type="button"
              variant={rangeMode === "custom" ? "primary" : "ghost"}
              size="sm"
              onClick={() => onRangeModeChange("custom")}
            >
              {t("progress.customRange")}
            </Button>
          </div>

          {/* Controls Row */}
          <div
            className="flex flex--justify-between flex--align-center flex--wrap"
            style={{ gap: "1rem" }}
          >
            <div className="flex flex--gap-md flex--align-center flex--wrap">
              {rangeMode === "preset" ? (
                <label className="flex flex--align-center flex--gap-sm">
                  <span className="text-sm text-secondary">{t("progress.period")}:</span>
                  <select
                    style={selectStyle}
                    value={period}
                    onChange={(e) => onPeriodChange(Number(e.target.value))}
                  >
                    <option value={7}>{t("progress.7days")}</option>
                    <option value={30}>{t("progress.30days")}</option>
                    <option value={90}>{t("progress.90days")}</option>
                  </select>
                </label>
              ) : (
                <DateRangePicker value={customRange} onChange={onCustomRangeChange} />
              )}
              <label className="flex flex--align-center flex--gap-sm">
                <span className="text-sm text-secondary">{t("progress.groupBy")}:</span>
                <select
                  style={selectStyle}
                  value={groupBy}
                  onChange={(e) => onGroupByChange(e.target.value as ProgressGroupBy)}
                >
                  <option value="day">{t("progress.daily")}</option>
                  <option value="week">{t("progress.weekly")}</option>
                  <option value="month">{t("progress.monthly") || "Monthly"}</option>
                </select>
              </label>
            </div>
            {onExport && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onExport}
                isLoading={isExporting}
                disabled={isExporting}
              >
                {t("progress.exportCsv")}
              </Button>
            )}
          </div>
>>>>>>> Stashed changes
        </div>
      </CardContent>
    </Card>
  );
};
