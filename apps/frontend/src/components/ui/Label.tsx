import React from "react";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  error?: boolean;
  children: React.ReactNode;
}

export const Label: React.FC<LabelProps> = ({ required, error, children, ...props }) => {
  return (
    <label
      {...props}
      style={{
        fontSize: "var(--font-size-sm)",
        fontWeight: 500,
        color: error ? "var(--color-danger)" : "var(--color-text-primary)",
        ...props.style,
      }}
    >
      {children}
      {required && <span style={{ color: "var(--color-danger)", marginLeft: "0.25rem" }}>*</span>}
    </label>
  );
};
