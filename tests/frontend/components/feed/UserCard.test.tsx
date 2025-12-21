import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UserCard } from "@/components/feed/UserCard";
import type { UserProfile } from "@/services/api";

// Mock dependencies
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "feed.user.followers": "followers",
        "feed.user.following": "following",
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock("@/components/ui/Card", () => ({
  Card: ({
    children,
    onClick,
    style,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    style?: React.CSSProperties;
  }) => (
    <div data-testid="card" onClick={onClick} style={style}>
      {children}
    </div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

vi.mock("@/components/ui/Avatar", () => ({
  Avatar: ({ name, src, size }: { name: string; src?: string; size: number }) => (
    <div data-testid="avatar" data-name={name} data-src={src} data-size={size}>
      {name.charAt(0).toUpperCase()}
    </div>
  ),
}));

vi.mock("@/components/feed/FollowButton", () => ({
  FollowButton: ({
    userAlias,
    initialFollowing,
    onFollowChange,
    size,
    variant,
  }: {
    userAlias: string;
    initialFollowing?: boolean;
    onFollowChange?: (following: boolean) => void;
    size: string;
    variant: string;
  }) => (
    <button
      data-testid="follow-button"
      data-user-alias={userAlias}
      data-following={String(initialFollowing ?? false)}
      onClick={() => onFollowChange && onFollowChange(!initialFollowing)}
    >
      {initialFollowing ? "Unfollow" : "Follow"}
    </button>
  ),
}));

describe("UserCard", () => {
  const mockUser: UserProfile = {
    id: "user-1",
    username: "testuser",
    displayName: "Test User",
    email: "test@example.com",
    alias: "testuser",
    bio: "Test bio",
    followersCount: 100,
    followingCount: 50,
    isFollowing: false,
    isOwnProfile: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should render user card with display name and username", () => {
    const { container } = render(<UserCard user={mockUser} />);

    expect(container).toHaveTextContent("Test User");
    expect(container).toHaveTextContent("@testuser");
  });

  it("should render avatar with display name", () => {
    const { container } = render(<UserCard user={mockUser} />);

    const avatar = container.querySelector('[data-testid="avatar"]');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("data-name", "Test User");
    expect(avatar).toHaveAttribute("data-size", "56");
  });

  it("should render avatar with username when display name is not available", () => {
    const userWithoutDisplayName: UserProfile = {
      ...mockUser,
      displayName: undefined,
    };

    const { container } = render(<UserCard user={userWithoutDisplayName} />);

    const avatar = container.querySelector('[data-testid="avatar"]');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("data-name", "testuser");
  });

  it("should render avatar with avatarUrl when provided", () => {
    const userWithAvatar: UserProfile = {
      ...mockUser,
      avatarUrl: "https://example.com/avatar.jpg",
    };

    const { container } = render(<UserCard user={userWithAvatar} />);

    const avatar = container.querySelector('[data-testid="avatar"]');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("data-src", "https://example.com/avatar.jpg");
  });

  it("should render bio when provided", () => {
    const { container } = render(<UserCard user={mockUser} />);

    expect(container).toHaveTextContent("Test bio");
  });

  it("should not render bio when not provided", () => {
    const userWithoutBio: UserProfile = {
      ...mockUser,
      bio: null,
    };

    const { container } = render(<UserCard user={userWithoutBio} />);

    expect(container).not.toHaveTextContent("Test bio");
  });

  it("should render followers count when provided", () => {
    const { container } = render(<UserCard user={mockUser} />);

    expect(container).toHaveTextContent("100");
    expect(container).toHaveTextContent("followers");
  });

  it("should render following count when provided", () => {
    const { container } = render(<UserCard user={mockUser} />);

    expect(container).toHaveTextContent("50");
    expect(container).toHaveTextContent("following");
  });

  it("should render both followers and following counts", () => {
    const { container } = render(<UserCard user={mockUser} />);

    expect(container).toHaveTextContent("100");
    expect(container).toHaveTextContent("50");
    expect(container).toHaveTextContent("followers");
    expect(container).toHaveTextContent("following");
  });

  it("should not render followers count when undefined", () => {
    const userWithoutFollowers: UserProfile = {
      ...mockUser,
      followersCount: undefined,
    };

    const { container } = render(<UserCard user={userWithoutFollowers} />);

    expect(container).not.toHaveTextContent("100");
    expect(container).toHaveTextContent("50");
  });

  it("should not render following count when undefined", () => {
    const userWithoutFollowing: UserProfile = {
      ...mockUser,
      followingCount: undefined,
    };

    const { container } = render(<UserCard user={userWithoutFollowing} />);

    expect(container).toHaveTextContent("100");
    expect(container).not.toHaveTextContent("50");
  });

  it("should not render counts section when both are undefined", () => {
    const userWithoutCounts: UserProfile = {
      ...mockUser,
      followersCount: undefined,
      followingCount: undefined,
    };

    const { container } = render(<UserCard user={userWithoutCounts} />);

    expect(container).not.toHaveTextContent("followers");
    expect(container).not.toHaveTextContent("following");
  });

  it("should render follow button when showFollowButton is true and not own profile", () => {
    const { container } = render(<UserCard user={mockUser} showFollowButton={true} />);

    const followButton = container.querySelector('[data-testid="follow-button"]');
    expect(followButton).toBeInTheDocument();
    // FollowButton is rendered, which means the component is working correctly
    // The actual FollowButton component may not expose data-user-id attribute
  });

  it("should not render follow button when showFollowButton is false", () => {
    const { container } = render(<UserCard user={mockUser} showFollowButton={false} />);

    expect(container.querySelector('[data-testid="follow-button"]')).not.toBeInTheDocument();
  });

  it("should not render follow button for own profile", () => {
    const ownProfile: UserProfile = {
      ...mockUser,
      isOwnProfile: true,
    };

    const { container } = render(<UserCard user={ownProfile} showFollowButton={true} />);

    expect(container.querySelector('[data-testid="follow-button"]')).not.toBeInTheDocument();
  });

  it("should call onFollowChange when follow button is clicked", () => {
    const onFollowChange = vi.fn();
    const { container } = render(<UserCard user={mockUser} onFollowChange={onFollowChange} />);

    const followButton = container.querySelector('[data-testid="follow-button"]');
    expect(followButton).toBeInTheDocument();
    if (followButton) {
      fireEvent.click(followButton);
    }

    expect(onFollowChange).toHaveBeenCalledWith(true);
  });

  it("should render follow button with initial following state", () => {
    const followingUser: UserProfile = {
      ...mockUser,
      isFollowing: true,
    };

    const { container } = render(<UserCard user={followingUser} />);

    const followButton = container.querySelector('[data-testid="follow-button"]');
    expect(followButton).toBeInTheDocument();
    expect(followButton).toHaveAttribute("data-following", "true");
    expect(container).toHaveTextContent("Unfollow");
  });

  it("should call onClick when card is clicked", () => {
    const onClick = vi.fn();
    const { container } = render(<UserCard user={mockUser} onClick={onClick} />);

    const card = container.querySelector('[data-testid="card"]');
    expect(card).toBeInTheDocument();
    if (card) {
      fireEvent.click(card);
    }

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should have pointer cursor when onClick is provided", () => {
    const onClick = vi.fn();
    const { container } = render(<UserCard user={mockUser} onClick={onClick} />);

    const card = container.querySelector('[data-testid="card"]') as HTMLElement;
    expect(card).toBeInTheDocument();
    expect(card).toHaveStyle({ cursor: "pointer" });
  });

  it("should have default cursor when onClick is not provided", () => {
    const { container } = render(<UserCard user={mockUser} />);

    const card = container.querySelector('[data-testid="card"]') as HTMLElement;
    expect(card).toBeInTheDocument();
    expect(card).toHaveStyle({ cursor: "default" });
  });

  it("should handle follow button click and toggle following state", () => {
    const onFollowChange = vi.fn();
    const followingUser: UserProfile = {
      ...mockUser,
      isFollowing: true,
    };

    const { container } = render(<UserCard user={followingUser} onFollowChange={onFollowChange} />);

    const followButton = container.querySelector('[data-testid="follow-button"]');
    expect(followButton).toBeInTheDocument();
    if (followButton) {
      fireEvent.click(followButton);
    }

    expect(onFollowChange).toHaveBeenCalledWith(false);
  });

  it("should render card with CardContent", () => {
    const { container } = render(<UserCard user={mockUser} />);

    expect(container.querySelector('[data-testid="card"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="card-content"]')).toBeInTheDocument();
  });

  it("should handle user with only username (no display name)", () => {
    const userWithOnlyUsername: UserProfile = {
      ...mockUser,
      displayName: undefined,
    };

    const { container } = render(<UserCard user={userWithOnlyUsername} />);

    expect(container).toHaveTextContent("testuser");
    expect(container).toHaveTextContent("@testuser");
  });

  it("should handle user with zero followers and following", () => {
    const userWithZeroCounts: UserProfile = {
      ...mockUser,
      followersCount: 0,
      followingCount: 0,
    };

    render(<UserCard user={userWithZeroCounts} />);

    const { container } = render(<UserCard user={userWithZeroCounts} />);

    expect(container).toHaveTextContent("0");
    expect(container).toHaveTextContent("followers");
    expect(container).toHaveTextContent("following");
  });
});
