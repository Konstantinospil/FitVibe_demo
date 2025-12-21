import React from "react";
import { Badge } from "../ui/Badge";

export type SessionStatus = "planned" | "in_progress" | "completed" | "canceled";

export interface SessionStatusBadgeProps {
  status: SessionStatus;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<
  SessionStatus,
  { variant: "default" | "primary" | "secondary"; label: string }
> = {
  planned: {
    variant: "default",
    label: "Planned",
  },
  in_progress: {
    variant: "primary",
    label: "In Progress",
  },
  completed: {
    variant: "primary",
    label: "Completed",
  },
  canceled: {
    variant: "secondary",
    label: "Cancelled",
  },
};

export const SessionStatusBadge: React.FC<SessionStatusBadgeProps> = ({ status, size = "sm" }) => {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
};
