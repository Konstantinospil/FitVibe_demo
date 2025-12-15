import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { FocusTrap } from "../a11y/FocusTrap";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

const sizeStyles: Record<"sm" | "md" | "lg" | "xl" | "full", React.CSSProperties> = {
  sm: { maxWidth: "28rem" },
  md: { maxWidth: "32rem" },
  lg: { maxWidth: "48rem" },
  xl: { maxWidth: "64rem" },
  full: { maxWidth: "100%" },
};

/**
 * Modal component with focus trap and keyboard navigation (WCAG 2.2 AA).
 * Supports overlay click, escape key, and proper ARIA attributes.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  ariaLabel,
  ariaDescribedBy,
}) => {
  const { t } = useTranslation("common");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, closeOnEscape, onClose]);

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(11, 12, 16, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "var(--space-md)",
      }}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title || t("modal.title") || "Dialog"}
      aria-describedby={ariaDescribedBy}
    >
      <FocusTrap active={isOpen} initialFocus={closeButtonRef}>
        <div
          ref={modalRef}
          className="modal-content"
          style={{
            background: "var(--color-bg-card)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-e3)",
            width: "100%",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            ...sizeStyles[size],
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || showCloseButton) && (
            <header
              className="modal-header"
              style={{
                padding: "var(--space-lg) var(--space-xl)",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-md)",
              }}
            >
              {title && (
                <h2
                  id={ariaDescribedBy}
                  className="modal-title"
                  style={{
                    margin: 0,
                    fontSize: "var(--font-size-lg)",
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  style={{
                    margin: "var(--space-xs) 0 0 0",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {description}
                </p>
              )}
              {showCloseButton && (
                <Button
                  ref={closeButtonRef}
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  aria-label={t("modal.close") || "Close dialog"}
                  style={{
                    minWidth: "auto",
                    padding: "var(--space-xs)",
                  }}
                >
                  <X size={20} />
                </Button>
              )}
            </header>
          )}

          <div
            className="modal-body"
            style={{
              padding: "var(--space-xl)",
              overflowY: "auto",
              flex: 1,
            }}
          >
            {children}
          </div>

          {footer && (
            <footer
              className="modal-footer"
              style={{
                padding: "var(--space-md) var(--space-xl)",
                borderTop: "1px solid var(--color-border)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "var(--space-sm)",
              }}
            >
              {footer}
            </footer>
          )}
        </div>
      </FocusTrap>
    </div>
  );
};
