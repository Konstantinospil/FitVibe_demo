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
};

const VIBE_CONFIG: VibeConfig[] = [
  {
    key: "strength",
    icon: strengthIcon,
    colorVar: "--vibe-strength",
  },
  {
    key: "agility",
    icon: agilityIcon,
    colorVar: "--vibe-agility",
  },
  {
    key: "endurance",
    icon: enduranceIcon,
    colorVar: "--vibe-endurance",
  },
  {
    key: "explosivity",
    icon: explosivityIcon,
    colorVar: "--vibe-explosivity",
  },
  {
    key: "intelligence",
    icon: intelligenceIcon,
    colorVar: "--vibe-intelligence",
  },
  {
    key: "regeneration",
    icon: regenerationIcon,
    colorVar: "--vibe-regeneration",
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
              stroke="rgba(255, 255, 255, 0.08)"
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
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { data: vibePoints } = useQuery({
    queryKey: ["vibePoints", 12],
    queryFn: () => getVibePoints(12),
  });

  const displayName = user?.username || t("navigation.you") || "You";
  const isExpanded = isPinned || isHovered;
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
        borderRight: "1px solid var(--color-border)",
        boxShadow: isExpanded ? "var(--shadow-e2)" : "none",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "1.25rem 1rem 0.5rem", display: "grid", gap: "1rem" }}>
        <button
          type="button"
          onClick={() => setActiveMetric("overall")}
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "18px",
            padding: "0.85rem",
            background: "var(--color-surface)",
            textAlign: "left",
            cursor: "pointer",
            display: "grid",
            gap: "0.35rem",
            color: "var(--color-text-primary)",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            {displayName}
          </span>
          <span
            style={{ fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            Overall Fitness
          </span>
          <span style={{ fontSize: "2.1rem", fontWeight: 600 }}>
            {vibePoints?.overall?.points ?? 0}
          </span>
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
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.5rem 0.6rem",
                  borderRadius: "14px",
                  border: isActive ? `1px solid var(${vibe.colorVar})` : "1px solid transparent",
                  background: isActive ? "rgba(255, 255, 255, 0.04)" : "transparent",
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                }}
              >
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
              </button>
            );
          })}
        </div>
        <div
          style={{
            padding: "0.75rem",
            borderRadius: "16px",
            border: "1px solid var(--color-border)",
            background: "rgba(255, 255, 255, 0.02)",
            display: "grid",
            gap: "0.6rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span
              style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.08em" }}
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
