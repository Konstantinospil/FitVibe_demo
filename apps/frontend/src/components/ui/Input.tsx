import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";

export type InputSize = "sm" | "md" | "lg";
export type InputVariant = "default" | "error";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: InputSize;
  variant?: InputVariant;
}

const sizeStyles: Record<InputSize, React.CSSProperties> = {
  sm: {
    padding: "var(--space-xs) var(--space-sm)",
    fontSize: "var(--font-size-sm)",
  },
  md: {
    padding: "var(--space-sm) var(--space-md)",
    fontSize: "var(--font-size-md)",
  },
  lg: {
    padding: "var(--space-md) var(--space-lg)",
    fontSize: "var(--font-size-lg)",
  },
};

const baseStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "var(--radius-xl)",
  border: "1px solid var(--color-border)",
  background: "var(--color-input-bg)",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-family-base)",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
  outline: "none",
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
    },
    ref,
  ) => {
    const { t } = useTranslation("common");
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

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
              >
                *
              </span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
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
              color: "var(--color-text-muted)",
            }}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
