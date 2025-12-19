import React from "react";

export type BadgeVariant =
<<<<<<< Updated upstream
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
=======
>>>>>>> Stashed changes
  | "planned"
  | "completed"
  | "strength"
  | "agility"
  | "endurance"
  | "explosivity"
  | "intelligence"
<<<<<<< Updated upstream
  | "regeneration";
=======
  | "regeneration"
  | "success"
  | "info"
  | "warning"
  | "danger";
>>>>>>> Stashed changes

export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
}

<<<<<<< Updated upstream
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

=======
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
const baseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "var(--radius-lg)",
  fontWeight: 600,
  letterSpacing: "0.02em",
  whiteSpace: "nowrap",
  boxShadow: "var(--shadow-e1)",
};

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  planned: {
    background: "linear-gradient(90deg, #6366F1, #A855F7)",
    color: "#FFFFFF",
  },
  completed: {
    background: "var(--color-completed)",
    color: "#FFFFFF",
  },
  strength: {
    background: "rgba(251, 149, 29, 0.2)",
    color: "var(--vibe-strength)",
    border: `1px solid rgba(251, 149, 29, 0.3)`,
  },
  agility: {
    background: "rgba(250, 233, 25, 0.2)",
    color: "var(--vibe-agility)",
    border: `1px solid rgba(250, 233, 25, 0.3)`,
  },
  endurance: {
    background: "rgba(0, 35, 34, 0.2)",
    color: "var(--vibe-endurance)",
    border: `1px solid rgba(0, 35, 34, 0.3)`,
  },
  explosivity: {
    background: "rgba(159, 36, 6, 0.2)",
    color: "var(--vibe-explosivity)",
    border: `1px solid rgba(159, 36, 6, 0.3)`,
  },
  intelligence: {
    background: "rgba(0, 24, 23, 0.2)",
    color: "var(--vibe-intelligence)",
    border: `1px solid rgba(0, 24, 23, 0.3)`,
  },
  regeneration: {
    background: "rgba(21, 82, 58, 0.2)",
    color: "var(--vibe-regeneration)",
    border: `1px solid rgba(21, 82, 58, 0.3)`,
  },
  success: {
    background: "var(--color-success-bg)",
    color: "var(--color-success-text)",
    border: `1px solid var(--color-success-border)`,
  },
  info: {
    background: "var(--color-info-bg)",
    color: "var(--color-info-text)",
    border: `1px solid var(--color-info-border)`,
  },
  warning: {
    background: "var(--color-warning-bg)",
    color: "var(--color-warning-text)",
    border: `1px solid var(--color-warning-border)`,
  },
  danger: {
    background: "var(--color-danger-bg)",
    color: "var(--color-danger-text)",
    border: `1px solid var(--color-danger-border)`,
  },
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "info",
  size = "md",
  children,
  className,
  style,
  ...props
}) => {
  const computedStyle: React.CSSProperties = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
>>>>>>> Stashed changes
    ...style,
  };

  return (
<<<<<<< Updated upstream
    <span style={badgeStyle} {...rest}>
=======
    <span className={className} style={computedStyle} {...props}>
>>>>>>> Stashed changes
      {children}
    </span>
  );
};
