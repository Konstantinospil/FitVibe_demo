import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ResetPassword from "../../src/pages/ResetPassword";

const resetPassword = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../../src/services/api", () => ({
  resetPassword: (...args: unknown[]) => resetPassword(...args),
}));

describe("ResetPassword", () => {
  it("shows error when passwords do not match", async () => {
    render(
      <MemoryRouter initialEntries={["/reset-password?token=token123"]}>
        <ResetPassword />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("resetPassword.newPasswordPlaceholder"), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByPlaceholderText("resetPassword.confirmPasswordPlaceholder"), {
      target: { value: "Different123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "resetPassword.resetButton" }));
    expect(await screen.findByText("resetPassword.passwordMismatch")).toBeInTheDocument();
  });

  it("submits reset password and shows success state", async () => {
    resetPassword.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter initialEntries={["/reset-password?token=token123"]}>
        <ResetPassword />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("resetPassword.newPasswordPlaceholder"), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByPlaceholderText("resetPassword.confirmPasswordPlaceholder"), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "resetPassword.resetButton" }));

    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith({
        token: "token123",
        newPassword: "Password123!",
      }),
    );

    await screen.findByText("resetPassword.successText");
  });
});
