import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "../../src/contexts/ToastContext";
import { useToast } from "../../src/components/ui/Toast";

const TestComponent = () => {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        toast.showToast({ variant: "success", title: "Saved", message: "Profile updated" })
      }
    >
      Show Toast
    </button>
  );
};

describe("Toast UI hook", () => {
  it("shows toast with composed message", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show Toast" }));
    expect(screen.getByText("Saved: Profile updated")).toBeInTheDocument();
  });
});
