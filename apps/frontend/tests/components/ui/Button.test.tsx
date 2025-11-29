import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "../../../src/components/ui/Button";

describe("Button", () => {
  it("should render button with children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("should apply primary variant by default", () => {
    const { container } = render(<Button>Primary</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveAttribute("data-variant", "primary");
  });

  it("should apply secondary variant", () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveAttribute("data-variant", "secondary");
  });

  it("should apply ghost variant", () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveAttribute("data-variant", "ghost");
  });

  it("should apply danger variant", () => {
    const { container } = render(<Button variant="danger">Danger</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveAttribute("data-variant", "danger");
  });

  it("should apply medium size by default", () => {
    const { container } = render(<Button>Medium</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveAttribute("data-size", "md");
  });

  it("should apply small size", () => {
    const { container } = render(<Button size="sm">Small</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveAttribute("data-size", "sm");
  });

  it("should apply large size", () => {
    const { container } = render(<Button size="lg">Large</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveAttribute("data-size", "lg");
  });

  it("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  it("should be disabled when loading", () => {
    render(<Button isLoading>Loading</Button>);
    const button = screen.getByRole("button", { name: "Loading" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  it("should show loading spinner when isLoading is true", () => {
    const { container } = render(<Button isLoading>Loading</Button>);
    const spinner = container.querySelector("span[aria-hidden='true']");
    expect(spinner).toBeInTheDocument();
  });

  it("should render left icon", () => {
    const LeftIcon = () => <span data-testid="left-icon">←</span>;
    render(<Button leftIcon={<LeftIcon />}>With Left Icon</Button>);
    expect(screen.getByTestId("left-icon")).toBeInTheDocument();
  });

  it("should render right icon", () => {
    const RightIcon = () => <span data-testid="right-icon">→</span>;
    render(<Button rightIcon={<RightIcon />}>With Right Icon</Button>);
    expect(screen.getByTestId("right-icon")).toBeInTheDocument();
  });

  it("should apply fullWidth style when fullWidth is true", () => {
    const { container } = render(<Button fullWidth>Full Width</Button>);
    const button = container.querySelector("button");
    expect(button).toHaveStyle({ width: "100%" });
  });

  it("should call onClick handler when clicked", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    screen.getByRole("button", { name: "Click me" }).click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should not call onClick when disabled", () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>,
    );
    screen.getByRole("button", { name: "Disabled" }).click();
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should not call onClick when loading", () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading onClick={handleClick}>
        Loading
      </Button>,
    );
    screen.getByRole("button", { name: "Loading" }).click();
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should apply custom style", () => {
    const customStyle = { backgroundColor: "red" };
    const { container } = render(<Button style={customStyle}>Custom</Button>);
    const button = container.querySelector("button") as HTMLButtonElement;
    expect(button?.style.backgroundColor).toBe("red");
  });

  it("should forward ref", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("should pass through other HTML attributes", () => {
    render(
      <Button type="submit" data-testid="submit-btn" aria-label="Submit form">
        Submit
      </Button>,
    );
    const button = screen.getByTestId("submit-btn");
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAttribute("aria-label", "Submit form");
  });
});
