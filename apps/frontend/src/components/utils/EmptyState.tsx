import React from "react";
import { Card, CardContent } from "../ui/Card";
<<<<<<< Updated upstream
=======
import { Button } from "../ui/Button";
>>>>>>> Stashed changes

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

<<<<<<< Updated upstream
=======
/**
 * EmptyState component displays a message when there's no content to show.
 * Supports icon, title, message, and optional action button.
 */
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======
            <Button variant="primary" size="md" onClick={action.onClick}>
              {action.label}
            </Button>
>>>>>>> Stashed changes
          )}
        </div>
      </CardContent>
    </Card>
  );
};
