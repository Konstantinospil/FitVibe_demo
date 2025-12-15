import React from "react";
import { Spinner } from "../ui/Spinner";

export interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-xl)",
        gap: "var(--space-md)",
      }}
    >
      <Spinner size="lg" />
      {message && <p style={{ color: "var(--color-text-secondary)" }}>{message}</p>}
    </div>
  );
};
