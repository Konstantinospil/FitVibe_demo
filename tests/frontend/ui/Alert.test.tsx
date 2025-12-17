import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { Alert } from "../../src/components/ui/Alert";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "alert.close": "Close alert",
      };
      return translations[key] || key;
    },
  }),
}));

describe("Alert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Rendering", () => {
    it("should render alert element", () => {
      render(<Alert>Alert message</Alert>);
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(screen.getByText("Alert message")).toBeInTheDocument();
    });

    it("should render with title", () => {
      render(<Alert title="Alert Title">Alert message</Alert>);
      expect(screen.getByText("Alert Title")).toBeInTheDocument();
      expect(screen.getByText("Alert message")).toBeInTheDocument();
    });

    it("should render without title", () => {
      render(<Alert>Alert message</Alert>);
      expect(screen.getByText("Alert message")).toBeInTheDocument();
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });
  });

  describe("Variants", () => {
    it("should apply info variant (default)", () => {
      render(<Alert>Info message</Alert>);
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });

    it("should apply success variant", () => {
      render(<Alert variant="success">Success message</Alert>);
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(screen.getByText("Success message")).toBeInTheDocument();
    });

    it("should apply error variant", () => {
      render(<Alert variant="error">Error message</Alert>);
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute("aria-live", "assertive");
    });

    it("should apply warning variant", () => {
      render(<Alert variant="warning">Warning message</Alert>);
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });

    it("should apply danger variant", () => {
      render(<Alert variant="danger">Danger message</Alert>);
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute("aria-live", "assertive");
    });
  });

  describe("ARIA attributes", () => {
    it("should have role alert", () => {
      render(<Alert>Message</Alert>);
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });

    it("should have aria-live assertive for error variant", () => {
      render(<Alert variant="error">Error</Alert>);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
    });

    it("should have aria-live assertive for danger variant", () => {
      render(<Alert variant="danger">Danger</Alert>);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
    });

    it("should have aria-live polite for other variants", () => {
      render(<Alert variant="info">Info</Alert>);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "polite");
    });

    it("should have aria-live polite for success variant", () => {
      render(<Alert variant="success">Success</Alert>);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Close button", () => {
    it("should not render close button by default", () => {
      render(<Alert>Message</Alert>);
      const closeButton = screen.queryByLabelText("Close alert");
      expect(closeButton).not.toBeInTheDocument();
    });

    it("should render close button when dismissible is true", () => {
      const onClose = vi.fn();
      render(
        <Alert dismissible onClose={onClose}>
          Message
        </Alert>,
      );
      const closeButton = screen.getByLabelText("Close alert");
      expect(closeButton).toBeInTheDocument();
    });

    it("should render close button when onClose is provided", () => {
      const onClose = vi.fn();
      render(<Alert onClose={onClose}>Message</Alert>);
      const closeButton = screen.getByLabelText("Close alert");
      expect(closeButton).toBeInTheDocument();
    });

    it("should call onClose when close button is clicked", async () => {
      const onClose = vi.fn();
      render(
        <Alert dismissible onClose={onClose}>
          Message
        </Alert>,
      );
      const closeButton = screen.getByLabelText("Close alert");
      await userEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Icons", () => {
    it("should render icon for each variant", () => {
      const { container, rerender } = render(<Alert variant="success">Success</Alert>);
      let icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();

      rerender(<Alert variant="error">Error</Alert>);
      icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();

      rerender(<Alert variant="warning">Warning</Alert>);
      icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();

      rerender(<Alert variant="info">Info</Alert>);
      icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();

      rerender(<Alert variant="danger">Danger</Alert>);
      icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("should have aria-hidden on icon container", () => {
      const { container } = render(<Alert>Message</Alert>);
      const iconContainer = container.querySelector('[aria-hidden="true"]');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should apply custom className", () => {
      render(<Alert className="custom-class">Message</Alert>);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("custom-class");
    });

    it("should apply custom style", () => {
      const { container } = render(<Alert style={{ marginTop: "10px" }}>Message</Alert>);
      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveStyle({ marginTop: "10px" });
    });

    it("should merge custom style with default styles", () => {
      const { container } = render(<Alert style={{ padding: "20px" }}>Message</Alert>);
      const alert = container.querySelector('[role="alert"]');
      expect(alert).toHaveStyle({
        padding: "20px",
        display: "flex",
      });
    });
  });

  describe("Props forwarding", () => {
    it("should forward standard div attributes", () => {
      render(
        <Alert id="alert-id" className="test-class" data-testid="test-alert">
          Message
        </Alert>,
      );
      const alert = screen.getByTestId("test-alert");
      expect(alert).toHaveAttribute("id", "alert-id");
      expect(alert).toHaveClass("test-class");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty children", () => {
      render(<Alert>{""}</Alert>);
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });

    it("should handle title without children", () => {
      render(<Alert title="Title only" />);
      expect(screen.getByText("Title only")).toBeInTheDocument();
    });

    it("should handle very long message", () => {
      const longMessage = "a".repeat(500);
      render(<Alert>{longMessage}</Alert>);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it("should handle complex children", () => {
      render(
        <Alert>
          Message with <strong>bold</strong> text
        </Alert>,
      );
      expect(screen.getByText(/Message with/)).toBeInTheDocument();
      expect(screen.getByText("bold")).toBeInTheDocument();
    });

    it("should handle dismissible without onClose", () => {
      render(<Alert dismissible>Message</Alert>);
      const closeButton = screen.getByLabelText("Close alert");
      expect(closeButton).toBeInTheDocument();
      // Should not throw when clicked without onClose
      expect(() => userEvent.click(closeButton)).not.toThrow();
    });
  });
});
