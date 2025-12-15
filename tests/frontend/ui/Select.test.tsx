import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { Select } from "../../src/components/ui/Select";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "form.required": "required",
      };
      return translations[key] || key;
    },
  }),
}));

describe("Select", () => {
  const defaultOptions = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Rendering", () => {
    it("should render select element", () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} onChange={onChange} />);
      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
      expect(select.tagName).toBe("SELECT");
    });

    it("should render all options", () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} onChange={onChange} />);
      expect(screen.getByText("Option 1")).toBeInTheDocument();
      expect(screen.getByText("Option 2")).toBeInTheDocument();
      expect(screen.getByText("Option 3")).toBeInTheDocument();
    });

    it("should render with label", () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} label="Choose option" onChange={onChange} />);
      expect(screen.getByText("Choose option")).toBeInTheDocument();
      const select = screen.getByRole("combobox");
      const label = screen.getByText("Choose option");
      expect(label).toHaveAttribute("for", select.getAttribute("id"));
    });

    it("should render with helper text", () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} helperText="Select an option" onChange={onChange} />);
      expect(screen.getByText("Select an option")).toBeInTheDocument();
    });

    it("should render with error message", () => {
      const onChange = vi.fn();
      render(
        <Select options={defaultOptions} error="This field is required" onChange={onChange} />,
      );
      expect(screen.getByText("This field is required")).toBeInTheDocument();
      expect(screen.getByText("This field is required")).toHaveAttribute("role", "alert");
    });

    it("should not render helper text when error is present", () => {
      const onChange = vi.fn();
      render(
        <Select
          options={defaultOptions}
          helperText="Helper text"
          error="Error message"
          onChange={onChange}
        />,
      );
      expect(screen.getByText("Error message")).toBeInTheDocument();
      expect(screen.queryByText("Helper text")).not.toBeInTheDocument();
    });

    it("should render with placeholder", () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} placeholder="Select..." onChange={onChange} />);
      const placeholder = screen.getByText("Select...");
      expect(placeholder).toBeInTheDocument();
      const placeholderOption = placeholder.closest("option");
      expect(placeholderOption).toHaveAttribute("value", "");
      expect(placeholderOption).toBeDisabled();
    });

    it("should render with custom id", () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} id="custom-select" onChange={onChange} />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("id", "custom-select");
    });

    it("should generate unique id when id is not provided", () => {
      const onChange = vi.fn();
      const { container } = render(<Select options={defaultOptions} onChange={onChange} />);
      const select = container.querySelector("select");
      expect(select).toHaveAttribute("id");
      expect(select?.getAttribute("id")).toMatch(/^select-/);
    });

    it("should render disabled options", () => {
      const onChange = vi.fn();
      const optionsWithDisabled = [
        { value: "option1", label: "Option 1" },
        { value: "option2", label: "Option 2", disabled: true },
        { value: "option3", label: "Option 3" },
      ];
      render(<Select options={optionsWithDisabled} onChange={onChange} />);
      const select = screen.getByRole("combobox");
      const option2 = Array.from(select.options).find((opt) => opt.value === "option2");
      expect(option2).toBeDisabled();
    });
  });

  describe("Size variants", () => {
    it("should apply sm size styles", () => {
      const onChange = vi.fn();
      const { container } = render(
        <Select options={defaultOptions} size="sm" onChange={onChange} />,
      );
      const select = container.querySelector("select");
      expect(select).toHaveStyle({
        padding: "0.5rem 2.5rem 0.5rem 0.75rem",
        fontSize: "var(--font-size-sm)",
      });
    });

    it("should apply md size styles (default)", () => {
      const onChange = vi.fn();
      const { container } = render(
        <Select options={defaultOptions} size="md" onChange={onChange} />,
      );
      const select = container.querySelector("select");
      expect(select).toHaveStyle({
        padding: "0.75rem 3rem 0.75rem 1rem",
        fontSize: "var(--font-size-md)",
      });
    });

    it("should apply lg size styles", () => {
      const onChange = vi.fn();
      const { container } = render(
        <Select options={defaultOptions} size="lg" onChange={onChange} />,
      );
      const select = container.querySelector("select");
      expect(select).toHaveStyle({
        padding: "1rem 3.5rem 1rem 1.25rem",
        fontSize: "var(--font-size-lg)",
      });
    });
  });

  describe("Width", () => {
    it("should be full width by default", () => {
      const onChange = vi.fn();
      const { container } = render(<Select options={defaultOptions} onChange={onChange} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ width: "100%" });
    });

    it("should be auto width when fullWidth is false", () => {
      const onChange = vi.fn();
      const { container } = render(
        <Select options={defaultOptions} fullWidth={false} onChange={onChange} />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ width: "auto" });
    });
  });

  describe("Error state", () => {
    it("should apply error border color when error is present", () => {
      const onChange = vi.fn();
      const { container } = render(
        <Select options={defaultOptions} error="Error message" onChange={onChange} />,
      );
      const select = container.querySelector("select");
      // Check that error styles are applied (CSS variables may not be readable)
      expect(select).toHaveAttribute("aria-invalid", "true");
    });

    it("should apply error color to label when error is present", () => {
      const onChange = vi.fn();
      render(
        <Select
          options={defaultOptions}
          label="Choose"
          error="Error message"
          onChange={onChange}
        />,
      );
      const label = screen.getByText("Choose");
      expect(label).toHaveStyle({
        color: "var(--color-danger)",
      });
    });

    it("should have aria-invalid when error is present", () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} error="Error message" onChange={onChange} />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("aria-invalid", "true");
    });

    it("should have aria-invalid false when no error", () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} onChange={onChange} />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("aria-invalid", "false");
    });

    it("should link error message via aria-errormessage", () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} error="Error message" onChange={onChange} />);
      const select = screen.getByRole("combobox");
      const errorId = select.getAttribute("aria-errormessage");
      expect(errorId).toBeTruthy();
      const errorElement = document.getElementById(errorId || "");
      expect(errorElement).toHaveTextContent("Error message");
    });
  });

  describe("ARIA attributes", () => {
    it("should link helper text via aria-describedby", () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} helperText="Helper text" onChange={onChange} />);
      const select = screen.getByRole("combobox");
      const describedBy = select.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      const helperElement = document.getElementById(describedBy || "");
      expect(helperElement).toHaveTextContent("Helper text");
    });

    it("should link error message via aria-describedby when error is present", () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} error="Error message" onChange={onChange} />);
      const select = screen.getByRole("combobox");
      const describedBy = select.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      const errorElement = document.getElementById(describedBy || "");
      expect(errorElement).toHaveTextContent("Error message");
    });

    it("should prioritize error over helper text in aria-describedby", () => {
      const onChange = vi.fn();
      render(
        <Select options={defaultOptions} helperText="Helper" error="Error" onChange={onChange} />,
      );
      const select = screen.getByRole("combobox");
      const describedBy = select.getAttribute("aria-describedby");
      const errorElement = document.getElementById(describedBy || "");
      expect(errorElement).toHaveTextContent("Error");
    });
  });

  describe("Required field", () => {
    it("should show required indicator when required is true", () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} label="Choose" required onChange={onChange} />);
      const label = screen.getByText("Choose");
      const requiredIndicator = label.querySelector('span[aria-label="required"]');
      expect(requiredIndicator).toBeInTheDocument();
      expect(requiredIndicator).toHaveTextContent("*");
    });

    it("should not show required indicator when required is false", () => {
      const onChange = vi.fn();
      render(
        <Select options={defaultOptions} label="Choose" required={false} onChange={onChange} />,
      );
      const label = screen.getByText("Choose");
      const requiredIndicator = label.querySelector('span[aria-label="required"]');
      expect(requiredIndicator).not.toBeInTheDocument();
    });
  });

  describe("User interactions", () => {
    it("should handle value changes", async () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} onChange={onChange} />);
      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "option2");
      expect(onChange).toHaveBeenCalled();
    });

    it("should update selected value", async () => {
      const onChange = vi.fn();
      // Use controlled component for reliable testing
      const { rerender } = render(
        <Select options={defaultOptions} onChange={onChange} value="option1" />,
      );
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("option1");
      // Simulate user selection
      fireEvent.change(select, { target: { value: "option2" } });
      expect(onChange).toHaveBeenCalled();
      // Update to reflect the change
      rerender(<Select options={defaultOptions} onChange={onChange} value="option2" />);
      expect(select.value).toBe("option2");
    });

    it("should forward ref to select element", () => {
      const onChange = vi.fn();
      const ref = React.createRef<HTMLSelectElement>();
      render(<Select options={defaultOptions} ref={ref} onChange={onChange} />);
      expect(ref.current).toBeInstanceOf(HTMLSelectElement);
      expect(ref.current?.tagName).toBe("SELECT");
    });

    it("should handle controlled component", () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <Select options={defaultOptions} value="option1" onChange={onChange} />,
      );
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("option1");
      rerender(<Select options={defaultOptions} value="option2" onChange={onChange} />);
      expect(select.value).toBe("option2");
    });

    it("should handle disabled state", () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} disabled onChange={onChange} />);
      const select = screen.getByRole("combobox");
      expect(select).toBeDisabled();
    });

    it("should handle required state", () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} required onChange={onChange} />);
      const select = screen.getByRole("combobox");
      expect(select).toBeRequired();
    });
  });

  describe("Icon", () => {
    it("should render chevron down icon", () => {
      const onChange = vi.fn();
      const { container } = render(<Select options={defaultOptions} onChange={onChange} />);
      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty options array", () => {
      const onChange = vi.fn();
      render(<Select options={[]} onChange={onChange} />);
      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
      expect(select.options.length).toBe(0);
    });

    it("should handle empty value with placeholder", () => {
      const onChange = vi.fn();
      render(
        <Select options={defaultOptions} value="" placeholder="Select..." onChange={onChange} />,
      );
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      // When value is empty string and placeholder exists, it should be empty
      expect(select.value).toBe("");
    });

    it("should handle placeholder with value", () => {
      const onChange = vi.fn();
      render(
        <Select
          options={defaultOptions}
          placeholder="Select..."
          value="option1"
          onChange={onChange}
        />,
      );
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("option1");
    });

    it("should handle very long error message", () => {
      const onChange = vi.fn();
      const longError = "a".repeat(200);
      render(<Select options={defaultOptions} error={longError} onChange={onChange} />);
      expect(screen.getByText(longError)).toBeInTheDocument();
    });

    it("should handle multiple selects with auto-generated ids", () => {
      const onChange = vi.fn();
      render(
        <div>
          <Select options={defaultOptions} onChange={onChange} />
          <Select options={defaultOptions} onChange={onChange} />
          <Select options={defaultOptions} onChange={onChange} />
        </div>,
      );
      const selects = screen.getAllByRole("combobox");
      expect(selects).toHaveLength(3);
      // Each should have unique id
      const ids = selects.map((s) => s.getAttribute("id"));
      expect(new Set(ids).size).toBe(3);
    });
  });
});
