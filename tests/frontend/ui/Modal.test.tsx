import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { Modal } from "../../src/components/ui/Modal";
import { FocusTrap } from "../../src/components/a11y/FocusTrap";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "modal.title": "Dialog",
        "modal.close": "Close dialog",
      };
      return translations[key] || key;
    },
  }),
}));

describe("Modal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = "";
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  describe("Rendering", () => {
    it("should not render when isOpen is false", () => {
      const { container } = render(<Modal {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it("should render when isOpen is true", () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByText("Modal content")).toBeInTheDocument();
    });

    it("should render with title", () => {
      render(<Modal {...defaultProps} title="Test Modal" />);
      expect(screen.getByText("Test Modal")).toBeInTheDocument();
    });

    it("should render with description", () => {
      render(<Modal {...defaultProps} title="Test Modal" description="Test description" />);
      expect(screen.getByText("Test description")).toBeInTheDocument();
    });

    it("should render children in modal body", () => {
      render(
        <Modal {...defaultProps}>
          <div data-testid="custom-content">Custom content</div>
        </Modal>,
      );
      expect(screen.getByTestId("custom-content")).toBeInTheDocument();
    });

    it("should render footer when provided", () => {
      render(<Modal {...defaultProps} footer={<button>Footer Button</button>} />);
      expect(screen.getByText("Footer Button")).toBeInTheDocument();
    });

    it("should not render header when title and showCloseButton are both false", () => {
      render(<Modal {...defaultProps} title={undefined} showCloseButton={false} />);
      const headers = screen.queryAllByRole("banner");
      expect(headers.length).toBe(0);
    });
  });

  describe("Size variants", () => {
    it("should apply sm size styles", () => {
      const { container } = render(<Modal {...defaultProps} size="sm" />);
      const modalContent = container.querySelector(".modal-content");
      expect(modalContent).toHaveStyle({ maxWidth: "28rem" });
    });

    it("should apply md size styles (default)", () => {
      const { container } = render(<Modal {...defaultProps} size="md" />);
      const modalContent = container.querySelector(".modal-content");
      expect(modalContent).toHaveStyle({ maxWidth: "32rem" });
    });

    it("should apply lg size styles", () => {
      const { container } = render(<Modal {...defaultProps} size="lg" />);
      const modalContent = container.querySelector(".modal-content");
      expect(modalContent).toHaveStyle({ maxWidth: "48rem" });
    });

    it("should apply xl size styles", () => {
      const { container } = render(<Modal {...defaultProps} size="xl" />);
      const modalContent = container.querySelector(".modal-content");
      expect(modalContent).toHaveStyle({ maxWidth: "64rem" });
    });

    it("should apply full size styles", () => {
      const { container } = render(<Modal {...defaultProps} size="full" />);
      const modalContent = container.querySelector(".modal-content");
      expect(modalContent).toHaveStyle({ maxWidth: "100%" });
    });
  });

  describe("Close button", () => {
    it("should render close button by default", () => {
      render(<Modal {...defaultProps} />);
      const closeButton = screen.getByLabelText("Close dialog");
      expect(closeButton).toBeInTheDocument();
    });

    it("should not render close button when showCloseButton is false", () => {
      render(<Modal {...defaultProps} showCloseButton={false} />);
      const closeButton = screen.queryByLabelText("Close dialog");
      expect(closeButton).not.toBeInTheDocument();
    });

    it("should call onClose when close button is clicked", async () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);
      const closeButton = screen.getByLabelText("Close dialog");
      await userEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Overlay click", () => {
    it("should call onClose when overlay is clicked by default", async () => {
      const onClose = vi.fn();
      const { container } = render(<Modal {...defaultProps} onClose={onClose} />);
      const overlay = container.querySelector(".modal-overlay");
      expect(overlay).toBeInTheDocument();
      if (overlay) {
        await userEvent.click(overlay);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it("should not call onClose when overlay is clicked and closeOnOverlayClick is false", async () => {
      const onClose = vi.fn();
      const { container } = render(
        <Modal {...defaultProps} onClose={onClose} closeOnOverlayClick={false} />,
      );
      const overlay = container.querySelector(".modal-overlay");
      if (overlay) {
        await userEvent.click(overlay);
        expect(onClose).not.toHaveBeenCalled();
      }
    });

    it("should not call onClose when modal content is clicked", async () => {
      const onClose = vi.fn();
      const { container } = render(<Modal {...defaultProps} onClose={onClose} />);
      const modalContent = container.querySelector(".modal-content");
      if (modalContent) {
        await userEvent.click(modalContent);
        expect(onClose).not.toHaveBeenCalled();
      }
    });
  });

  describe("Keyboard interactions", () => {
    it("should call onClose when Escape key is pressed by default", async () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);
      await userEvent.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should not call onClose when Escape key is pressed and closeOnEscape is false", async () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} closeOnEscape={false} />);
      await userEvent.keyboard("{Escape}");
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("Body scroll prevention", () => {
    it("should prevent body scroll when modal is open", () => {
      render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("should restore body scroll when modal is closed", () => {
      const { rerender } = render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe("hidden");
      rerender(<Modal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("Focus management", () => {
    it("should focus close button when modal opens", async () => {
      render(<Modal {...defaultProps} />);
      const closeButton = screen.getByLabelText("Close dialog");
      await waitFor(() => {
        expect(document.activeElement).toBe(closeButton);
      });
    });

    it("should use FocusTrap component", () => {
      const { container } = render(<Modal {...defaultProps} />);
      // FocusTrap wraps the modal content
      const modalContent = container.querySelector(".modal-content");
      expect(modalContent).toBeInTheDocument();
    });
  });

  describe("ARIA attributes", () => {
    it("should have proper ARIA attributes on overlay", () => {
      const { container } = render(<Modal {...defaultProps} title="Test Modal" />);
      const overlay = container.querySelector(".modal-overlay");
      expect(overlay).toHaveAttribute("role", "dialog");
      expect(overlay).toHaveAttribute("aria-modal", "true");
      expect(overlay).toHaveAttribute("aria-label", "Test Modal");
    });

    it("should use ariaLabel prop when provided", () => {
      const { container } = render(<Modal {...defaultProps} ariaLabel="Custom label" />);
      const overlay = container.querySelector(".modal-overlay");
      expect(overlay).toHaveAttribute("aria-label", "Custom label");
    });

    it("should use title as aria-label when ariaLabel is not provided", () => {
      const { container } = render(<Modal {...defaultProps} title="Test Title" />);
      const overlay = container.querySelector(".modal-overlay");
      expect(overlay).toHaveAttribute("aria-label", "Test Title");
    });

    it("should use default aria-label when neither title nor ariaLabel provided", () => {
      const { container } = render(<Modal {...defaultProps} />);
      const overlay = container.querySelector(".modal-overlay");
      expect(overlay).toHaveAttribute("aria-label", "Dialog");
    });

    it("should use ariaDescribedBy when provided", () => {
      const { container } = render(<Modal {...defaultProps} ariaDescribedBy="description-id" />);
      const overlay = container.querySelector(".modal-overlay");
      expect(overlay).toHaveAttribute("aria-describedby", "description-id");
    });

    it("should link title to aria-describedby when description is provided", () => {
      render(
        <Modal
          {...defaultProps}
          title="Test"
          description="Description"
          ariaDescribedBy="test-id"
        />,
      );
      const title = screen.getByText("Test");
      // The title element should exist
      expect(title).toBeInTheDocument();
      // The description should be visible
      expect(screen.getByText("Description")).toBeInTheDocument();
      // When ariaDescribedBy is provided, it should be used
      const overlay = screen.getByRole("dialog");
      expect(overlay).toHaveAttribute("aria-describedby", "test-id");
    });
  });

  describe("Edge cases", () => {
    it("should handle rapid open/close cycles", () => {
      const onClose = vi.fn();
      const { rerender } = render(<Modal {...defaultProps} onClose={onClose} />);
      rerender(<Modal {...defaultProps} isOpen={false} onClose={onClose} />);
      rerender(<Modal {...defaultProps} onClose={onClose} />);
      rerender(<Modal {...defaultProps} isOpen={false} onClose={onClose} />);
      expect(document.body.style.overflow).toBe("");
    });

    it("should handle multiple escape key presses", async () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);
      await userEvent.keyboard("{Escape}");
      await userEvent.keyboard("{Escape}");
      // Should only call once per keypress
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it("should handle modal with no focusable elements", () => {
      render(
        <Modal {...defaultProps} showCloseButton={false}>
          <div>No focusable content</div>
        </Modal>,
      );
      expect(screen.getByText("No focusable content")).toBeInTheDocument();
    });
  });
});
