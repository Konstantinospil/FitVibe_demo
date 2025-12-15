import React from "react";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
  label?: string;
}

const sizeStyles: Record<SpinnerSize, React.CSSProperties> = {
  sm: {
    width: "1rem",
    height: "1rem",
    borderWidth: "2px",
  },
  md: {
    width: "1.5rem",
    height: "1.5rem",
    borderWidth: "2px",
  },
  lg: {
    width: "2rem",
    height: "2rem",
    borderWidth: "3px",
  },
};

/**
 * Spinner component for loading states (WCAG 2.2 AA).
 * Respects prefers-reduced-motion for accessibility.
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  className,
  style,
  "aria-label": ariaLabel = "Loading",
}) => {
  const spinnerStyle: React.CSSProperties = {
    display: "inline-block",
    borderRadius: "50%",
    borderStyle: "solid",
    borderColor: "var(--color-text-muted)",
    borderTopColor: "var(--color-primary)",
    animation: "spinner-rotate 0.6s linear infinite",
    ...sizeStyles[size],
    ...style,
  };

  return (
    <div role="status" aria-label={ariaLabel} className={className} style={spinnerStyle}>
      <style>
        {`
          @keyframes spinner-rotate {
            to {
              transform: rotate(360deg);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            [role="status"] {
              animation: none;
            }
          }
        `}
      </style>
    </div>
  );
};
