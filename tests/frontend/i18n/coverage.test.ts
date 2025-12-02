import en from "../../src/i18n/locales/en/common.json";
import de from "../../src/i18n/locales/de/common.json";
import { describe, expect, it } from "vitest";

type TranslationRecord = Record<string, unknown>;

const flattenKeys = (input: TranslationRecord, prefix = ""): string[] => {
  return Object.entries(input).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flattenKeys(value as TranslationRecord, path);
    }
    return path;
  });
};

describe("i18n coverage", () => {
  it("keeps German translations aligned with English", () => {
    const enKeys = new Set(flattenKeys(en as TranslationRecord));
    const deKeys = new Set(flattenKeys(de as TranslationRecord));

    const missingKeys = Array.from(enKeys).filter((key) => !deKeys.has(key));
    const extraKeys = Array.from(deKeys).filter((key) => !enKeys.has(key));

    if (missingKeys.length > 0 || extraKeys.length > 0) {
      const message = [
        missingKeys.length > 0
          ? `Missing in German (${missingKeys.length}): ${missingKeys.slice(0, 10).join(", ")}${missingKeys.length > 10 ? "..." : ""}`
          : "",
        extraKeys.length > 0
          ? `Extra in German (${extraKeys.length}): ${extraKeys.slice(0, 10).join(", ")}${extraKeys.length > 10 ? "..." : ""}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      throw new Error(message || "Keys mismatch");
    }

    expect(deKeys).toEqual(enKeys);
  });
});
