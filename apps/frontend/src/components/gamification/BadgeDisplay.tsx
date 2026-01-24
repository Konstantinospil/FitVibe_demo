import React from "react";
import { BadgeCard } from "./BadgeCard";
import type { BadgeCatalogEntry } from "../../services/api";

export interface BadgeDisplayProps {
  badges: BadgeCatalogEntry[];
  earnedBadgeCodes?: Set<string>;
  earnedBadgeDates?: Map<string, string>;
  className?: string;
}

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  badges,
  earnedBadgeCodes = new Set<string>(),
  earnedBadgeDates = new Map<string, string>(),
  className = "",
}) => {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}
    >
      {badges.map((badge) => (
        <BadgeCard
          key={badge.code}
          badge={badge}
          earned={earnedBadgeCodes.has(badge.code)}
          earnedAt={earnedBadgeDates.get(badge.code)}
        />
      ))}
    </div>
  );
};
