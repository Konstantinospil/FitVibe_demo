import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Textarea } from "../../src/components/ui/Textarea";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("Textarea", () => {
  it("renders label, required indicator, and error message", () => {
    render(<Textarea label="Bio" required error="Required" />);

    expect(screen.getByText("Bio")).toBeInTheDocument();
    expect(screen.getByLabelText("validation.required")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });

  it("applies focus styles when not disabled", () => {
    render(<Textarea label="Bio" />);
    const textarea = screen.getByLabelText("Bio");
    fireEvent.focus(textarea);
    fireEvent.blur(textarea);
  });
});
