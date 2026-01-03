import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "../../src/components/ui/Modal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => (key === "close" ? "Close" : key),
  }),
}));

const renderModal = (overrides?: Partial<React.ComponentProps<typeof Modal>>) => {
  const onClose = overrides?.onClose ?? vi.fn();
  const utils = render(
    <Modal isOpen onClose={onClose} title="Modal title" {...overrides}>
      <div>Modal body</div>
    </Modal>,
  );

  return { onClose, ...utils };
};

describe("Modal", () => {
  it("returns null when closed", () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <div>Hidden</div>
      </Modal>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on overlay click when enabled", () => {
    const { onClose } = renderModal();
    const dialog = screen.getByRole("dialog");

    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when clicking inside the modal", () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByText("Modal body"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on Escape when enabled", () => {
    const { onClose } = renderModal();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores Escape when disabled", () => {
    const { onClose } = renderModal({ closeOnEscape: false });

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("focuses the close button after render", () => {
    vi.useFakeTimers();
    renderModal();

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    vi.useRealTimers();
  });

  it("updates close button background on hover", () => {
    renderModal();
    const closeButton = screen.getByRole("button", { name: "Close" });

    fireEvent.mouseEnter(closeButton);
    expect(closeButton).toHaveStyle({ background: "var(--color-surface-muted)" });

    fireEvent.mouseLeave(closeButton);
    expect(closeButton).toHaveStyle({ background: "transparent" });
  });
});
