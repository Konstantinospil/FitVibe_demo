import { describe, expect, it, vi } from "vitest";
import { disableMarketing, initializeMarketing } from "../../src/utils/marketing";

describe("marketing", () => {
  it("initializes without throwing", () => {
    expect(() => initializeMarketing()).not.toThrow();
  });

  it("disables tracking when fbq is present", () => {
    (window as unknown as { fbq?: unknown }).fbq = vi.fn();
    expect(() => disableMarketing()).not.toThrow();
    delete (window as unknown as { fbq?: unknown }).fbq;
  });

  it("disables tracking when fbq is absent", () => {
    delete (window as unknown as { fbq?: unknown }).fbq;
    expect(() => disableMarketing()).not.toThrow();
  });
});
