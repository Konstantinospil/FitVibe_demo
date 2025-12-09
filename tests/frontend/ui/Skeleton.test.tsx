import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "../../src/components/ui";

describe("Skeleton", () => {
  it("renders an aria-hidden placeholder", async () => {
    render(<Skeleton data-testid="skeleton" width="150px" height="20px" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");

    await waitFor(() => {
      expect(skeleton).toHaveStyle({ width: "150px", height: "20px" });
    });
  });
});
