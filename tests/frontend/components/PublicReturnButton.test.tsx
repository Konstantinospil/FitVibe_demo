import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PublicReturnButton from "../../src/components/PublicReturnButton";

const navigate = vi.fn();
const authState = vi.hoisted(() => ({ isAuthenticated: false }));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

vi.mock("../../src/store/auth.store", () => ({
  useAuthStore: (selector: (state: { isAuthenticated: boolean }) => boolean) => selector(authState),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => (key === "navigation.back" ? "Back" : key),
  }),
}));

describe("PublicReturnButton", () => {
  beforeEach(() => {
    navigate.mockReset();
    authState.isAuthenticated = false;
  });

  it("sends guests to login", async () => {
    const user = userEvent.setup();
    const { container } = render(<PublicReturnButton />);

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(navigate).toHaveBeenCalledWith("/login");
    expect(container.querySelector("[data-icon='login']")).toBeInTheDocument();
  });

  it("sends signed-in users home", async () => {
    authState.isAuthenticated = true;
    const user = userEvent.setup();
    const { container } = render(<PublicReturnButton />);

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(navigate).toHaveBeenCalledWith("/");
    expect(container.querySelector("[data-icon='home']")).toBeInTheDocument();
  });
});
