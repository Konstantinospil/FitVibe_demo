import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

export type SelectSize = "sm" | "md" | "lg";
<<<<<<< Updated upstream
export type SelectVariant = "default" | "filled";
=======
export type SelectVariant = "default" | "error";
>>>>>>> Stashed changes

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
<<<<<<< Updated upstream
  size?: SelectSize;
  variant?: SelectVariant;
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
=======
  label?: string;
  error?: string;
  helperText?: string;
  size?: SelectSize;
  variant?: SelectVariant;
  options: SelectOption[];
  placeholder?: string;
>>>>>>> Stashed changes
}

const sizeStyles: Record<SelectSize, React.CSSProperties> = {
  sm: {
<<<<<<< Updated upstream
    padding: "0.5rem 2.5rem 0.5rem 0.75rem",
    fontSize: "var(--font-size-sm)",
  },
  md: {
    padding: "0.75rem 3rem 0.75rem 1rem",
    fontSize: "var(--font-size-md)",
  },
  lg: {
    padding: "1rem 3.5rem 1rem 1.25rem",
=======
    padding: "var(--space-xs) var(--space-sm)",
    paddingRight: "calc(var(--space-sm) + 20px + var(--space-xs))",
    fontSize: "var(--font-size-sm)",
  },
  md: {
    padding: "var(--space-sm) var(--space-md)",
    paddingRight: "calc(var(--space-md) + 20px + var(--space-sm))",
    fontSize: "var(--font-size-md)",
  },
  lg: {
    padding: "var(--space-md) var(--space-lg)",
    paddingRight: "calc(var(--space-lg) + 20px + var(--space-md))",
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
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  cursor: "pointer",
};

<<<<<<< Updated upstream
/**
 * Select component for dropdown selection (WCAG 2.2 AA).
 * Supports validation states, helper text, and accessibility features.
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

const wrapperStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
};

const iconStyle: React.CSSProperties = {
  position: "absolute",
  right: "var(--space-md)",
  top: "50%",
  transform: "translateY(-50%)",
  pointerEvents: "none",
  color: "var(--color-text-muted)",
  width: "20px",
  height: "20px",
};

/**
 * Select component with label, error, helper text, and custom dropdown icon.
 * Provides consistent styling and accessibility attributes.
>>>>>>> Stashed changes
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
<<<<<<< Updated upstream
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
=======
      label,
      error,
      helperText,
      size = "md",
      variant = "default",
      options,
      placeholder,
      className,
      id,
      required,
      disabled,
      style,
      value,
      ...props
>>>>>>> Stashed changes
    },
    ref,
  ) => {
    const { t } = useTranslation("common");
<<<<<<< Updated upstream
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
=======
    const selectId = id || `select-${Math.random().toString(36).substring(2, 9)}`;
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText ? `${selectId}-helper` : undefined;

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
            htmlFor={selectId}
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
        <div style={wrapperStyle}>
          <select
            ref={ref}
            id={selectId}
<<<<<<< Updated upstream
            value={value || ""}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={errorId || helperId || undefined}
            aria-errormessage={errorId}
            style={selectStyle}
            {...rest}
=======
            className={className}
            style={computedStyle}
            disabled={disabled}
            required={required}
            value={value}
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
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======
          <ChevronDown style={iconStyle} aria-hidden="true" />
        </div>
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

Select.displayName = "Select";
