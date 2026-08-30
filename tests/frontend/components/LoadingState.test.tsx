import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingState } from "../../src/components/utils/LoadingState";

describe("LoadingState", () => {
  it("renders default message", () => {
    render(<LoadingState />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("hides message when message is empty", () => {
    render(<LoadingState message="" size="lg" />);

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
});
