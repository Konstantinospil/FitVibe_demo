import React from "react";

export type BadgeVariant = "default" | "explosivity" | "primary" | "secondary";
export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    backgroundColor: "var(--color-surface-muted)",
    color: "var(--color-text-primary)",
  },
  explosivity: {
    backgroundColor: "var(--vibe-explosivity)",
    color: "var(--color-primary-on)",
  },
  primary: {
    backgroundColor: "var(--color-primary)",
    color: "var(--color-primary-on)",
  },
  secondary: {
    backgroundColor: "var(--color-secondary)",
    color: "var(--color-text-primary)",
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
    fontSize: "var(--font-size-base)",
  },
};

const baseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  fontWeight: 500,
  lineHeight: 1,
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  size = "md",
  children,
  className,
  style,
}) => {
  const computedStyle: React.CSSProperties = {
    ...baseStyle,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  };

  return (
    <span className={className} style={computedStyle}>
      {children}
    </span>
  );
};
