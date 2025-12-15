import React from "react";
import { Label } from "./Label";
import { Input } from "./Input";

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  style?: React.CSSProperties;
  // Allow passing through input props for convenience
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

/**
 * FormField component - wrapper for label, input, and error/helper text (WCAG 2.2 AA).
 * Provides consistent spacing and accessibility attributes.
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  helperText,
  children,
  htmlFor,
  className,
  style,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  disabled,
  minLength,
  maxLength,
  pattern,
  ...inputProps
}) => {
  const fieldId = htmlFor || `field-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const helperId = helperText ? `${fieldId}-helper` : undefined;

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-xs)",
        ...style,
      }}
    >
      {label && (
        <Label htmlFor={fieldId} required={required} error={!!error}>
          {label}
        </Label>
      )}
      {children ? (
        React.isValidElement(children) ? (
          React.cloneElement(children as React.ReactElement<any>, {
            id: fieldId,
            "aria-describedby": errorId || helperId || undefined,
            "aria-invalid": error ? "true" : "false",
            "aria-errormessage": errorId,
            type,
            placeholder,
            value,
            onChange,
            autoComplete,
            disabled,
            minLength,
            maxLength,
            pattern,
            ...inputProps,
          })
        ) : (
          children
        )
      ) : (
        <Input
          id={fieldId}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          disabled={disabled}
          minLength={minLength}
          maxLength={maxLength}
          pattern={pattern}
          aria-describedby={errorId || helperId || undefined}
          aria-invalid={error ? "true" : "false"}
          aria-errormessage={errorId}
          {...inputProps}
        />
      )}
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
            color: "var(--color-text-muted)",
          }}
        >
          {helperText}
        </div>
      )}
    </div>
  );
};
