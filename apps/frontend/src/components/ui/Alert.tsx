import React from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";

export type AlertVariant = "success" | "error" | "warning" | "info" | "danger";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  dismissible?: boolean;
}

const variantStyles: Record<AlertVariant, React.CSSProperties> = {
  success: {
    background: "var(--color-success-bg)",
    color: "var(--color-success-text)",
    borderColor: "var(--color-success-border)",
  },
  error: {
    background: "var(--color-danger-bg)",
    color: "var(--color-danger-text)",
    borderColor: "var(--color-danger-border)",
  },
  warning: {
    background: "var(--color-warning-bg)",
    color: "var(--color-warning-text)",
    borderColor: "var(--color-warning-border)",
  },
  info: {
    background: "var(--color-info-bg)",
    color: "var(--color-info-text)",
    borderColor: "var(--color-info-border)",
  },
  danger: {
    background: "var(--color-danger-bg)",
    color: "var(--color-danger-text)",
    borderColor: "var(--color-danger-border)",
  },
};

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
export const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  children,
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
    ...variantStyles[variant],
    ...style,
  };

  return (
    <div
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
              marginBottom: title ? "var(--space-xs)" : 0,
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
    </div>
  );
};
