import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FollowButton } from "../../src/components/feed/FollowButton";

const followUser = vi.fn().mockResolvedValue(undefined);
const unfollowUser = vi.fn().mockResolvedValue(undefined);
const toastSuccess = vi.fn();
const toastError = vi.fn();

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

describe("FollowButton", () => {
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
});
