import React, { useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "../ui/Button";
import { bookmarkFeedItem, unbookmarkFeedItem } from "../../services/api";

export interface BookmarkButtonProps {
  feedItemId: string;
  initialBookmarked?: boolean;
  onBookmarkChange?: (bookmarked: boolean) => void;
  size?: "sm" | "md" | "lg";
  variant?: "minimal" | "default";
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  feedItemId,
  initialBookmarked = false,
  onBookmarkChange,
  size = "md",
  variant = "default",
}) => {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      if (isBookmarked) {
        await unbookmarkFeedItem(feedItemId);
        setIsBookmarked(false);
        onBookmarkChange?.(false);
      } else {
        await bookmarkFeedItem(feedItemId);
        setIsBookmarked(true);
        onBookmarkChange?.(true);
      }
    } catch {
      // Error handling would be done by parent component
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant === "minimal" ? "ghost" : "secondary"}
      size={size}
      onClick={() => {
        void handleClick();
      }}
      isLoading={isLoading}
      leftIcon={<Bookmark size={16} fill={isBookmarked ? "currentColor" : "none"} />}
      aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
    />
  );
};
