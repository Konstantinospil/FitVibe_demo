import React, { forwardRef } from "react";
<<<<<<< Updated upstream

export type TextareaSize = "sm" | "md" | "lg";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: TextareaSize;
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
=======
import { useTranslation } from "react-i18next";

export type TextareaSize = "sm" | "md" | "lg";
export type TextareaVariant = "default" | "error";

export interface TextareaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "size"
> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: TextareaSize;
  variant?: TextareaVariant;
>>>>>>> Stashed changes
}

const sizeStyles: Record<TextareaSize, React.CSSProperties> = {
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
  resize: "vertical",
<<<<<<< Updated upstream
=======
  minHeight: "80px",
};

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
>>>>>>> Stashed changes
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
<<<<<<< Updated upstream
    { size = "md", label, error, helperText, fullWidth = true, className, style, ...props },
    ref,
  ) => {
    const textareaId = props.id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText ? `${textareaId}-helper` : undefined;

    return (
      <div
        className={className}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-xs)",
          width: fullWidth ? "100%" : "auto",
        }}
      >
        {label && (
          <label
            htmlFor={textareaId}
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: 500,
              color: error ? "var(--color-danger)" : "var(--color-text-primary)",
            }}
          >
            {label}
=======
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
    },
    ref,
  ) => {
    const { t } = useTranslation("common");
    const textareaId = id || `textarea-${Math.random().toString(36).substring(2, 9)}`;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText ? `${textareaId}-helper` : undefined;

    const computedStyle: React.CSSProperties = {
      ...baseStyle,
      ...sizeStyles[size],
      ...(error || variant === "error" ? errorStyle : {}),
      ...(disabled ? disabledStyle : {}),
      ...style,
    };

    return (
      <div className="flex flex--column flex--gap-xs" style={{ width: "100%" }}>
        {label && (
          <label
            htmlFor={textareaId}
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
              >
                *
              </span>
            )}
>>>>>>> Stashed changes
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
<<<<<<< Updated upstream
          {...props}
          style={{
            ...baseStyle,
            ...sizeStyles[size],
            borderColor: error ? "var(--color-danger)" : undefined,
            ...style,
          }}
          aria-describedby={errorId || helperId || undefined}
          aria-invalid={error ? "true" : "false"}
          aria-errormessage={errorId}
        />
        {error && (
          <div
            id={errorId}
            role="alert"
            style={{
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

Textarea.displayName = "Textarea";
