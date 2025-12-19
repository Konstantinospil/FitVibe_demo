import React from "react";
import { useTranslation } from "react-i18next";
<<<<<<< Updated upstream
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";

export type AlertVariant = "success" | "error" | "warning" | "info" | "danger";
=======

export type AlertVariant = "success" | "info" | "warning" | "danger";
>>>>>>> Stashed changes

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
<<<<<<< Updated upstream
  onClose?: () => void;
  dismissible?: boolean;
=======
  dismissible?: boolean;
  onDismiss?: () => void;
>>>>>>> Stashed changes
}

const variantStyles: Record<AlertVariant, React.CSSProperties> = {
  success: {
    background: "var(--color-success-bg)",
    color: "var(--color-success-text)",
    borderColor: "var(--color-success-border)",
  },
<<<<<<< Updated upstream
  error: {
    background: "var(--color-danger-bg)",
    color: "var(--color-danger-text)",
    borderColor: "var(--color-danger-border)",
=======
  info: {
    background: "var(--color-info-bg)",
    color: "var(--color-info-text)",
    borderColor: "var(--color-info-border)",
>>>>>>> Stashed changes
  },
  warning: {
    background: "var(--color-warning-bg)",
    color: "var(--color-warning-text)",
    borderColor: "var(--color-warning-border)",
  },
<<<<<<< Updated upstream
  info: {
    background: "var(--color-info-bg)",
    color: "var(--color-info-text)",
    borderColor: "var(--color-info-border)",
  },
=======
>>>>>>> Stashed changes
  danger: {
    background: "var(--color-danger-bg)",
    color: "var(--color-danger-text)",
    borderColor: "var(--color-danger-border)",
  },
};

<<<<<<< Updated upstream
const iconMap: Record<AlertVariant, React.ReactNode> = {
  success: <CheckCircle size={20} />,
  error: <AlertCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />,
  danger: <AlertCircle size={20} />,
};

/**
 * Alert component for displaying feedback messages (WCAG 2.2 AA).
 * Supports success, error, warning, info, and danger variants.
 */
=======
const baseStyle: React.CSSProperties = {
  padding: "var(--space-md) var(--space-lg)",
  borderRadius: "var(--radius-xl)",
  border: "1px solid",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
};

>>>>>>> Stashed changes
export const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  children,
<<<<<<< Updated upstream
  onClose,
  dismissible = false,
  style,
  ...rest
}) => {
  const { t } = useTranslation("common");

  const alertStyle: React.CSSProperties = {
    padding: "var(--space-md)",
    borderRadius: "var(--radius-md)",
    border: "1px solid",
    display: "flex",
    gap: "var(--space-sm)",
    alignItems: "flex-start",
=======
  dismissible = false,
  onDismiss,
  className,
  style,
  ...props
}) => {
  const { t } = useTranslation("common");
  const isAssertive = variant === "danger" || variant === "warning";

  const computedStyle: React.CSSProperties = {
    ...baseStyle,
>>>>>>> Stashed changes
    ...variantStyles[variant],
    ...style,
  };

  return (
    <div
<<<<<<< Updated upstream
      role="alert"
      aria-live={variant === "error" || variant === "danger" ? "assertive" : "polite"}
      style={alertStyle}
      {...rest}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          marginTop: "0.125rem",
        }}
        aria-hidden="true"
      >
        {iconMap[variant]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <h4
            style={{
              margin: 0,
              marginBottom: "var(--space-xs)",
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
            }}
          >
            {title}
          </h4>
        )}
        <div style={{ fontSize: "var(--font-size-sm)", lineHeight: "var(--line-height-normal)" }}>
          {children}
        </div>
      </div>
      {(dismissible || onClose) && (
        <button
          type="button"
          onClick={onClose}
          aria-label={t("alert.close") || "Close alert"}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "inherit",
            opacity: 0.7,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            marginTop: "0.125rem",
          }}
        >
          <X size={18} />
        </button>
      )}
=======
      className={className}
      style={computedStyle}
      role={isAssertive ? "alert" : "status"}
      aria-live={isAssertive ? "assertive" : "polite"}
      {...props}
    >
      <div className="flex flex--justify-between flex--align-center">
        {title && (
          <h3
            className="text-md"
            style={{
              margin: 0,
              fontWeight: 600,
              color: "inherit",
            }}
          >
            {title}
          </h3>
        )}
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t("close")}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: "var(--space-xs)",
              marginLeft: "var(--space-md)",
              opacity: 0.7,
              transition: "opacity 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.7";
            }}
          >
            ×
          </button>
        )}
      </div>
      <div style={{ color: "inherit" }}>{children}</div>
>>>>>>> Stashed changes
    </div>
  );
};
