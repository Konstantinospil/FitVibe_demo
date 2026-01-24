import React from "react";
import { Award } from "lucide-react";
import { Card, CardContent } from "../ui/Card";
import type { BadgeCatalogEntry } from "../../services/api";

export interface BadgeCardProps {
  badge: BadgeCatalogEntry;
  earned?: boolean;
  earnedAt?: string;
  className?: string;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({
  badge,
  earned = false,
  earnedAt,
  className = "",
}) => {
  return (
    <Card className={earned ? "" : "opacity-60"}>
      <CardContent>
        <div className={`flex flex-col items-center gap-2 p-4 text-center ${className}`}>
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            {badge.icon ? (
              <span className="text-3xl">{badge.icon}</span>
            ) : (
              <Award size={32} className="text-primary" />
            )}
          </div>
          <h3 className="font-semibold text-primary">{badge.name}</h3>
          <p className="text-sm text-secondary">{badge.description}</p>
          {earned && earnedAt && (
            <p className="text-xs text-muted">{new Date(earnedAt).toLocaleDateString()}</p>
          )}
          {!earned && <p className="text-xs text-muted">Not earned yet</p>}
        </div>
      </CardContent>
    </Card>
  );
};
