import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "../ui/Button";

export interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = "Error",
  message,
  onRetry,
  retryLabel = "Try Again",
}) => {
  return (
    <div className="card flex flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertCircle size={48} className="text-error" />
      <div>
        <h3 className="text-lg font-semibold text-primary mb-2">{title}</h3>
        <p className="text-secondary">{message}</p>
      </div>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
