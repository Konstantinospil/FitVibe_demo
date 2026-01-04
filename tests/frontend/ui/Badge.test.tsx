import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "../../src/components/ui";

describe("Badge", () => {
  it("renders children with default variant and size styles", () => {
    render(<Badge>Fresh</Badge>);

    const badge = screen.getByText("Fresh");
    expect(badge).toHaveStyle({ backgroundColor: "var(--color-surface-muted)" });
    expect(badge).toHaveStyle({ color: "var(--color-text-primary)" });
    expect(badge).toHaveStyle({ padding: "0.375rem 0.75rem" });
    expect(badge).toHaveStyle({ fontSize: "var(--font-size-sm)" });
    expect(badge).toHaveStyle({ display: "inline-flex" });
    expect(badge).toHaveStyle({ borderRadius: "999px" });
  });

  it("applies variant and size styles", () => {
    render(
      <Badge variant="primary" size="lg">
        Level Up
      </Badge>,
    );

    const badge = screen.getByText("Level Up");
    expect(badge).toHaveStyle({ backgroundColor: "var(--color-primary)" });
    expect(badge).toHaveStyle({ color: "var(--color-primary-on)" });
    expect(badge).toHaveStyle({ padding: "0.5rem 1rem" });
    expect(badge).toHaveStyle({ fontSize: "var(--font-size-base)" });
  });

  it("merges className and inline style overrides", () => {
    render(
      <Badge className="custom-badge" style={{ backgroundColor: "red", padding: "2rem" }}>
        Custom
      </Badge>,
    );

    const badge = screen.getByText("Custom");
    expect(badge).toHaveClass("custom-badge");
    expect(badge).toHaveAttribute("style", expect.stringContaining("background-color: red"));
    expect(badge).toHaveAttribute("style", expect.stringContaining("padding: 2rem"));
  });
});
