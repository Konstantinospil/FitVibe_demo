import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";

export type InputSize = "sm" | "md" | "lg";
export type InputVariant = "default" | "filled";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: InputSize;
  variant?: InputVariant;
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const sizeStyles: Record<InputSize, React.CSSProperties> = {
  sm: {
    padding: "0.5rem 0.75rem",
    fontSize: "var(--font-size-sm)",
  },
  md: {
    padding: "0.75rem 1rem",
    fontSize: "var(--font-size-md)",
  },
  lg: {
    padding: "1rem 1.25rem",
    fontSize: "var(--font-size-lg)",
  },
};

const baseStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--color-input-bg)",
  border: "1px solid var(--color-input-border)",
  borderRadius: "var(--radius-md)",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-family-base)",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
  outline: "none",
};

/**
 * Input component for text, number, email, password inputs (WCAG 2.2 AA).
 * Supports validation states, helper text, and accessibility features.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = "md",
      variant: _variant = "default",
      label,
      error,
      helperText,
      fullWidth = true,
      style,
      className,
      id,
      ...rest
    },
    ref,
  ) => {
    const { t } = useTranslation("common");
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    const inputStyle: React.CSSProperties = {
      ...baseStyle,
      ...sizeStyles[size],
      ...(error
        ? {
            borderColor: "var(--color-danger)",
            boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.1)",
          }
        : {}),
      ...(rest.disabled
        ? {
            opacity: 0.6,
            cursor: "not-allowed",
          }
        : {}),
      ...(fullWidth ? {} : { width: "auto" }),
      ...style,
    };

    return (
      <div className={className} style={{ width: fullWidth ? "100%" : "auto" }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              display: "block",
              marginBottom: "var(--space-xs)",
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
              color: error ? "var(--color-danger)" : "var(--color-text-primary)",
            }}
          >
            {label}
            {rest.required && (
              <span
                aria-label={t("form.required") || "required"}
                style={{ color: "var(--color-danger)", marginLeft: "0.25rem" }}
              >
                *
              </span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={errorId || helperId || undefined}
          aria-errormessage={errorId}
          style={inputStyle}
          {...rest}
        />
        {error && (
          <div
            id={errorId}
            role="alert"
            style={{
              marginTop: "var(--space-xs)",
              fontSize: "var(--font-size-xs)",
              color: "var(--color-danger)",
            }}
          >
            {error}
          </div>
        )}
        {helperText && !error && (
          <div
            id={helperId}
            style={{
              marginTop: "var(--space-xs)",
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-muted)",
            }}
          >
            {helperText}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
