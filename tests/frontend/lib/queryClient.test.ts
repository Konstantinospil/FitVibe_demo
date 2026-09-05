import { describe, expect, it } from "vitest";
import { createQueryClient, queryClient } from "../../src/lib/queryClient";

describe("queryClient", () => {
  it("exports a shared client instance", () => {
    expect(queryClient).toBeDefined();
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(1);
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(30_000);
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });

  it("creates an isolated client per call", () => {
    const first = createQueryClient();
    const second = createQueryClient();

    expect(first).not.toBe(second);
    expect(first.getDefaultOptions().queries?.retry).toBe(1);
  });
});
