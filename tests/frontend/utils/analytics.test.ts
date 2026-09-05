import { describe, expect, it, vi } from "vitest";
import { disableAnalytics, initializeAnalytics } from "../../src/utils/analytics";

describe("analytics", () => {
  it("returns early when gtag is already present", () => {
    (window as unknown as { gtag?: unknown }).gtag = vi.fn();
    expect(() => initializeAnalytics()).not.toThrow();
    delete (window as unknown as { gtag?: unknown }).gtag;
  });

  it("initializes when gtag is missing", () => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    expect(() => initializeAnalytics()).not.toThrow();
  });

  it("clears the data layer when disabling analytics", () => {
    const win = window as unknown as { gtag?: unknown; dataLayer?: unknown[] };
    win.gtag = vi.fn();
    win.dataLayer = [{ event: "page_view" }];

    disableAnalytics();

    expect(win.dataLayer).toEqual([]);
    delete win.gtag;
    delete win.dataLayer;
  });

  it("disables analytics when gtag is absent", () => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    expect(() => disableAnalytics()).not.toThrow();
  });
});
