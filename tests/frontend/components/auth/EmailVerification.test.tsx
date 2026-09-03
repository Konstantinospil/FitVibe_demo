import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailVerification } from "../../src/components/auth/EmailVerification";

const resendVerificationEmail = vi.fn();
const showToast = vi.fn();
const navigate = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("../../src/components/ui/Toast", () => ({
  useToast: () => ({ showToast }),
}));

vi.mock("../../src/services/api", () => ({
  resendVerificationEmail: (...args: unknown[]) => resendVerificationEmail(...args),
}));

describe("EmailVerification", () => {
  beforeEach(() => {
    resendVerificationEmail.mockReset().mockResolvedValue(undefined);
    showToast.mockReset();
    navigate.mockReset();
    vi.useRealTimers();
  });

  it("requires an email before resending", async () => {
    render(
      <MemoryRouter>
        <EmailVerification />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /auth.verification.resend/ }));
    expect(await screen.findByText("auth.verification.emailRequired")).toBeInTheDocument();
  });

  it("resends a verification email", async () => {
    render(
      <MemoryRouter>
        <EmailVerification />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("auth.verification.emailPlaceholder"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /auth.verification.resend/ }));

    await waitFor(() =>
      expect(resendVerificationEmail).toHaveBeenCalledWith({ email: "user@example.com" }),
    );
    expect(showToast).toHaveBeenCalledWith({
      variant: "success",
      title: "auth.verification.emailSent",
      message: "auth.verification.checkInbox",
    });
  });

  it("shows a resend failure", async () => {
    resendVerificationEmail.mockRejectedValue(new Error("fail"));
    render(
      <MemoryRouter>
        <EmailVerification />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("auth.verification.emailPlaceholder"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /auth.verification.resend/ }));
    expect(await screen.findByText("auth.verification.resendFailed")).toBeInTheDocument();
  });

  it("verifies a token from the URL", async () => {
    const onVerified = vi.fn();
    render(
      <MemoryRouter initialEntries={["/verify?token=abc"]}>
        <Routes>
          <Route path="/verify" element={<EmailVerification onVerified={onVerified} />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("auth.verification.verifying")).toBeInTheDocument();
    expect(
      await screen.findByText("auth.verification.verified", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(onVerified).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "common.continue" }));
    expect(navigate).toHaveBeenCalledWith("/");
  });
});
