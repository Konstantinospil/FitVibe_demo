import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
<<<<<<< Updated upstream
import { X } from "lucide-react";
import { FocusTrap } from "../a11y/FocusTrap";
import { Button } from "./Button";

export interface ModalProps {
=======

export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
>>>>>>> Stashed changes
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
<<<<<<< Updated upstream
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

const sizeStyles: Record<"sm" | "md" | "lg" | "xl" | "full", React.CSSProperties> = {
=======
  size?: "sm" | "md" | "lg" | "xl";
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

const sizeStyles: Record<"sm" | "md" | "lg" | "xl", React.CSSProperties> = {
>>>>>>> Stashed changes
  sm: { maxWidth: "28rem" },
  md: { maxWidth: "32rem" },
  lg: { maxWidth: "48rem" },
  xl: { maxWidth: "64rem" },
<<<<<<< Updated upstream
  full: { maxWidth: "100%" },
};

/**
 * Modal component with focus trap and keyboard navigation (WCAG 2.2 AA).
 * Supports overlay click, escape key, and proper ARIA attributes.
=======
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(11, 12, 16, 0.75)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "var(--space-lg)",
};

const modalStyle: React.CSSProperties = {
  background: "var(--color-bg-card)",
  borderRadius: "var(--radius-xl)",
  border: "1px solid var(--color-border)",
  boxShadow: "var(--shadow-e3)",
  width: "100%",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  padding: "var(--space-lg) var(--space-xl)",
  borderBottom: "1px solid var(--color-border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-md)",
};

const contentStyle: React.CSSProperties = {
  padding: "var(--space-lg) var(--space-xl)",
  overflowY: "auto",
  flex: 1,
};

const footerStyle: React.CSSProperties = {
  padding: "var(--space-md) var(--space-xl)",
  borderTop: "1px solid var(--color-border)",
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--space-sm)",
};

/**
 * Modal component with focus trap and accessibility support.
 * Implements WCAG 2.2 AA requirements for modals.
>>>>>>> Stashed changes
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
<<<<<<< Updated upstream
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

=======
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  ...props
}) => {
  const { t } = useTranslation("common");
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap and escape key handling
>>>>>>> Stashed changes
  useEffect(() => {
    if (!isOpen) {
      return;
    }

<<<<<<< Updated upstream
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
=======
    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the modal
    const timer = setTimeout(() => {
      modalRef.current?.focus();
    }, 0);
>>>>>>> Stashed changes

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") {
        onClose();
      }
    };

<<<<<<< Updated upstream
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
=======
    // Handle focus trap
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !modalRef.current) {
        return;
      }

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("keydown", handleTab);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleTab);
      // Restore focus to previous element
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose, closeOnEscape]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======
      style={overlayStyle}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      aria-describedby={description ? "modal-description" : undefined}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        style={{
          ...modalStyle,
          ...sizeStyles[size],
        }}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {(title || showCloseButton) && (
          <header style={headerStyle}>
            {title && (
              <h2
                id="modal-title"
                className="text-lg"
                style={{
                  margin: 0,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                }}
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label={t("close")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-text-secondary)",
                  cursor: "pointer",
                  padding: "var(--space-xs)",
                  borderRadius: "var(--radius-md)",
                  transition: "background-color 150ms ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--color-surface-muted)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>×</span>
              </button>
            )}
          </header>
        )}
        {description && (
          <p
            id="modal-description"
            className="text-sm"
            style={{
              margin: 0,
              padding: "var(--space-md) var(--space-xl)",
              color: "var(--color-text-muted)",
            }}
          >
            {description}
          </p>
        )}
        <div style={contentStyle}>{children}</div>
      </div>
    </div>
  );
};

export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, ...props }) => {
  return (
    <footer style={footerStyle} {...props}>
      {children}
    </footer>
  );
};

>>>>>>> Stashed changes
