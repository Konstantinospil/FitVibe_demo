import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Pin, PinOff } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getVibePoints } from "../../services/api";
import { TYPE_CODE_TO_VIBE, type VibeKey } from "../../constants/vibes";
import strengthIcon from "../../assets/icons/earth-strength.svg";
import agilityIcon from "../../assets/icons/air-agility.svg";
import enduranceIcon from "../../assets/icons/water-endurance.svg";
import explosivityIcon from "../../assets/icons/fire-explosivity.svg";
import intelligenceIcon from "../../assets/icons/shadow-intelligence.svg";
import regenerationIcon from "../../assets/icons/aether-regeneration.svg";

type VibeConfig = {
  key: VibeKey;
  icon: string;
  colorVar: string;
  textColorVar: string;
};

const VIBE_CONFIG: VibeConfig[] = [
  {
    key: "strength",
    icon: strengthIcon,
    colorVar: "--vibe-strength",
    textColorVar: "--color-primary-on",
  },
  {
    key: "agility",
    icon: agilityIcon,
    colorVar: "--vibe-agility",
    textColorVar: "--color-primary-on",
  },
  {
    key: "endurance",
    icon: enduranceIcon,
    colorVar: "--vibe-endurance",
    textColorVar: "--color-secondary-on",
  },
  {
    key: "explosivity",
    icon: explosivityIcon,
    colorVar: "--vibe-explosivity",
    textColorVar: "--color-secondary-on",
  },
  {
    key: "intelligence",
    icon: intelligenceIcon,
    colorVar: "--vibe-intelligence",
    textColorVar: "--color-secondary-on",
  },
  {
    key: "regeneration",
    icon: regenerationIcon,
    colorVar: "--vibe-regeneration",
    textColorVar: "--color-secondary-on",
  },
];

const buildLinePath = (values: number[], width: number, height: number, padding: number) => {
  if (values.length === 0) {
    return "";
  }

  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = Math.max(maxValue - minValue, 1);
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const step = chartWidth / Math.max(values.length - 1, 1);

  return values
    .map((value, index) => {
      const x = padding + index * step;
      const normalized = (value - minValue) / range;
      const y = padding + (1 - normalized) * chartHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
};

const SidebarTrendChart: React.FC<{
  values: number[];
  strokeColor: string;
  labels: string[];
}> = ({ values, strokeColor, labels }) => {
  const width = 220;
  const height = 120;
  const padding = 12;
  const path = useMemo(() => buildLinePath(values, width, height, padding), [values]);
  const lastPoint = useMemo(() => {
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = Math.max(maxValue - minValue, 1);
    if (values.length === 0) {
      return { x: width - padding, y: height - padding };
    }
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const step = chartWidth / Math.max(values.length - 1, 1);
    const lastIndex = values.length - 1;
    const normalized = (values[lastIndex] - minValue) / range;
    return {
      x: padding + lastIndex * step,
      y: padding + (1 - normalized) * chartHeight,
    };
  }, [values]);

  return (
    <div style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="120" role="img">
        <title>Annual score trend</title>
        <desc>Line chart showing score progression across months.</desc>
        {[0, 1, 2].map((index) => {
          const y = padding + (index / 2) * (height - padding * 2);
          return (
            <line
              key={index}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="var(--color-border-strong)"
              strokeWidth="1"
            />
          );
        })}
        <path d={path} fill="none" stroke={strokeColor} strokeWidth="2.5" />
        <circle cx={lastPoint.x} cy={lastPoint.y} r="3" fill={strokeColor} />
      </svg>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))`,
          gap: "0.1rem",
          fontSize: "0.65rem",
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {labels.map((label) => (
          <span key={label} style={{ textAlign: "center" }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

const VibeSidebar: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeMetric, setActiveMetric] = useState<"overall" | VibeKey>("overall");
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const { data: vibePoints } = useQuery({
    queryKey: ["vibePoints", 12],
    queryFn: () => getVibePoints(12),
  });

  const displayName = user?.displayName || user?.username || t("navigation.you") || "You";
  const isExpanded = isPinned || isHovered;
  const overallScore = vibePoints?.overall?.points ?? 0;
  const monthLabels = useMemo(() => {
    if (!vibePoints?.months?.length) {
      return Array.from({ length: 12 }, (_, index) => `M${index + 1}`);
    }
    return vibePoints.months.map((month) => {
      const date = new Date(`${month}-01T00:00:00Z`);
      return date.toLocaleString("en-US", { month: "short" });
    });
  }, [vibePoints?.months]);

  const activeConfig = useMemo(() => {
    const emptyTrend = Array.from({ length: monthLabels.length }, () => 0);
    if (activeMetric === "overall") {
      const overallTrend = vibePoints?.overall?.trend?.map((point) => point.points) ?? emptyTrend;
      return {
        label: "Overall",
        score: vibePoints?.overall?.points ?? 0,
        color: "var(--color-accent)",
        trend: overallTrend,
      };
    }
    const vibe = VIBE_CONFIG.find((item) => item.key === activeMetric);
    const vibeSeries = vibePoints?.vibes.find((entry) => {
      const mappedKey = TYPE_CODE_TO_VIBE[entry.type_code];
      return mappedKey === activeMetric;
    });
    return {
      label: vibe ? t(`vibes.${vibe.key}.name`) : "Vibe",
      score: vibeSeries?.points ?? 0,
      color: vibe ? `var(${vibe.colorVar})` : "var(--color-accent)",
      trend: vibeSeries?.trend?.map((point) => point.points) ?? emptyTrend,
    };
  }, [activeMetric, monthLabels.length, t, vibePoints]);

  return (
    <aside
      aria-label="Vibe performance sidebar"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setIsHovered(false);
        }
      }}
      style={{
        width: isExpanded ? "320px" : "72px",
        transition: "width 200ms ease",
        background: "var(--color-bg-card)",
        borderLeft: "1px solid var(--color-border)",
        boxShadow: isExpanded ? "var(--shadow-e2)" : "none",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: isExpanded ? "1.25rem 1rem 0.5rem" : "1rem 0.5rem 0.75rem",
          display: "grid",
          gap: isExpanded ? "1rem" : "0.75rem",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveMetric("overall")}
          aria-label={!isExpanded ? "Overall fitness score" : undefined}
          style={{
            border: isExpanded ? "1px solid var(--color-border)" : "none",
            borderRadius: isExpanded ? "var(--radius-lg)" : "var(--radius-xl)",
            padding: isExpanded ? "0.85rem" : "0.35rem",
            background: isExpanded ? "var(--color-surface)" : "var(--color-accent)",
            textAlign: isExpanded ? "left" : "center",
            cursor: "pointer",
            display: "grid",
            gap: isExpanded ? "0.35rem" : "0",
            color: isExpanded ? "var(--color-text-primary)" : "var(--color-primary-on)",
            height: isExpanded ? "auto" : "72px",
            placeItems: isExpanded ? "initial" : "center",
            fontWeight: isExpanded ? 600 : 700,
            fontSize: isExpanded ? "inherit" : "1.6rem",
          }}
        >
          {isExpanded ? (
            <>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {displayName}
              </span>
              <span
                style={{
                  fontSize: "0.85rem",
                  letterSpacing: "var(--letter-spacing-wide)",
                  textTransform: "uppercase",
                }}
              >
                Overall Fitness
              </span>
              <span style={{ fontSize: "2.1rem", fontWeight: 600 }}>{overallScore}</span>
            </>
          ) : (
            <span>{overallScore}</span>
          )}
        </button>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {VIBE_CONFIG.map((vibe) => {
            const isActive = activeMetric === vibe.key;
            const vibeSeries = vibePoints?.vibes.find((entry) => {
              const mappedKey = TYPE_CODE_TO_VIBE[entry.type_code];
              return mappedKey === vibe.key;
            });
            return (
              <button
                key={vibe.key}
                type="button"
                onClick={() => setActiveMetric(vibe.key)}
                aria-label={!isExpanded ? `${t(`vibes.${vibe.key}.name`)} score` : undefined}
                style={{
                  display: "grid",
                  gridTemplateColumns: isExpanded ? "40px 1fr" : "1fr",
                  alignItems: "center",
                  gap: isExpanded ? "0.75rem" : "0",
                  padding: isExpanded ? "0.5rem 0.6rem" : "0.3rem",
                  borderRadius: isExpanded ? "var(--radius-md)" : "var(--radius-full)",
                  border: isExpanded
                    ? isActive
                      ? `1px solid var(${vibe.colorVar})`
                      : "1px solid transparent"
                    : "none",
                  background: isExpanded
                    ? isActive
                      ? "var(--color-surface-muted)"
                      : "transparent"
                    : `var(${vibe.colorVar})`,
                  color: isExpanded ? "var(--color-text-primary)" : `var(${vibe.textColorVar})`,
                  cursor: "pointer",
                  height: isExpanded ? "auto" : "48px",
                  justifyItems: isExpanded ? "initial" : "center",
                  fontWeight: isExpanded ? 600 : 700,
                  fontSize: isExpanded ? "inherit" : "0.95rem",
                  boxShadow:
                    !isExpanded && isActive
                      ? `0 0 0 2px var(--color-bg-card), 0 0 0 4px var(${vibe.colorVar})`
                      : "none",
                }}
              >
                {isExpanded ? (
                  <>
                    <span
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: `var(${vibe.colorVar})`,
                        boxShadow: isActive ? `0 0 0 2px var(${vibe.colorVar})` : "none",
                      }}
                    >
                      <img src={vibe.icon} alt="" style={{ width: "22px", height: "22px" }} />
                    </span>
                    <span style={{ display: "grid", textAlign: "left" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                        {t(`vibes.${vibe.key}.name`)}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        {vibeSeries?.points ?? 0} pts
                      </span>
                    </span>
                  </>
                ) : (
                  <span>{vibeSeries?.points ?? 0}</span>
                )}
              </button>
            );
          })}
        </div>
        {isExpanded && (
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-muted)",
              display: "grid",
              gap: "0.6rem",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}
            >
              <span
                style={{
                  fontSize: "0.85rem",
                  textTransform: "uppercase",
                  letterSpacing: "var(--letter-spacing-wide)",
                }}
              >
                Annual Development
              </span>
              <span style={{ fontSize: "1.1rem", fontWeight: 600 }}>{activeConfig.score}</span>
            </div>
            <SidebarTrendChart
              values={activeConfig.trend}
              strokeColor={activeConfig.color}
              labels={monthLabels}
            />
          </div>
        )}
      </div>
      <div
        style={{ marginTop: "auto", padding: "0.75rem", display: "flex", justifyContent: "center" }}
      >
        <button
          type="button"
          onClick={() => setIsPinned((prev) => !prev)}
          aria-pressed={isPinned}
          aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
          title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text-primary)",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
          }}
        >
          {isPinned ? <PinOff size={18} /> : <Pin size={18} />}
        </button>
      </div>
    </aside>
  );
};

export default VibeSidebar;
