import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Skeleton from "../../../src/components/ui/Skeleton";

describe("Skeleton", () => {
  it("should render skeleton", () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.querySelector("div[aria-hidden='true']");
    expect(skeleton).toBeInTheDocument();
  });

  it("should use default width of 100%", () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.querySelector("div[aria-hidden='true']");
    expect(skeleton).toHaveStyle({ width: "100%" });
  });

  it("should use default height of 1rem", () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.querySelector("div[aria-hidden='true']");
    expect(skeleton).toHaveStyle({ height: "1rem" });
  });

  it("should use default radius of 12px", () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.querySelector("div[aria-hidden='true']");
    expect(skeleton).toHaveStyle({ borderRadius: "12px" });
  });

  it("should apply custom width", () => {
    const { container } = render(<Skeleton width={200} />);
    const skeleton = container.querySelector("div[aria-hidden='true']");
    expect(skeleton).toHaveStyle({ width: "200px" });
  });

  it("should apply custom width as string", () => {
    const { container } = render(<Skeleton width="50%" />);
    const skeleton = container.querySelector("div[aria-hidden='true']");
    expect(skeleton).toHaveStyle({ width: "50%" });
  });

  it("should apply custom height", () => {
    const { container } = render(<Skeleton height={100} />);
    const skeleton = container.querySelector("div[aria-hidden='true']");
    expect(skeleton).toHaveStyle({ height: "100px" });
  });

  it("should apply custom height as string", () => {
    const { container } = render(<Skeleton height="2rem" />);
    const skeleton = container.querySelector("div[aria-hidden='true']");
    expect(skeleton).toHaveStyle({ height: "2rem" });
  });

  it("should apply custom radius", () => {
    const { container } = render(<Skeleton radius={8} />);
    const skeleton = container.querySelector("div[aria-hidden='true']");
    expect(skeleton).toHaveStyle({ borderRadius: "8px" });
  });

  it("should apply custom radius as string", () => {
    const { container } = render(<Skeleton radius="50%" />);
    const skeleton = container.querySelector("div[aria-hidden='true']");
    expect(skeleton).toHaveStyle({ borderRadius: "50%" });
  });

  it("should apply custom style", () => {
    const customStyle = { margin: "10px" };
    const { container } = render(<Skeleton style={customStyle} />);
    const skeleton = container.querySelector("div[aria-hidden='true']");
    expect(skeleton).toHaveStyle(customStyle);
  });

  it("should pass through other HTML attributes", () => {
    const { container } = render(<Skeleton data-testid="skeleton" className="custom-skeleton" />);
    const skeleton = container.querySelector("[data-testid='skeleton']");
    expect(skeleton).toHaveClass("custom-skeleton");
  });

  it("should have aria-hidden attribute", () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.querySelector("div[aria-hidden='true']");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
  });
});
