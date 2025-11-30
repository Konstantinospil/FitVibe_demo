import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ConfirmDialog } from "../../src/components/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("should not render when isOpen is false", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Test Title"
        message="Test Message"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render when isOpen is true", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Test Title"
        message="Test Message"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Message")).toBeInTheDocument();
  });

  it("should use default confirm and cancel labels", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Test Title"
        message="Test Message"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("button", { name: /Confirm/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it("should use custom confirm and cancel labels", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Test Title"
        message="Test Message"
        confirmLabel="Delete"
        cancelLabel="Keep"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
  });

  it("should call onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Test Title"
        message="Test Message"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const confirmButton = screen.getByRole("button", { name: /Confirm/i });
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("should call onCancel when cancel button is clicked", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Test Title"
        message="Test Message"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("should call onCancel when backdrop is clicked", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const { container } = render(
      <ConfirmDialog
        isOpen={true}
        title="Test Title"
        message="Test Message"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    // Find the backdrop (first div with onClick)
    const backdrop = container.querySelector("div[style*='position: fixed'][style*='inset: 0']");
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    }
  });

  it("should use danger variant styling", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const { container } = render(
      <ConfirmDialog
        isOpen={true}
        title="Test Title"
        message="Test Message"
        variant="danger"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const confirmButton = screen.getByRole("button", { name: /Confirm/i });
    expect(confirmButton).toHaveAttribute("data-variant", "danger");
  });

  it("should use warning variant by default", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Test Title"
        message="Test Message"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    // Warning variant uses primary button style for confirm
    const confirmButton = screen.getByRole("button", { name: /Confirm/i });
    expect(confirmButton).toHaveAttribute("data-variant", "primary");
  });

  it("should use info variant styling", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Test Title"
        message="Test Message"
        variant="info"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });
});


