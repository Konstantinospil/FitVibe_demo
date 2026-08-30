import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "../../src/components/layout/Sidebar";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("Sidebar", () => {
  it("renders items when open and handles close", () => {
    const onClose = vi.fn();
    const HomeIcon = () => <span />;
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Sidebar
          isOpen
          onClose={onClose}
          items={[{ to: "/", labelKey: "navigation.home", icon: HomeIcon }]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("navigation.sidebar")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("navigation.closeSidebar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    const HomeIcon = () => <span />;
    const { container } = render(
      <MemoryRouter>
        <Sidebar
          isOpen={false}
          onClose={vi.fn()}
          items={[{ to: "/", labelKey: "navigation.home", icon: HomeIcon }]}
        />
      </MemoryRouter>,
    );

    expect(container.firstChild).toBeNull();
  });
});
