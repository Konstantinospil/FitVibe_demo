import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "warning",
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) {
    return null;
  }

  const variantConfig = {
    danger: {
      color: "var(--color-danger)",
      bg: "rgba(239, 68, 68, 0.1)",
    },
    warning: {
      color: "#fbbf24",
      bg: "rgba(251, 191, 36, 0.1)",
    },
    info: {
      color: "#3b82f6",
      bg: "rgba(59, 130, 246, 0.1)",
    },
  }[variant];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 9998,
          backdropFilter: "blur(4px)",
          animation: "fadeIn 0.15s ease-out",
        }}
      />

      {/* Dialog */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "16px",
          padding: "1.5rem",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
          animation: "slideUp 0.2s ease-out",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" }}
        >
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "12px",
              background: variantConfig.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={24} color={variantConfig.color} />
          </div>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                margin: 0,
                marginBottom: "0.5rem",
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "var(--color-text-primary)",
              }}
            >
              {title}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "0.95rem",
                color: "var(--color-text-secondary)",
                lineHeight: 1.5,
              }}
            >
              {message}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>

        <style>
          {`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }

            @keyframes slideUp {
              from {
                transform: translate(-50%, -40%);
                opacity: 0;
              }
              to {
                transform: translate(-50%, -50%);
                opacity: 1;
              }
            }
          `}
        </style>
      </div>
    </>
  );
};
