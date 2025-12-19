import React from "react";

export type SpinnerSize = "sm" | "md" | "lg";

<<<<<<< Updated upstream
export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
=======
export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    borderWidth: "2px",
=======
    borderWidth: "3px",
>>>>>>> Stashed changes
  },
  lg: {
    width: "2rem",
    height: "2rem",
<<<<<<< Updated upstream
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
=======
    borderWidth: "4px",
  },
};

const baseStyle: React.CSSProperties = {
  display: "inline-block",
  borderRadius: "50%",
  borderStyle: "solid",
  borderColor: "rgba(255, 255, 255, 0.2)",
  borderTopColor: "var(--color-text-primary)",
  animation: "spinner-rotate 0.6s linear infinite",
};

// Add keyframes if not already in global.css
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spinner-rotate {
      to {
        transform: rotate(360deg);
      }
    }
  `;
  if (!document.head.querySelector("style[data-spinner-keyframes]")) {
    style.setAttribute("data-spinner-keyframes", "true");
    document.head.appendChild(style);
  }
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  label,
  className,
  style,
  ...props
}) => {
  const computedStyle: React.CSSProperties = {
    ...baseStyle,
>>>>>>> Stashed changes
    ...sizeStyles[size],
    ...style,
  };

  return (
<<<<<<< Updated upstream
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
=======
    <div
      className={className}
      style={computedStyle}
      role="status"
      aria-label={label || "Loading"}
      aria-live="polite"
      {...props}
    >
      {label && (
        <span
          className="sr-only"
          style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden" }}
        >
          {label}
        </span>
      )}
>>>>>>> Stashed changes
    </div>
  );
};
