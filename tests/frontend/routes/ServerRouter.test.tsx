import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

vi.mock("react-router-dom/server", () => ({
  StaticRouter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../src/routes/ProtectedRoutes", () => ({
  default: () => <div>Protected content</div>,
}));

import { ServerRouter } from "../../src/routes/ServerRouter";

describe("ServerRouter", () => {
  it("renders protected routes without hydration", () => {
    const queryClient = new QueryClient();
    render(<ServerRouter location="/settings" queryClient={queryClient} />);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("renders protected routes with hydration", () => {
    const queryClient = new QueryClient();
    render(<ServerRouter location="/settings" queryClient={queryClient} dehydratedState={{}} />);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
