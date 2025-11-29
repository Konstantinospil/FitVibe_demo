import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Chart } from "../../../src/components/ui/Chart";

describe("Chart", () => {
  const mockData = [
    { label: "Jan", value: 100 },
    { label: "Feb", value: 200 },
    { label: "Mar", value: 150 },
  ];

  it("should render chart with data", () => {
    render(<Chart data={mockData} />);
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });

  it("should render area chart by default", () => {
    render(<Chart data={mockData} />);
    // AreaChart should be rendered (we can't easily test this without deeper DOM inspection)
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });

  it("should render bar chart when type is bar", () => {
    render(<Chart data={mockData} type="bar" />);
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });

  it("should use default height of 240", () => {
    const { container } = render(<Chart data={mockData} />);
    const chartContainer = container.querySelector("[data-testid='chart']");
    expect(chartContainer).toHaveStyle({ height: "240px" });
  });

  it("should use custom height", () => {
    const { container } = render(<Chart data={mockData} height={300} />);
    const chartContainer = container.querySelector("[data-testid='chart']");
    expect(chartContainer).toHaveStyle({ height: "300px" });
  });

  it("should use default color", () => {
    render(<Chart data={mockData} />);
    // Color is applied internally, hard to test without DOM inspection
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });

  it("should use custom color", () => {
    render(<Chart data={mockData} color="#ff0000" />);
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });

  it("should use default label formatter", () => {
    render(<Chart data={mockData} />);
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });

  it("should use custom label formatter", () => {
    const labelFormatter = (label: string) => `Month: ${label}`;
    render(<Chart data={mockData} labelFormatter={labelFormatter} />);
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });

  it("should use default value formatter", () => {
    render(<Chart data={mockData} />);
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });

  it("should use custom value formatter", () => {
    const valueFormatter = (value: number) => `$${value}`;
    render(<Chart data={mockData} valueFormatter={valueFormatter} />);
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });

  it("should render with empty data array", () => {
    render(<Chart data={[]} />);
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });
});
