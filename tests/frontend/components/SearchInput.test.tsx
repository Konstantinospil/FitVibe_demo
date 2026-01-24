import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchInput } from "../../src/components/utils/SearchInput";

describe("SearchInput", () => {
  it("renders placeholder and triggers onChange", () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "lift" } });

    expect(onChange).toHaveBeenCalledWith("lift");
  });

  it("supports custom placeholder", () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Find workouts" />);

    expect(screen.getByPlaceholderText("Find workouts")).toBeInTheDocument();
  });
});
