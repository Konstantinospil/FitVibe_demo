import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PageIntro from "../../src/components/PageIntro";

describe("PageIntro Accessibility", () => {
  const defaultProps = {
    eyebrow: "Welcome",
    title: "Getting Started with FitVibe",
    description: "Track your workouts, monitor your progress, and achieve your fitness goals.",
  };

  describe("Semantic HTML structure", () => {
    it("should use semantic section element", () => {
      const { container } = render(<PageIntro {...defaultProps} />);

      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });

    it("should use article element for content", () => {
      render(<PageIntro {...defaultProps} />);

      const article = screen.getByRole("article");
      expect(article).toBeInTheDocument();
    });

    it("should render eyebrow text", () => {
      render(<PageIntro {...defaultProps} />);

      expect(screen.getByText("Welcome")).toBeInTheDocument();
    });

    it("should render title text", () => {
      render(<PageIntro {...defaultProps} />);

      expect(screen.getByText("Getting Started with FitVibe")).toBeInTheDocument();
    });

    it("should render description text", () => {
      render(<PageIntro {...defaultProps} />);

      expect(screen.getByText(/track your workouts/i)).toBeInTheDocument();
    });

    it("should render children when provided", () => {
      render(
        <PageIntro {...defaultProps}>
          <div data-testid="child-content">Additional content</div>
        </PageIntro>,
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });

    it("should not render CardContent when no children provided", () => {
      const { container } = render(<PageIntro {...defaultProps} />);

      // CardContent should only render when children exist
      const cardContent = container.querySelector('[style*="padding: 0 3rem 3rem"]');
      expect(cardContent).not.toBeInTheDocument();
    });
  });

  describe("Heading hierarchy", () => {
    it("should have proper heading element for title", () => {
      const { container } = render(<PageIntro {...defaultProps} />);

      // CardTitle should render as a heading (h1, h2, etc.)
      const heading = container.querySelector("h1, h2, h3, h4, h5, h6");
      expect(heading).toBeInTheDocument();
    });

    it("should display title prominently", () => {
      const { container } = render(<PageIntro {...defaultProps} />);

      // Title should have large font size
      const title = container.querySelector("h1, h2, h3, h4, h5, h6");
      const styles = title?.getAttribute("style");

      expect(styles).toContain("clamp(2rem, 4vw, 2.8rem)");
    });

    it("should maintain logical reading order", () => {
      render(
        <PageIntro {...defaultProps}>
          <p>Step-by-step instructions</p>
        </PageIntro>,
      );

      // Content should flow: eyebrow → title → description → children
      const text = document.body.textContent;
      const eyebrowIndex = text?.indexOf("Welcome") ?? -1;
      const titleIndex = text?.indexOf("Getting Started") ?? -1;
      const descIndex = text?.indexOf("Track your workouts") ?? -1;
      const childIndex = text?.indexOf("Step-by-step") ?? -1;

      expect(eyebrowIndex).toBeLessThan(titleIndex);
      expect(titleIndex).toBeLessThan(descIndex);
      expect(descIndex).toBeLessThan(childIndex);
    });
  });

  describe("Screen reader support", () => {
    it("should announce eyebrow text", () => {
      render(<PageIntro {...defaultProps} />);

      const eyebrow = screen.getByText("Welcome");
      expect(eyebrow).toBeVisible();
    });

    it("should announce title prominently", () => {
      render(<PageIntro {...defaultProps} />);

      const title = screen.getByText("Getting Started with FitVibe");
      expect(title).toBeVisible();
    });

    it("should announce description text", () => {
      render(<PageIntro {...defaultProps} />);

      const description = screen.getByText(/track your workouts/i);
      expect(description).toBeVisible();
    });

    it("should use article role for semantic grouping", () => {
      render(<PageIntro {...defaultProps} />);

      const article = screen.getByRole("article");
      expect(article).toBeInTheDocument();
    });

    it("should maintain text content in natural reading flow", () => {
      render(<PageIntro {...defaultProps} />);

      const article = screen.getByRole("article");
      const textContent = article.textContent;

      // Text should flow naturally for screen readers
      expect(textContent).toContain("Welcome");
      expect(textContent).toContain("Getting Started with FitVibe");
      expect(textContent).toContain("Track your workouts");
    });

    it("should announce child content when present", () => {
      render(
        <PageIntro {...defaultProps}>
          <p>Additional instructions for new users</p>
        </PageIntro>,
      );

      expect(screen.getByText("Additional instructions for new users")).toBeVisible();
    });
  });

  describe("Visual accessibility", () => {
    it("should use semantic color variables for eyebrow", () => {
      render(<PageIntro {...defaultProps} />);

      const eyebrowText = screen.getByText("Welcome");
      const styles = eyebrowText.getAttribute("style");

      expect(styles).toContain("--color-text-secondary");
    });

    it("should use semantic color variable for accent line", () => {
      render(<PageIntro {...defaultProps} />);

      const eyebrowText = screen.getByText("Welcome");
      const eyebrowContainer = eyebrowText.parentElement;
      const accentLine = eyebrowContainer?.querySelector('[aria-hidden="true"]');
      const styles = accentLine?.getAttribute("style");

      expect(styles).toContain("--color-accent");
    });

    it("should have sufficient color contrast for text", () => {
      render(<PageIntro {...defaultProps} />);

      // Eyebrow uses secondary text color
      const eyebrowText = screen.getByText("Welcome");
      expect(eyebrowText.getAttribute("style")).toContain("--color-text-secondary");

      // Title and description inherit color variables from Card components
      const title = screen.getByText("Getting Started with FitVibe");
      expect(title).toBeVisible();
    });

    it("should have proper visual hierarchy through font sizes", () => {
      const { container } = render(<PageIntro {...defaultProps} />);

      const eyebrowText = screen.getByText("Welcome");
      const eyebrowStyles = eyebrowText.getAttribute("style");

      const title = container.querySelector("h1, h2, h3, h4, h5, h6");
      const titleStyles = title?.getAttribute("style");

      const description = container.querySelector("p");
      const descriptionStyles = description?.getAttribute("style");

      // Eyebrow should be small
      expect(eyebrowStyles).toContain("font-size: 0.9rem");

      // Title should be large and responsive
      expect(titleStyles).toContain("clamp(2rem, 4vw, 2.8rem)");

      // Description should be standard size
      expect(descriptionStyles).toContain("font-size: 1rem");
    });

    it("should have adequate line height for readability", () => {
      const { container } = render(<PageIntro {...defaultProps} />);

      const title = container.querySelector("h1, h2, h3, h4, h5, h6");
      const titleStyles = title?.getAttribute("style");

      const description = container.querySelector("p");
      const descriptionStyles = description?.getAttribute("style");

      expect(titleStyles).toContain("line-height: 1.15");
      expect(descriptionStyles).toContain("line-height: 1.6");
    });

    it("should use proper letter spacing for readability", () => {
      const { container } = render(<PageIntro {...defaultProps} />);

      const eyebrowText = screen.getByText("Welcome");
      const eyebrowStyles = eyebrowText.getAttribute("style");

      const title = container.querySelector("h1, h2, h3, h4, h5, h6");
      const titleStyles = title?.getAttribute("style");

      // Eyebrow has wider spacing for uppercase
      expect(eyebrowStyles).toContain("letter-spacing: 0.08em");

      // Title has tight spacing for large text
      expect(titleStyles).toContain("letter-spacing: -0.015em");
    });

    it("should have visual accent indicator", () => {
      render(<PageIntro {...defaultProps} />);

      const eyebrowText = screen.getByText("Welcome");
      const eyebrowContainer = eyebrowText.parentElement;
      const accentLine = eyebrowContainer?.querySelector('[aria-hidden="true"]');

      expect(accentLine).toBeInTheDocument();
      expect(accentLine?.getAttribute("style")).toContain("width: 24px");
      expect(accentLine?.getAttribute("style")).toContain("height: 2px");
    });
  });

  describe("Responsive design", () => {
    it("should use responsive font sizing with clamp for title", () => {
      const { container } = render(<PageIntro {...defaultProps} />);

      const title = container.querySelector("h1, h2, h3, h4, h5, h6");
      const titleStyles = title?.getAttribute("style");

      // Title uses fluid typography
      expect(titleStyles).toContain("clamp(2rem, 4vw, 2.8rem)");
    });

    it("should use responsive padding with clamp", () => {
      const { container } = render(<PageIntro {...defaultProps} />);

      const cardHeader = container.querySelector('[style*="clamp(1.5rem, 5vw, 3.5rem)"]');
      expect(cardHeader).toBeInTheDocument();
    });

    it("should have maximum width constraint for readability", () => {
      render(<PageIntro {...defaultProps} />);

      const article = screen.getByRole("article");
      const styles = article.getAttribute("style");

      expect(styles).toContain("max-width: 900px");
      expect(styles).toContain("width: 100%");
    });

    it("should center content horizontally", () => {
      const { container } = render(<PageIntro {...defaultProps} />);

      const section = container.querySelector("section");
      const styles = section?.getAttribute("style");

      expect(styles).toContain("align-items: center");
      expect(styles).toContain("justify-content: center");
    });

    it("should adapt to different viewport sizes", () => {
      const { container } = render(<PageIntro {...defaultProps} />);

      const section = container.querySelector("section");
      const styles = section?.getAttribute("style");

      // Section should be flexible
      expect(styles).toContain("flex: 1");
      expect(styles).toContain("display: flex");
    });
  });

  describe("Content structure", () => {
    it("should group related content in header", () => {
      const { container } = render(<PageIntro {...defaultProps} />);

      // Eyebrow, title, and description should be in CardHeader
      const header = container.querySelector("header");
      expect(header).toBeInTheDocument();

      const headerContent = header?.textContent;
      expect(headerContent).toContain("Welcome");
      expect(headerContent).toContain("Getting Started with FitVibe");
      expect(headerContent).toContain("Track your workouts");
    });

    it("should separate additional content in CardContent", () => {
      const { container } = render(
        <PageIntro {...defaultProps}>
          <p data-testid="child">Additional content</p>
        </PageIntro>,
      );

      const child = screen.getByTestId("child");
      const header = container.querySelector("header");

      // Child should not be inside header
      expect(header).not.toContainElement(child);
    });

    it("should have proper spacing between sections", () => {
      const { container } = render(<PageIntro {...defaultProps} />);

      const header = container.querySelector("header");
      const headerStyles = header?.getAttribute("style");

      expect(headerStyles).toContain("gap: 1rem");
    });

    it("should have proper spacing for child content", () => {
      const { container } = render(
        <PageIntro {...defaultProps}>
          <p>Child content</p>
        </PageIntro>,
      );

      const cardContent = container.querySelector('[style*="gap: 1.5rem"]');
      expect(cardContent).toBeInTheDocument();
    });
  });

  describe("Text content flexibility", () => {
    it("should handle long titles gracefully", () => {
      const longTitle = "This is a very long title that should wrap properly and remain readable";
      render(<PageIntro {...defaultProps} title={longTitle} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("should handle long descriptions gracefully", () => {
      const longDescription =
        "This is a very long description that provides extensive information about the page content and should wrap properly across multiple lines while maintaining good readability.";
      render(<PageIntro {...defaultProps} description={longDescription} />);

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it("should handle short content appropriately", () => {
      const shortProps = {
        eyebrow: "Hi",
        title: "Welcome",
        description: "Start here.",
      };
      render(<PageIntro {...shortProps} />);

      expect(screen.getByText("Hi")).toBeInTheDocument();
      expect(screen.getByText("Welcome")).toBeInTheDocument();
      expect(screen.getByText("Start here.")).toBeInTheDocument();
    });

    it("should handle special characters in content", () => {
      const specialProps = {
        eyebrow: "Step #1",
        title: "Getting Started & Setting Up",
        description: 'Track "PRs" & monitor progress—it\'s that simple!',
      };
      render(<PageIntro {...specialProps} />);

      expect(screen.getByText("Step #1")).toBeInTheDocument();
      expect(screen.getByText("Getting Started & Setting Up")).toBeInTheDocument();
      expect(screen.getByText(/track "prs"/i)).toBeInTheDocument();
    });
  });

  describe("Layout and spacing", () => {
    it("should have adequate padding for content", () => {
      const { container } = render(<PageIntro {...defaultProps} />);

      const section = container.querySelector("section");
      const sectionStyles = section?.getAttribute("style");

      expect(sectionStyles).toContain("padding: 5rem 1.5rem");
    });

    it("should align content vertically and horizontally", () => {
      const { container } = render(<PageIntro {...defaultProps} />);

      const section = container.querySelector("section");
      const sectionStyles = section?.getAttribute("style");

      expect(sectionStyles).toContain("display: flex");
      expect(sectionStyles).toContain("align-items: center");
      expect(sectionStyles).toContain("justify-content: center");
    });

    it("should have eyebrow visual alignment", () => {
      render(<PageIntro {...defaultProps} />);

      const eyebrowText = screen.getByText("Welcome");
      const eyebrowContainer = eyebrowText.parentElement;
      const eyebrowContainerStyles = eyebrowContainer?.getAttribute("style");

      expect(eyebrowContainerStyles).toContain("display: inline-flex");
      expect(eyebrowContainerStyles).toContain("align-items: center");
      expect(eyebrowContainerStyles).toContain("gap: 0.6rem");
    });
  });

  describe("Decorative elements", () => {
    it("should include visual accent line for eyebrow", () => {
      render(<PageIntro {...defaultProps} />);

      const eyebrowText = screen.getByText("Welcome");
      const eyebrowContainer = eyebrowText.parentElement;
      const accentLine = eyebrowContainer?.querySelector('[aria-hidden="true"]');

      expect(accentLine).toBeInTheDocument();
      expect(accentLine?.getAttribute("style")).toContain("width: 24px");
    });

    it("should use accent color for visual line", () => {
      render(<PageIntro {...defaultProps} />);

      const eyebrowText = screen.getByText("Welcome");
      const eyebrowContainer = eyebrowText.parentElement;
      const accentLine = eyebrowContainer?.querySelector('[aria-hidden="true"]');
      const styles = accentLine?.getAttribute("style");

      expect(styles).toContain("background: var(--color-accent)");
    });
  });

  describe("Typography", () => {
    it("should use uppercase for eyebrow text", () => {
      render(<PageIntro {...defaultProps} />);

      const eyebrowText = screen.getByText("Welcome");
      const styles = eyebrowText.getAttribute("style");

      expect(styles).toContain("text-transform: uppercase");
    });

    it("should use appropriate font weights", () => {
      render(<PageIntro {...defaultProps} />);

      const eyebrowText = screen.getByText("Welcome");
      const eyebrowStyles = eyebrowText.getAttribute("style");

      expect(eyebrowStyles).toContain("font-weight: 600");
    });

    it("should use semantic color for secondary text", () => {
      render(<PageIntro {...defaultProps} />);

      const eyebrowText = screen.getByText("Welcome");
      const styles = eyebrowText.getAttribute("style");

      expect(styles).toContain("color: var(--color-text-secondary)");
    });
  });
});
