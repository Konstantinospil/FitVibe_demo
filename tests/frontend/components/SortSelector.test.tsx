import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SortSelector } from "../../src/components/utils/SortSelector";

describe("SortSelector", () => {
  it("renders default label and handles changes", () => {
    const onChange = vi.fn();
    render(
      <SortSelector
        options={[
          { value: "date", label: "Date" },
          { value: "name", label: "Name" },
        ]}
        value="date"
        onChange={onChange}
      />,
    );

    expect(screen.getByText("Sort by")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "name" } });
    expect(onChange).toHaveBeenCalledWith("name");
  });

  it("renders a custom label", () => {
    render(
      <SortSelector
        options={[{ value: "score", label: "Score" }]}
        value="score"
        onChange={() => {}}
        label="Order"
      />,
    );

    expect(screen.getByText("Order")).toBeInTheDocument();
  });
});
