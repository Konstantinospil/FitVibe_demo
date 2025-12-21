import React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "onChange"
> {
  label?: string;
  helperText?: string;
  error?: boolean;
  options: SelectOption[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  helperText,
  error,
  options,
  className,
  style,
  id,
  placeholder,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const selectStyle: React.CSSProperties = {
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
          htmlFor={selectId}
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: 500,
            color: "var(--color-text-primary)",
          }}
        >
          {label}
        </label>
      )}
      <select id={selectId} style={selectStyle} className={className} {...props}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
