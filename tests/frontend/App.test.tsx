import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { useAuthStore } from "../src/store/auth.store";

describe("App", () => {
  afterEach(() => {
    useAuthStore.setState({ isAuthenticated: false, user: null });
    vi.clearAllTimers();
  });

  it("renders the public login shell", async () => {
    const { unmount } = render(<App />);

    expect(
      await screen.findByRole("heading", { name: /welcome back/i }, { timeout: 8000 }),
    ).toBeInTheDocument();

    unmount();
  });
});
