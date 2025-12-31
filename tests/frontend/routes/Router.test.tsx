import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { Router } from "../../src/routes/Router";

vi.mock("react-router-dom/server", () => ({
  StaticRouter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../src/routes/ProtectedRoutes", () => ({
  default: () => <div>Protected content</div>,
}));

describe("Router", () => {
  it("renders protected routes without hydration", () => {
    const queryClient = new QueryClient();
    render(<Router location="/settings" queryClient={queryClient} />);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("renders protected routes with hydration", () => {
    const queryClient = new QueryClient();
    render(<Router location="/settings" queryClient={queryClient} dehydratedState={{}} />);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
