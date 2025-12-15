import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Spinner } from "../../src/components/ui/Spinner";

describe("Spinner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Rendering", () => {
    it("should render spinner element", () => {
      render(<Spinner />);
      const spinner = screen.getByRole("status");
      expect(spinner).toBeInTheDocument();
    });

    it("should have default aria-label", () => {
      render(<Spinner />);
      const spinner = screen.getByRole("status");
      expect(spinner).toHaveAttribute("aria-label", "Loading");
    });

    it("should use custom aria-label when provided", () => {
      render(<Spinner aria-label="Processing" />);
      const spinner = screen.getByRole("status");
      expect(spinner).toHaveAttribute("aria-label", "Processing");
    });
  });

  describe("Size variants", () => {
    it("should apply sm size styles", () => {
      const { container } = render(<Spinner size="sm" />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveStyle({
        width: "1rem",
        height: "1rem",
        borderWidth: "2px",
      });
    });

    it("should apply md size styles (default)", () => {
      const { container } = render(<Spinner size="md" />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveStyle({
        width: "1.5rem",
        height: "1.5rem",
        borderWidth: "2px",
      });
    });

    it("should apply lg size styles", () => {
      const { container } = render(<Spinner size="lg" />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveStyle({
        width: "2rem",
        height: "2rem",
        borderWidth: "3px",
      });
    });
  });

  describe("Styling", () => {
    it("should apply custom className", () => {
      render(<Spinner className="custom-class" />);
      const spinner = screen.getByRole("status");
      expect(spinner).toHaveClass("custom-class");
    });

    it("should apply custom style", () => {
      const { container } = render(<Spinner style={{ marginTop: "10px" }} />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveStyle({ marginTop: "10px" });
    });

    it("should merge custom style with default styles", () => {
      const { container } = render(<Spinner style={{ width: "3rem" }} />);
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toHaveStyle({
        width: "3rem",
        display: "inline-block",
      });
    });
  });

  describe("Accessibility", () => {
    it("should have role status", () => {
      render(<Spinner />);
      const spinner = screen.getByRole("status");
      expect(spinner).toBeInTheDocument();
    });

    it("should have aria-label for screen readers", () => {
      render(<Spinner />);
      const spinner = screen.getByRole("status");
      expect(spinner).toHaveAttribute("aria-label");
    });

    it("should include animation styles", () => {
      const { container } = render(<Spinner />);
      const styleElement = container.querySelector("style");
      expect(styleElement).toBeInTheDocument();
      expect(styleElement?.textContent).toContain("@keyframes spinner-rotate");
    });

    it("should respect prefers-reduced-motion", () => {
      const { container } = render(<Spinner />);
      const styleElement = container.querySelector("style");
      expect(styleElement?.textContent).toContain("prefers-reduced-motion");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty aria-label", () => {
      render(<Spinner aria-label="" />);
      const spinner = screen.getByRole("status");
      expect(spinner).toHaveAttribute("aria-label", "");
    });

    it("should handle very long aria-label", () => {
      const longLabel = "a".repeat(200);
      render(<Spinner aria-label={longLabel} />);
      const spinner = screen.getByRole("status");
      expect(spinner).toHaveAttribute("aria-label", longLabel);
    });
  });
});
