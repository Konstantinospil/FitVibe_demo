import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";

export type InputSize = "sm" | "md" | "lg";
<<<<<<< Updated upstream
export type InputVariant = "default" | "filled";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: InputSize;
  variant?: InputVariant;
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
=======
export type InputVariant = "default" | "error";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: InputSize;
  variant?: InputVariant;
>>>>>>> Stashed changes
}

const sizeStyles: Record<InputSize, React.CSSProperties> = {
  sm: {
<<<<<<< Updated upstream
    padding: "0.5rem 0.75rem",
    fontSize: "var(--font-size-sm)",
  },
  md: {
    padding: "0.75rem 1rem",
    fontSize: "var(--font-size-md)",
  },
  lg: {
    padding: "1rem 1.25rem",
=======
    padding: "var(--space-xs) var(--space-sm)",
    fontSize: "var(--font-size-sm)",
  },
  md: {
    padding: "var(--space-sm) var(--space-md)",
    fontSize: "var(--font-size-md)",
  },
  lg: {
    padding: "var(--space-md) var(--space-lg)",
>>>>>>> Stashed changes
    fontSize: "var(--font-size-lg)",
  },
};

const baseStyle: React.CSSProperties = {
  width: "100%",
<<<<<<< Updated upstream
  background: "var(--color-input-bg)",
  border: "1px solid var(--color-input-border)",
  borderRadius: "var(--radius-md)",
=======
  borderRadius: "var(--radius-xl)",
  border: "1px solid var(--color-border)",
  background: "var(--color-input-bg)",
>>>>>>> Stashed changes
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-family-base)",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
  outline: "none",
};

<<<<<<< Updated upstream
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
=======
const focusStyle: React.CSSProperties = {
  borderColor: "var(--color-highlight)",
  boxShadow: "var(--focus-glow)",
};

const errorStyle: React.CSSProperties = {
  borderColor: "var(--color-danger-border)",
};

const disabledStyle: React.CSSProperties = {
  opacity: 0.6,
  cursor: "not-allowed",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      size = "md",
      variant = "default",
      className,
      id,
      required,
      disabled,
      style,
      ...props
>>>>>>> Stashed changes
    },
    ref,
  ) => {
    const { t } = useTranslation("common");
<<<<<<< Updated upstream
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
=======
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    const computedStyle: React.CSSProperties = {
      ...baseStyle,
      ...sizeStyles[size],
      ...(error || variant === "error" ? errorStyle : {}),
      ...(disabled ? disabledStyle : {}),
>>>>>>> Stashed changes
      ...style,
    };

    return (
<<<<<<< Updated upstream
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
=======
      <div className="flex flex--column flex--gap-xs" style={{ width: "100%" }}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm"
            style={{
              color: "var(--color-text-primary)",
              fontWeight: 500,
            }}
          >
            {label}
            {required && (
              <span
                className="text-danger-text"
                style={{ marginLeft: "var(--space-xs)" }}
                aria-label={t("validation.required")}
>>>>>>> Stashed changes
              >
                *
              </span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
<<<<<<< Updated upstream
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
=======
          className={className}
          style={computedStyle}
          disabled={disabled}
          required={required}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={[errorId, helperId].filter(Boolean).join(" ") || undefined}
          aria-errormessage={errorId}
          aria-required={required}
          onFocus={(e) => {
            if (!error && !disabled) {
              e.currentTarget.style.borderColor = focusStyle.borderColor as string;
              e.currentTarget.style.boxShadow = focusStyle.boxShadow as string;
            }
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.boxShadow = "";
            props.onBlur?.(e);
          }}
          {...props}
        />
        {error && (
          <p
            id={errorId}
            role="alert"
            aria-live="assertive"
            className="text-sm text-danger-text"
            style={{ margin: 0 }}
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={helperId}
            className="text-sm"
            style={{
              margin: 0,
>>>>>>> Stashed changes
              color: "var(--color-text-muted)",
            }}
          >
            {helperText}
<<<<<<< Updated upstream
          </div>
=======
          </p>
>>>>>>> Stashed changes
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
