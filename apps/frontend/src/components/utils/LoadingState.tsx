import React from "react";
import { Loader2 } from "lucide-react";

export interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  size = "md",
}) => {
  const sizeMap = {
    sm: 24,
    md: 32,
    lg: 48,
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <Loader2 size={sizeMap[size]} className="animate-spin text-primary" />
      {message && <p className="text-secondary text-sm">{message}</p>}
    </div>
  );
};
