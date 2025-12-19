import React from "react";
<<<<<<< Updated upstream
=======
import { useTranslation } from "react-i18next";
>>>>>>> Stashed changes

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  error?: boolean;
<<<<<<< Updated upstream
  children: React.ReactNode;
}

export const Label: React.FC<LabelProps> = ({ required, error, children, ...props }) => {
  return (
    <label
      {...props}
      style={{
        fontSize: "var(--font-size-sm)",
        fontWeight: 500,
        color: error ? "var(--color-danger)" : "var(--color-text-primary)",
        ...props.style,
      }}
    >
      {children}
      {required && <span style={{ color: "var(--color-danger)", marginLeft: "0.25rem" }}>*</span>}
=======
}

/**
 * Label component for form fields with required indicator and error state support.
 * Provides consistent styling and accessibility attributes.
 */
export const Label: React.FC<LabelProps> = ({
  children,
  required,
  error,
  className,
  style,
  ...props
}) => {
  const { t } = useTranslation("common");

  const labelStyle: React.CSSProperties = {
    color: error ? "var(--color-danger-text)" : "var(--color-text-primary)",
    fontWeight: 500,
    fontSize: "var(--font-size-sm)",
    display: "block",
    marginBottom: "var(--space-xs)",
    ...style,
  };

  return (
    <label className={className} style={labelStyle} {...props}>
      {children}
      {required && (
        <span
          className="text-danger-text"
          style={{ marginLeft: "var(--space-xs)" }}
          aria-label={t("validation.required")}
        >
          *
        </span>
      )}
>>>>>>> Stashed changes
    </label>
  );
};
