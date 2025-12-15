import React from "react";

export type BadgeVariant =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "planned"
  | "completed"
  | "strength"
  | "agility"
  | "endurance"
  | "explosivity"
  | "intelligence"
  | "regeneration";

export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    background: "var(--color-surface)",
    color: "var(--color-text-primary)",
    border: "1px solid var(--color-border)",
  },
  primary: {
    background: "var(--color-primary)",
    color: "var(--color-primary-on)",
  },
  secondary: {
    background: "var(--color-secondary)",
    color: "var(--color-secondary-on)",
  },
  success: {
    background: "var(--color-success-bg)",
    color: "var(--color-success-text)",
    border: "1px solid var(--color-success-border)",
  },
  warning: {
    background: "var(--color-warning-bg)",
    color: "var(--color-warning-text)",
    border: "1px solid var(--color-warning-border)",
  },
  danger: {
    background: "var(--color-danger-bg)",
    color: "var(--color-danger-text)",
    border: "1px solid var(--color-danger-border)",
  },
  info: {
    background: "var(--color-info-bg)",
    color: "var(--color-info-text)",
    border: "1px solid var(--color-info-border)",
  },
  planned: {
    background: "linear-gradient(90deg, #6366F1, #A855F7)",
    color: "#FFFFFF",
  },
  completed: {
    background: "#22C55E",
    color: "#FFFFFF",
  },
  strength: {
    background: "#8B4513",
    color: "#FFFFFF",
  },
  agility: {
    background: "#87CEEB",
    color: "#000000",
  },
  endurance: {
    background: "#1E90FF",
    color: "#FFFFFF",
  },
  explosivity: {
    background: "#FF4500",
    color: "#FFFFFF",
  },
  intelligence: {
    background: "#4B0082",
    color: "#FFFFFF",
  },
  regeneration: {
    background: "#9370DB",
    color: "#FFFFFF",
  },
};

const sizeStyles: Record<BadgeSize, React.CSSProperties> = {
  sm: {
    padding: "0.25rem 0.5rem",
    fontSize: "var(--font-size-xs)",
  },
  md: {
    padding: "0.375rem 0.75rem",
    fontSize: "var(--font-size-sm)",
  },
  lg: {
    padding: "0.5rem 1rem",
    fontSize: "var(--font-size-md)",
  },
};

/**
 * Badge component for status indicators and tags (WCAG 2.2 AA).
 * Supports planned/completed states and vibe colors.
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  size = "md",
  children,
  style,
  ...rest
}) => {
  const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-sm)",
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: "nowrap",
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  };

  return (
    <span style={badgeStyle} {...rest}>
      {children}
    </span>
  );
};
