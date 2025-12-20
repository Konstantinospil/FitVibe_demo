import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

export type SelectSize = "sm" | "md" | "lg";
export type SelectVariant = "default" | "error";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: SelectSize;
  variant?: SelectVariant;
  options: SelectOption[];
  placeholder?: string;
}

const sizeStyles: Record<SelectSize, React.CSSProperties> = {
  sm: {
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
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  cursor: "pointer",
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
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
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
    },
    ref,
  ) => {
    const { t } = useTranslation("common");
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

Select.displayName = "Select";
