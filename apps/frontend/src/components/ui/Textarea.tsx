import React, { forwardRef } from "react";

export type TextareaSize = "sm" | "md" | "lg";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: TextareaSize;
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const sizeStyles: Record<TextareaSize, React.CSSProperties> = {
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
  resize: "vertical",
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
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
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
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

Textarea.displayName = "Textarea";
