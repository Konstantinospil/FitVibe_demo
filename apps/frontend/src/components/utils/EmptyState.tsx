import React from "react";
import { Card, CardContent } from "../ui/Card";

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, message, icon, action }) => {
  return (
    <Card>
      <CardContent>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-xl)",
            textAlign: "center",
            gap: "var(--space-md)",
          }}
        >
          {icon && (
            <div
              style={{
                fontSize: "48px",
                color: "var(--color-text-muted)",
                marginBottom: "var(--space-sm)",
              }}
            >
              {icon}
            </div>
          )}
          <h3
            style={{
              margin: 0,
              fontSize: "var(--font-size-lg)",
              fontWeight: 600,
              color: "var(--color-text-primary)",
            }}
          >
            {title}
          </h3>
          {message && (
            <p
              style={{
                margin: 0,
                fontSize: "var(--font-size-md)",
                color: "var(--color-text-secondary)",
                lineHeight: "var(--line-height-relaxed)",
                maxWidth: "400px",
              }}
            >
              {message}
            </p>
          )}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              style={{
                padding: "var(--space-sm) var(--space-md)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "var(--color-primary)",
                color: "var(--color-text-on-primary)",
                cursor: "pointer",
              }}
            >
              {action.label}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
