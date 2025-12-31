import { describe, expect, it } from "vitest";
import { getErrorMessage, getErrorMessageSync } from "../../src/utils/errorMessages";

const t = (key: string) => `t:${key}`;

describe("errorMessages", () => {
  it("returns axios error message when available", () => {
    const error = Object.assign(new Error("Request failed"), {
      response: { data: { error: { message: "Bad request" } } },
    });
    expect(getErrorMessageSync(error, t)).toBe("Bad request");
  });

  it("returns fallback for non-error values", () => {
    expect(getErrorMessage("oops", t)).toBe("oops");
    expect(getErrorMessage({}, t, "common.error", "Fallback")).toBe("Fallback");
  });
});
