import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { followUser, unfollowUser } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { logger } from "../../utils/logger";

export interface FollowButtonProps {
  userAlias: string;
  initialFollowing?: boolean;
  onFollowChange?: (following: boolean) => void;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost" | "default";
}

/**
 * FollowButton component for following/unfollowing users.
 *
 * Complies with PRD requirements:
 * - FR-7: Sharing & Community - Follow users (follow/unfollow UI)
 * - NFR 5.5: WCAG 2.1 AA accessibility (keyboard navigation, ARIA labels)
 * - Error handling with user-friendly messages
 * - Loading states for better UX
 *
 * Features:
 * - Toggles between "Follow" and "Following" states
 * - Optimistic UI updates
 * - Error handling with toast notifications
 * - Accessible keyboard navigation
 * - ARIA labels for screen readers
 */
export const FollowButton: React.FC<FollowButtonProps> = ({
  userAlias,
  initialFollowing,
  onFollowChange,
  size = "sm",
  variant = "default",
}) => {
  const { t } = useTranslation("common");
  const toast = useToast();
  const [isFollowing, setIsFollowing] = useState(initialFollowing ?? false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent card click when button is clicked

    if (isLoading) {
      return;
    }

    const newFollowingState = !isFollowing;

    // Optimistic update
    setIsFollowing(newFollowingState);
    setIsLoading(true);

    const performAction = async () => {
      try {
        if (newFollowingState) {
          await followUser(userAlias);
          toast.success(
            t("feed.follow.success", { defaultValue: "You are now following this user" }),
          );
        } else {
          await unfollowUser(userAlias);
          toast.success(t("feed.unfollow.success", { defaultValue: "You unfollowed this user" }));
        }

        // Notify parent component of state change
        onFollowChange?.(newFollowingState);
      } catch (error) {
        // Revert optimistic update on error
        setIsFollowing(!newFollowingState);

        logger.apiError(
          `Failed to ${newFollowingState ? "follow" : "unfollow"} user`,
          error,
          `/api/v1/users/${userAlias}/${newFollowingState ? "follow" : "unfollow"}`,
          newFollowingState ? "POST" : "DELETE",
        );

        const errorMessage = newFollowingState
          ? t("feed.follow.error", { defaultValue: "Failed to follow user. Please try again." })
          : t("feed.unfollow.error", {
              defaultValue: "Failed to unfollow user. Please try again.",
            });

        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    void performAction();
  };

  const buttonText = isFollowing
    ? t("feed.following", { defaultValue: "Following" })
    : t("feed.follow", { defaultValue: "Follow" });

  const ariaLabel = isFollowing
    ? t("feed.aria.unfollow", { defaultValue: `Unfollow ${userAlias}` })
    : t("feed.aria.follow", { defaultValue: `Follow ${userAlias}` });

  // Map "default" variant to "secondary" for Button component
  const buttonVariant = variant === "default" ? "secondary" : variant;

  return (
    <Button
      variant={buttonVariant}
      size={size}
      onClick={handleClick}
      isLoading={isLoading}
      disabled={isLoading}
      aria-label={ariaLabel}
      aria-pressed={isFollowing}
      type="button"
    >
      {buttonText}
    </Button>
  );
};
