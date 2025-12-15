import React, { useState } from "react";
import { UserPlus, UserMinus } from "lucide-react";
import { Button } from "../ui/Button";
import { followUser, unfollowUser } from "../../services/api";
import { useToast } from "../ui/Toast";
import { useTranslation } from "react-i18next";

export interface FollowButtonProps {
  userId: string;
  initialFollowing?: boolean;
  onFollowChange?: (following: boolean) => void;
  size?: "sm" | "md" | "lg";
  variant?: "minimal" | "default";
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  initialFollowing = false,
  onFollowChange,
  size = "md",
  variant = "default",
}) => {
  const { t } = useTranslation("common");
  const { showToast } = useToast();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(userId);
        setIsFollowing(false);
        onFollowChange?.(false);
        showToast({
          variant: "success",
          title: t("feed.unfollowSuccess") || "Unfollowed",
          message: t("feed.unfollowSuccessMessage") || "You have unfollowed this user",
        });
      } else {
        await followUser(userId);
        setIsFollowing(true);
        onFollowChange?.(true);
        showToast({
          variant: "success",
          title: t("feed.followSuccess") || "Following",
          message: t("feed.followSuccessMessage") || "You are now following this user",
        });
      }
    } catch {
      showToast({
        variant: "error",
        title: isFollowing
          ? t("feed.unfollowFailed") || "Unfollow Failed"
          : t("feed.followFailed") || "Follow Failed",
        message: isFollowing
          ? t("feed.unfollowFailedMessage") || "Failed to unfollow user. Please try again."
          : t("feed.followFailedMessage") || "Failed to follow user. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant === "minimal" ? "ghost" : isFollowing ? "secondary" : "primary"}
      size={size}
      onClick={() => {
        void handleClick();
      }}
      isLoading={isLoading}
      leftIcon={isFollowing ? <UserMinus size={16} /> : <UserPlus size={16} />}
      aria-label={isFollowing ? t("feed.unfollow") || "Unfollow" : t("feed.follow") || "Follow"}
    >
      {isFollowing ? t("feed.unfollow") || "Unfollow" : t("feed.follow") || "Follow"}
    </Button>
  );
};
