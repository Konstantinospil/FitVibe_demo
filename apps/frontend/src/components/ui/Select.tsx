import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

export type SelectSize = "sm" | "md" | "lg";
export type SelectVariant = "default" | "filled";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: SelectSize;
  variant?: SelectVariant;
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

const sizeStyles: Record<SelectSize, React.CSSProperties> = {
  sm: {
    padding: "0.5rem 2.5rem 0.5rem 0.75rem",
    fontSize: "var(--font-size-sm)",
  },
  md: {
    padding: "0.75rem 3rem 0.75rem 1rem",
    fontSize: "var(--font-size-md)",
  },
  lg: {
    padding: "1rem 3.5rem 1rem 1.25rem",
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
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  cursor: "pointer",
};

/**
 * Select component for dropdown selection (WCAG 2.2 AA).
 * Supports validation states, helper text, and accessibility features.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      size = "md",
      variant: _variant = "default",
      label,
      error,
      helperText,
      options,
      placeholder,
      fullWidth = true,
      style,
      className,
      id,
      value,
      ...rest
    },
    ref,
  ) => {
    const { t } = useTranslation("common");
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText ? `${selectId}-helper` : undefined;

    const selectStyle: React.CSSProperties = {
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

    const wrapperStyle: React.CSSProperties = {
      position: "relative",
      width: fullWidth ? "100%" : "auto",
    };

    const iconStyle: React.CSSProperties = {
      position: "absolute",
      right: size === "sm" ? "0.75rem" : size === "md" ? "1rem" : "1.25rem",
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none",
      color: "var(--color-text-muted)",
    };

    return (
      <div className={className} style={{ width: fullWidth ? "100%" : "auto" }}>
        {label && (
          <label
            htmlFor={selectId}
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
        <div style={wrapperStyle}>
          <select
            ref={ref}
            id={selectId}
            value={value || ""}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={errorId || helperId || undefined}
            aria-errormessage={errorId}
            style={selectStyle}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown size={20} style={iconStyle} aria-hidden="true" />
        </div>
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

Select.displayName = "Select";
