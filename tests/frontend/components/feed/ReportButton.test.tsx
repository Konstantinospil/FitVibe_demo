import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportButton } from "../../src/components/feed/ReportButton";

const showToast = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../../src/components/ui/Toast", () => ({
  useToast: () => ({ showToast }),
}));

describe("ReportButton", () => {
  beforeEach(() => {
    showToast.mockReset();
    vi.useRealTimers();
  });

  it("opens the report modal and requires a reason", () => {
    render(<ReportButton feedItemId="item-1" />);

    fireEvent.click(screen.getByRole("button", { name: "feed.report.label" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "feed.report.submit" });
    expect(submit).toBeDisabled();
  });

  it("submits a report and notifies the parent", async () => {
    const onReported = vi.fn();
    render(<ReportButton feedItemId="item-1" onReported={onReported} />);

    fireEvent.click(screen.getByRole("button", { name: "feed.report.label" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "spam" } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Looks like spam" } });
    fireEvent.click(screen.getByRole("button", { name: "feed.report.submit" }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        variant: "success",
        title: "feed.report.submitted",
        message: "feed.report.submittedMessage",
      }),
    );
    expect(onReported).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the modal from cancel and the overlay close", () => {
    render(<ReportButton feedItemId="item-1" />);

    fireEvent.click(screen.getByRole("button", { name: "feed.report.label" }));
    fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
