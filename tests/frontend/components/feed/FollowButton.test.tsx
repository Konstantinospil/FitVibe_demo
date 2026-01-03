import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FollowButton } from "../../src/components/feed/FollowButton";

const followUser = vi.fn().mockResolvedValue(undefined);
const unfollowUser = vi.fn().mockResolvedValue(undefined);
const toastSuccess = vi.fn();
const toastError = vi.fn();
const apiError = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue || _key,
  }),
}));

vi.mock("../../src/contexts/ToastContext", () => ({
  useToast: () => ({
    success: toastSuccess,
    error: toastError,
  }),
}));

vi.mock("../../src/services/api", () => ({
  followUser: (...args: unknown[]) => followUser(...args),
  unfollowUser: (...args: unknown[]) => unfollowUser(...args),
}));

vi.mock("../../src/utils/logger", () => ({
  logger: {
    apiError: (...args: unknown[]) => apiError(...args),
  },
}));

describe("FollowButton", () => {
  beforeEach(() => {
    followUser.mockReset().mockResolvedValue(undefined);
    unfollowUser.mockReset().mockResolvedValue(undefined);
    toastSuccess.mockReset();
    toastError.mockReset();
    apiError.mockReset();
  });

  it("toggles follow and calls API", async () => {
    render(<FollowButton userAlias="alex" />);

    fireEvent.click(screen.getByRole("button", { name: "Follow alex" }));
    await waitFor(() => expect(followUser).toHaveBeenCalledWith("alex"));

    expect(toastSuccess).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Unfollow alex" })).toBeInTheDocument();
  });

  it("handles unfollow", async () => {
    render(<FollowButton userAlias="alex" initialFollowing />);

    fireEvent.click(screen.getByRole("button", { name: "Unfollow alex" }));
    await waitFor(() => expect(unfollowUser).toHaveBeenCalledWith("alex"));
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("notifies parent on follow change", async () => {
    const onFollowChange = vi.fn();
    render(<FollowButton userAlias="alex" onFollowChange={onFollowChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Follow alex" }));

    await waitFor(() => expect(onFollowChange).toHaveBeenCalledWith(true));
  });

  it("reverts optimistic follow on error", async () => {
    followUser.mockRejectedValue(new Error("Boom"));
    render(<FollowButton userAlias="alex" />);

    fireEvent.click(screen.getByRole("button", { name: "Follow alex" }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(apiError).toHaveBeenCalledWith(
      "Failed to follow user",
      expect.any(Error),
      "/api/v1/users/alex/follow",
      "POST",
    );
    expect(screen.getByRole("button", { name: "Follow alex" })).toBeInTheDocument();
  });

  it("reverts optimistic unfollow on error", async () => {
    unfollowUser.mockRejectedValue(new Error("Boom"));
    render(<FollowButton userAlias="alex" initialFollowing />);

    fireEvent.click(screen.getByRole("button", { name: "Unfollow alex" }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(apiError).toHaveBeenCalledWith(
      "Failed to unfollow user",
      expect.any(Error),
      "/api/v1/users/alex/unfollow",
      "DELETE",
    );
    expect(screen.getByRole("button", { name: "Unfollow alex" })).toBeInTheDocument();
  });

  it("maps default variant to secondary", () => {
    render(<FollowButton userAlias="alex" />);

    expect(screen.getByRole("button", { name: "Follow alex" })).toHaveAttribute(
      "data-variant",
      "secondary",
    );
  });

  it("prevents duplicate requests while loading", async () => {
    let resolveFollow: () => void = () => {};
    const followPromise = new Promise<void>((resolve) => {
      resolveFollow = resolve;
    });
    followUser.mockReturnValue(followPromise);

    render(<FollowButton userAlias="alex" />);

    const button = screen.getByRole("button", { name: "Follow alex" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(followUser).toHaveBeenCalledTimes(1);
    resolveFollow();
    await followPromise;
  });
});
