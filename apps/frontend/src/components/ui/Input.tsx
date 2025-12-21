import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  className,
  style,
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem",
    fontSize: "var(--font-size-base)",
    lineHeight: "var(--line-height-normal)",
    color: "var(--color-text-primary)",
    backgroundColor: "var(--color-surface)",
    border: error
      ? "1px solid var(--color-error, rgb(248, 113, 113))"
      : "1px solid var(--color-border)",
    borderRadius: "var(--radius-md, 8px)",
    transition: "border-color 150ms ease",
    ...style,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: 500,
            color: "var(--color-text-primary)",
          }}
        >
          {label}
        </label>
      )}
      <input id={inputId} style={inputStyle} className={className} {...props} />
      {helperText && (
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: error ? "var(--color-error, rgb(248, 113, 113))" : "var(--color-text-secondary)",
          }}
        >
          {helperText}
        </span>
      )}
    </div>
  );
};
