import React from "react";
import { render, screen } from "@testing-library/react";
import { useToast } from "../src/contexts/ToastContext";
import App from "../src/App";

vi.mock("../src/routes/AppRouter", () => {
  const MockRouter: React.FC = () => {
    const toast = useToast();
    toast.success("Router mounted");
    return <div data-testid="app-router">router-content</div>;
  };

  return {
    default: MockRouter,
  };
});

describe("App", () => {
  it("wraps the router with the toast provider", async () => {
    render(<App />);

    expect(screen.getByTestId("app-router")).toBeInTheDocument();
    expect(await screen.findByText("Router mounted")).toBeInTheDocument();
  });
});
