import type { ReactNode } from "react";
import React, { useEffect, useRef } from "react";

export interface FocusTrapProps {
  /**
   * Whether the focus trap is active
   */
  active: boolean;
  /**
   * React node children to wrap
   */
  children: ReactNode;
  /**
   * Ref to element that should receive initial focus when trap activates
   */
  initialFocus?: React.RefObject<HTMLElement>;
  /**
   * Ref to element that should receive focus when trap deactivates
   */
  returnFocus?: React.RefObject<HTMLElement>;
  /**
   * Whether to restore focus to the previously focused element when trap deactivates
   */
  restoreFocus?: boolean;
}

/**
 * FocusTrap component that traps keyboard focus within a container.
 * Implements WCAG 2.1 SC 2.1.1 (Keyboard) and SC 2.4.3 (Focus Order).
 *
 * Features:
 * - Traps Tab and Shift+Tab keys within the container
 * - Manages initial focus when trap activates
 * - Restores focus when trap deactivates
 * - Handles Escape key (delegated to parent)
 * - Prevents focus from escaping to elements outside the trap
 */
export const FocusTrap: React.FC<FocusTrapProps> = ({
  active,
  children,
  initialFocus,
  returnFocus,
  restoreFocus = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = (): HTMLElement[] => {
    if (!containerRef.current) {
      return [];
    }

    const selector = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(", ");

    const elements = Array.from(containerRef.current.querySelectorAll<HTMLElement>(selector));

    // Filter out elements that are not visible or are disabled
    return elements.filter((el) => {
      const style = window.getComputedStyle(el);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        !el.hasAttribute("disabled") &&
        !el.hasAttribute("aria-hidden")
      );
    });
  };

  // Handle Tab key navigation
  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (!active || !containerRef.current) {
        return;
      }

      // Only handle Tab key
      if (e.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // If Shift+Tab is pressed and focus is on the first element, move to last
      if (e.shiftKey) {
        if (
          document.activeElement === firstElement ||
          !containerRef.current.contains(document.activeElement)
        ) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // If Tab is pressed and focus is on the last element, move to first
        if (
          document.activeElement === lastElement ||
          !containerRef.current.contains(document.activeElement)
        ) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    },
    [active, containerRef],
  );

  // Set up focus trap when active
  useEffect(() => {
    if (!active) {
      return;
    }

    // Store the previously focused element and capture returnFocus ref
    if (restoreFocus && document.activeElement instanceof HTMLElement) {
      previousActiveElementRef.current = document.activeElement;
    }
    const returnFocusElement = returnFocus?.current;

    // Set initial focus
    const setInitialFocus = () => {
      if (initialFocus?.current) {
        initialFocus.current.focus();
        return;
      }

      // If no initial focus ref provided, focus first focusable element
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(setInitialFocus, 0);

    // Add keyboard event listener
    document.addEventListener("keydown", handleKeyDown);

    // Prevent body scroll when trap is active (for modals)
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;

      // Restore focus when trap deactivates
      if (restoreFocus) {
        const elementToFocus = returnFocusElement || previousActiveElementRef.current;
        if (elementToFocus && typeof elementToFocus.focus === "function") {
          // Small delay to ensure trap is fully deactivated
          setTimeout(() => {
            elementToFocus.focus();
          }, 0);
        }
      }
    };
  }, [active, initialFocus, restoreFocus, returnFocus, handleKeyDown]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      {children}
    </div>
  );
};
