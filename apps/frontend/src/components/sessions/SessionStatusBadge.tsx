import React from "react";
import { Badge } from "../ui/Badge";

export type SessionStatus = "planned" | "in_progress" | "completed" | "canceled";

export interface SessionStatusBadgeProps {
  status: SessionStatus;
  className?: string;
<<<<<<< Updated upstream
  style?: React.CSSProperties;
}

const statusConfig: Record<
  SessionStatus,
  { variant: "planned" | "completed" | "info" | "danger"; label: string }
> = {
  planned: {
    variant: "planned",
    label: "Planned",
  },
  in_progress: {
    variant: "info",
    label: "In Progress",
  },
  completed: {
    variant: "completed",
    label: "Completed",
  },
  canceled: {
    variant: "danger",
    label: "Canceled",
  },
};

/**
 * SessionStatusBadge component displays session status with appropriate styling.
 * Uses planned/completed gradient badges and status colors.
 */
export const SessionStatusBadge: React.FC<SessionStatusBadgeProps> = ({
  status,
  className,
  style,
}) => {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className} style={style}>
=======
}

/**
 * SessionStatusBadge component displays session status with appropriate styling.
 * Uses design system colors: Planned (gradient), Completed (green).
 */
export const SessionStatusBadge: React.FC<SessionStatusBadgeProps> = ({ status, className }) => {
  const statusConfig: Record<
    SessionStatus,
    { variant: "planned" | "completed" | "info" | "warning"; label: string }
  > = {
    planned: {
      variant: "planned",
      label: "Planned",
    },
    in_progress: {
      variant: "info",
      label: "In Progress",
    },
    completed: {
      variant: "completed",
      label: "Completed",
    },
    canceled: {
      variant: "warning",
      label: "Canceled",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size="sm" className={className}>
>>>>>>> Stashed changes
      {config.label}
    </Badge>
  );
};
