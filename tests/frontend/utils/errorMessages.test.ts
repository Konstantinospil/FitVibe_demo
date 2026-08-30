import { describe, expect, it } from "vitest";
import { getErrorMessage, getErrorMessageSync } from "../../src/utils/errorMessages";

const t = (key: string) => `t:${key}`;
const identityT = (key: string) => key;

describe("errorMessages", () => {
  it("returns axios error message when available", () => {
    const error = Object.assign(new Error("Request failed"), {
      response: { data: { error: { message: "Bad request" } } },
    });
    expect(getErrorMessageSync(error, t)).toBe("Bad request");
  });

  it("returns axios data.message when error message is missing", () => {
    const error = Object.assign(new Error("Request failed"), {
      response: { data: { message: "Plain message" } },
    });
    expect(getErrorMessageSync(error, t)).toBe("Plain message");
  });

  it("returns error.message when response data has no message", () => {
    const error = Object.assign(new Error("Default error"), {
      response: { data: {} },
    });
    expect(getErrorMessageSync(error, t)).toBe("Default error");
  });

  it("returns fallbackMessage when error message is empty", () => {
    const error = Object.assign(new Error(""), {
      response: { data: {} },
    });
    expect(getErrorMessageSync(error, identityT, "common.error", "Fallback")).toBe("Fallback");
  });

  it("returns translation fallback when message is unavailable", () => {
    expect(getErrorMessageSync({}, t, "common.error")).toBe("t:common.error");
  });

  it("returns default error when translation is empty", () => {
    const emptyT = () => "";
    expect(getErrorMessageSync({}, emptyT, "common.error")).toBe("An error occurred");
  });

  it("returns fallback for non-error values", () => {
    expect(getErrorMessage("oops")).toBe("oops");
    expect(getErrorMessage({}, "common.error", "Fallback")).toBe("Fallback");
  });
});
