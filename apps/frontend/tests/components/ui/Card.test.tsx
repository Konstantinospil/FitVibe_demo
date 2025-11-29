import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../../../src/components/ui/Card";

describe("Card", () => {
  it("should render card with children", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("should render as div by default", () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("should render as custom element when as prop is provided", () => {
    const { container } = render(<Card as="section">Content</Card>);
    expect(container.querySelector("section")).toBeInTheDocument();
  });

  it("should apply custom style", () => {
    const customStyle = { backgroundColor: "red" };
    const { container } = render(<Card style={customStyle}>Content</Card>);
    const card = container.querySelector("div") as HTMLDivElement;
    expect(card?.style.backgroundColor).toBe("red");
  });

  it("should pass through other HTML attributes", () => {
    const { container } = render(
      <Card data-testid="card" aria-label="Test card">
        Content
      </Card>,
    );
    const card = container.querySelector("[data-testid='card']");
    expect(card).toHaveAttribute("aria-label", "Test card");
  });
});

describe("CardHeader", () => {
  it("should render card header with children", () => {
    render(
      <Card>
        <CardHeader>Header content</CardHeader>
      </Card>,
    );
    expect(screen.getByText("Header content")).toBeInTheDocument();
  });

  it("should render as header element", () => {
    const { container } = render(
      <Card>
        <CardHeader>Header</CardHeader>
      </Card>,
    );
    expect(container.querySelector("header")).toBeInTheDocument();
  });

  it("should apply custom style", () => {
    const customStyle = { padding: "20px" };
    const { container } = render(
      <Card>
        <CardHeader style={customStyle}>Header</CardHeader>
      </Card>,
    );
    const header = container.querySelector("header");
    expect(header).toHaveStyle(customStyle);
  });
});

describe("CardTitle", () => {
  it("should render card title with children", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
      </Card>,
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
  });

  it("should render as h3 element", () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
      </Card>,
    );
    expect(container.querySelector("h3")).toBeInTheDocument();
  });

  it("should apply custom style", () => {
    const customStyle = { fontSize: "24px" };
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle style={customStyle}>Title</CardTitle>
        </CardHeader>
      </Card>,
    );
    const title = container.querySelector("h3");
    expect(title).toHaveStyle(customStyle);
  });
});

describe("CardDescription", () => {
  it("should render card description with children", () => {
    render(
      <Card>
        <CardHeader>
          <CardDescription>Description</CardDescription>
        </CardHeader>
      </Card>,
    );
    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  it("should render as p element", () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardDescription>Description</CardDescription>
        </CardHeader>
      </Card>,
    );
    expect(container.querySelector("p")).toBeInTheDocument();
  });
});

describe("CardContent", () => {
  it("should render card content with children", () => {
    render(
      <Card>
        <CardContent>Content</CardContent>
      </Card>,
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("should render as div element", () => {
    const { container } = render(
      <Card>
        <CardContent>Content</CardContent>
      </Card>,
    );
    expect(container.querySelector("div")).toBeInTheDocument();
  });
});

describe("CardFooter", () => {
  it("should render card footer with children", () => {
    render(
      <Card>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("should render as div element", () => {
    const { container } = render(
      <Card>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(container.querySelector("div")).toBeInTheDocument();
  });
});

describe("Card composition", () => {
  it("should render complete card structure", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Card Content</CardContent>
        <CardFooter>Card Footer</CardFooter>
      </Card>,
    );

    expect(screen.getByText("Card Title")).toBeInTheDocument();
    expect(screen.getByText("Card Description")).toBeInTheDocument();
    expect(screen.getByText("Card Content")).toBeInTheDocument();
    expect(screen.getByText("Card Footer")).toBeInTheDocument();
  });
});
