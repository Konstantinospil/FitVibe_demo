import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "../../src/components/ui";

describe("Avatar", () => {
  it("renders initials when no image source is provided", () => {
    const { container } = render(<Avatar name="Jamie Vardy" />);

    const initials = container.querySelector("span");
    expect(initials).toBeInTheDocument();
    expect(initials?.textContent).toBe("JV");
  });

  it("renders status indicator when status is provided", () => {
    const { container } = render(<Avatar name="Jamie Vardy" status="online" />);

    // Use getAllByLabelText and filter by container
    const avatars = screen.getAllByLabelText("Jamie Vardy");
    const avatar = Array.from(avatars).find((el) => container.contains(el)) || avatars[0];
    const statusIndicator = avatar.querySelector("span[aria-hidden='true']");
    expect(statusIndicator).toBeTruthy();
  });
});
