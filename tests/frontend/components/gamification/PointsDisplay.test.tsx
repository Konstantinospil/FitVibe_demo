import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _key,
  }),
}));

import { PointsDisplay } from "../../src/components/gamification/PointsDisplay";

describe("PointsDisplay", () => {
  it("renders points with label by default", () => {
    render(<PointsDisplay points={1234} />);

    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("points")).toBeInTheDocument();
  });

  it("hides the label when showLabel is false", () => {
    render(<PointsDisplay points={50} showLabel={false} size="lg" />);

    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.queryByText("points")).not.toBeInTheDocument();
  });
});
