import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Avatar } from "../../../src/components/ui/Avatar";

describe("Avatar", () => {
  it("should render avatar with name", () => {
    render(<Avatar name="John Doe" />);
    const avatar = screen.getByLabelText("John Doe");
    expect(avatar).toBeInTheDocument();
  });

  it("should display initials when no src is provided", () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("should handle single name", () => {
    render(<Avatar name="John" />);
    // Single name takes first character
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("should handle long name and use first two words", () => {
    render(<Avatar name="John Michael Doe Smith" />);
    expect(screen.getByText("JM")).toBeInTheDocument();
  });

  it("should handle empty string name", () => {
    render(<Avatar name="" />);
    const avatar = screen.getByLabelText("");
    expect(avatar).toBeInTheDocument();
  });

  it("should display image when src is provided", () => {
    render(<Avatar name="John Doe" src="/avatar.jpg" />);
    const img = screen.getByAltText("John Doe");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/avatar.jpg");
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("should not display initials when src is provided", () => {
    render(<Avatar name="John Doe" src="/avatar.jpg" />);
    expect(screen.queryByText("JD")).not.toBeInTheDocument();
  });

  it("should use default size of 48px", () => {
    const { container } = render(<Avatar name="John Doe" />);
    const avatar = container.querySelector("div");
    expect(avatar).toHaveStyle({ width: "48px", height: "48px" });
  });

  it("should apply custom size", () => {
    const { container } = render(<Avatar name="John Doe" size={64} />);
    const avatar = container.querySelector("div");
    expect(avatar).toHaveStyle({ width: "64px", height: "64px" });
  });

  it("should display online status indicator", () => {
    const { container } = render(<Avatar name="John Doe" status="online" />);
    const statusIndicator = container.querySelector("span[aria-hidden='true']");
    expect(statusIndicator).toBeInTheDocument();
  });

  it("should display offline status indicator", () => {
    const { container } = render(<Avatar name="John Doe" status="offline" />);
    const statusIndicator = container.querySelector("span[aria-hidden='true']");
    expect(statusIndicator).toBeInTheDocument();
  });

  it("should display busy status indicator", () => {
    const { container } = render(<Avatar name="John Doe" status="busy" />);
    const statusIndicator = container.querySelector("span[aria-hidden='true']");
    expect(statusIndicator).toBeInTheDocument();
  });

  it("should display away status indicator", () => {
    const { container } = render(<Avatar name="John Doe" status="away" />);
    const statusIndicator = container.querySelector("span[aria-hidden='true']");
    expect(statusIndicator).toBeInTheDocument();
  });

  it("should not display status indicator when status is not provided", () => {
    const { container } = render(<Avatar name="John Doe" />);
    // Status indicator should not be present
    const statusIndicator = container.querySelector("span[aria-hidden='true']");
    // There might be other aria-hidden elements, so we check the structure
    const avatar = container.querySelector("div[aria-label='John Doe']");
    expect(avatar?.querySelectorAll("span[aria-hidden='true']").length).toBe(0);
  });

  it("should apply custom style", () => {
    const customStyle = { border: "2px solid red" };
    const { container } = render(<Avatar name="John Doe" style={customStyle} />);
    const avatar = container.querySelector("div");
    expect(avatar).toHaveStyle(customStyle);
  });

  it("should pass through other HTML attributes", () => {
    const { container } = render(
      <Avatar name="John Doe" data-testid="avatar" className="custom-avatar" />,
    );
    const avatar = container.querySelector("[data-testid='avatar']");
    expect(avatar).toHaveClass("custom-avatar");
  });
});
