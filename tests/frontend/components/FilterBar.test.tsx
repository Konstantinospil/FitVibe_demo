import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilterBar } from "../../src/components/utils/FilterBar";

describe("FilterBar", () => {
  it("renders filters and triggers onChange", () => {
    const onChange = vi.fn();
    render(
      <FilterBar
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "all", label: "All" },
              { value: "open", label: "Open" },
            ],
            value: "all",
            onChange,
          },
        ]}
      />,
    );

    expect(screen.getByText("Status")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "open" } });
    expect(onChange).toHaveBeenCalledWith("open");
  });
});
