import React, { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "../ui/Button";
import { likeFeedItem, unlikeFeedItem } from "../../services/api";

export interface LikeButtonProps {
  feedItemId: string;
  initialLiked?: boolean;
  initialCount?: number;
  onLikeChange?: (liked: boolean, count: number) => void;
  size?: "sm" | "md" | "lg";
  variant?: "minimal" | "default";
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  feedItemId,
  initialLiked = false,
  initialCount = 0,
  onLikeChange,
  size = "md",
  variant = "default",
}) => {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      if (isLiked) {
        await unlikeFeedItem(feedItemId);
        setIsLiked(false);
        setCount((prev) => Math.max(0, prev - 1));
        onLikeChange?.(false, count - 1);
      } else {
        await likeFeedItem(feedItemId);
        setIsLiked(true);
        setCount((prev) => prev + 1);
        onLikeChange?.(true, count + 1);
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
      leftIcon={<Heart size={16} fill={isLiked ? "currentColor" : "none"} />}
      aria-label={isLiked ? "Unlike" : "Like"}
    >
      {count > 0 && <span>{count}</span>}
    </Button>
  );
};
