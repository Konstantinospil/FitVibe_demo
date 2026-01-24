import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  getPointsHistory,
  type PointsEventRecord,
  type PointsHistoryQuery,
} from "../../services/api";
import { LoadingState } from "../utils/LoadingState";
import { ErrorDisplay } from "../utils/ErrorDisplay";
import { Card, CardContent } from "../ui/Card";

export interface PointsHistoryProps {
  limit?: number;
  className?: string;
}

export const PointsHistory: React.FC<PointsHistoryProps> = ({ limit = 20, className = "" }) => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<PointsEventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const query: PointsHistoryQuery = { limit };
        const result = await getPointsHistory(query);
        setHistory(result.items);
        setNextCursor(result.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load points history"));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchHistory();
  }, [limit]);

  const loadMore = async () => {
    if (!nextCursor) {
      return;
    }

    try {
      const query: PointsHistoryQuery = { cursor: nextCursor, limit };
      const result = await getPointsHistory(query);
      setHistory((prev) => [...prev, ...result.items]);
      setNextCursor(result.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load more history"));
    }
  };

  if (isLoading) {
    return <LoadingState message={t("common.loading", { defaultValue: "Loading..." })} />;
  }

  if (error) {
    return <ErrorDisplay message={error.message} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className={className}>
      <Card>
        <CardContent>
          <div className="flex flex-col gap-2">
            {history.length === 0 ? (
              <p className="text-secondary text-center p-4">
                {t("points.history.empty", { defaultValue: "No points history yet" })}
              </p>
            ) : (
              <>
                {history.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 border-b border-border last:border-b-0"
                  >
                    <div className="flex flex-col">
                      <span className="text-primary font-medium">
                        {event.source_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-secondary text-sm">
                        {new Date(event.awarded_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-primary font-semibold">+{event.points}</span>
                  </div>
                ))}
                {nextCursor && (
                  <button
                    onClick={() => void loadMore()}
                    className="text-primary text-sm mt-2 hover:underline"
                  >
                    {t("common.loadMore", { defaultValue: "Load more" })}
                  </button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
