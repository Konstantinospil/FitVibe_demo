import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DropdownMenu } from "../../src/components/ui/DropdownMenu";

describe("DropdownMenu", () => {
  it("renders items and calls onSelect", () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        items={[
          { label: "First", value: "first" },
          { label: "Divider", value: "divider", divider: true },
          { label: "Second", value: "second" },
        ]}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();

    fireEvent.click(screen.getByText("First"));
    expect(onSelect).toHaveBeenCalledWith("first");
  });

  it("does not call onSelect for disabled items", () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        items={[{ label: "Disabled", value: "disabled", disabled: true }]}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByText("Disabled"));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
