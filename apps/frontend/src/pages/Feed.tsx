import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import PageIntro from "../components/PageIntro";
import { Button, VisibilityBadge, Skeleton } from "../components/ui";
import { getFeed, likeFeedItem, unlikeFeedItem, cloneSessionFromFeed } from "../services/api";
import type { VisibilityLevel } from "../components/ui";
import { useToast } from "../contexts/ToastContext";

const Feed: React.FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [limit] = useState(20);
  const [offset] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["feed", { scope: "public", limit, offset }],
    queryFn: () => getFeed({ scope: "public", limit, offset }),
  });

  const likeMutation = useMutation({
    mutationFn: likeFeedItem,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: unlikeFeedItem,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: cloneSessionFromFeed,
    onSuccess: () => {
      toast.success(t("feed.cloneSuccess") || "Session cloned successfully!");
    },
  });

  const handleLikeToggle = (feedItemId: string, isLiked: boolean) => {
    if (isLiked) {
      unlikeMutation.mutate(feedItemId);
    } else {
      likeMutation.mutate(feedItemId);
    }
  };

  const handleClone = (sessionId: string) => {
    cloneMutation.mutate(sessionId);
  };

  if (isLoading) {
    return (
      <PageIntro
        eyebrow={t("feed.eyebrow")}
        title={t("feed.title")}
        description={t("feed.description")}
      >
        <div className="grid grid--gap-md">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card card--compact">
              <Skeleton width="100%" height="60px" />
              <Skeleton width="100%" height="40px" />
              <Skeleton width="100%" height="30px" />
            </div>
          ))}
        </div>
      </PageIntro>
    );
  }

  if (error) {
    return (
      <PageIntro
        eyebrow={t("feed.eyebrow")}
        title={t("feed.title")}
        description={t("feed.description")}
      >
        <div className="empty-state card">
          <p className="text-secondary">
            {t("feed.error") || "Failed to load feed. Please try again later."}
          </p>
        </div>
      </PageIntro>
    );
  }

  const items = data?.items || [];

  if (items.length === 0) {
    return (
      <PageIntro
        eyebrow={t("feed.eyebrow")}
        title={t("feed.title")}
        description={t("feed.description")}
      >
        <div className="empty-state card">
          <p className="text-muted">
            {t("feed.empty") || "No activity yet. Start training and share your sessions!"}
          </p>
        </div>
      </PageIntro>
    );
  }

  return (
    <PageIntro
      eyebrow={t("feed.eyebrow")}
      title={t("feed.title")}
      description={t("feed.description")}
    >
      <div className="grid grid--gap-md">
        {items.map((item) => {
          const isRestricted = item.visibility === "private";
          const displayName = item.user.displayName || item.user.username;

          return (
            <article key={item.id} className="card card--compact">
              <header className="flex flex--justify-between flex--align-center flex--gap-md">
                <div className="grid" style={{ gap: "0.25rem" }}>
                  <strong className="text-105">{displayName}</strong>
                  <span className="text-085 text-muted">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <VisibilityBadge level={item.visibility as VisibilityLevel} />
              </header>
              <div>
                {item.session.title && (
                  <strong className="block mb-05">{item.session.title}</strong>
                )}
                {item.session.notes && (
                  <p className="m-0 text-secondary text-095">{item.session.notes}</p>
                )}
              </div>
              <footer className="flex flex--justify-between flex--align-center flex--wrap flex--gap-075 text-09 text-secondary">
                <span>
                  {item.session.exerciseCount} {t("feed.exercises") || "exercises"} •{" "}
                  {item.session.totalVolume
                    ? `${(item.session.totalVolume / 1000).toFixed(1)}k kg`
                    : "No volume data"}
                </span>
                <div className="flex flex--align-center flex--gap-06">
                  <Button
                    type="button"
                    size="sm"
                    variant={item.isLiked ? "primary" : "ghost"}
                    onClick={() => handleLikeToggle(item.id, Boolean(item.isLiked))}
                    disabled={likeMutation.isPending || unlikeMutation.isPending}
                  >
                    {item.isLiked ? "♥" : "♡"} {item.likesCount}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isRestricted || cloneMutation.isPending}
                    onClick={() => handleClone(item.session.id)}
                  >
                    {t("feed.button") || "Clone"}
                  </Button>
                </div>
              </footer>
            </article>
          );
        })}
      </div>
    </PageIntro>
  );
};

export default Feed;
