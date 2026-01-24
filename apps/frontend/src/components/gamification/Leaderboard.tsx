import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Trophy, Medal, Award } from "lucide-react";
import { Card, CardContent } from "../ui/Card";
import { LoadingState } from "../utils/LoadingState";
import { ErrorDisplay } from "../utils/ErrorDisplay";
import { getLeaderboard, type LeaderboardEntry, type LeaderboardQuery } from "../../services/api";
import { useAuthStore } from "../../store/auth.store";

export interface LeaderboardProps {
  limit?: number;
  className?: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ limit = 50, className = "" }) => {
  const { t } = useTranslation();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const query: LeaderboardQuery = { limit };
        const result = await getLeaderboard(query);
        setEntries(result.entries);
        setTotal(result.total);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load leaderboard"));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchLeaderboard();
  }, [limit]);

  if (isLoading) {
    return <LoadingState message={t("common.loading", { defaultValue: "Loading..." })} />;
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent>
          <ErrorDisplay
            title={t("leaderboard.error", { defaultValue: "Failed to load leaderboard" })}
            message={error.message}
            onRetry={() => window.location.reload()}
          />
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className={className}>
        <CardContent>
          <p className="text-secondary text-center p-4">
            {t("leaderboard.empty", { defaultValue: "No leaderboard entries yet" })}
          </p>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return <Trophy className="text-yellow-500" size={20} />;
    }
    if (rank === 2) {
      return <Medal className="text-gray-400" size={20} />;
    }
    if (rank === 3) {
      return <Award className="text-orange-600" size={20} />;
    }
    return <span className="text-secondary text-sm font-semibold">#{rank}</span>;
  };

  return (
    <Card className={className}>
      <CardContent>
        <h3 className="text-lg font-semibold text-primary mb-4">
          {t("leaderboard.title", { defaultValue: "Leaderboard" })}
        </h3>
        <div className="flex flex-col gap-2">
          {entries.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId;
            return (
              <div
                key={entry.userId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isCurrentUser ? "bg-primary/10 border border-primary" : "bg-surface"
                }`}
              >
                <div className="flex items-center gap-3">
                  {getRankIcon(entry.rank)}
                  <span className="font-medium text-primary">
                    {entry.displayName || entry.username}
                    {isCurrentUser && <span className="text-secondary text-sm ml-2">(You)</span>}
                  </span>
                </div>
                <span className="text-primary font-semibold">{entry.points.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
        {total > entries.length && (
          <p className="text-secondary text-sm text-center mt-4">
            {t("leaderboard.showing", {
              defaultValue: "Showing {{count}} of {{total}}",
              count: entries.length,
              total,
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
