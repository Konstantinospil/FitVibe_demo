import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Breadcrumb from "../../src/components/Breadcrumb";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue || key,
  }),
}));

describe("Breadcrumb", () => {
  it("renders breadcrumb items for admin path", () => {
    render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <Breadcrumb />
      </MemoryRouter>,
    );

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.getByText("users")).toHaveAttribute("aria-current", "page");
  });
});
