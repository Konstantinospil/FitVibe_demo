import { describe, expect, it } from "vitest";
import { asTranslationList } from "../../src/i18n/lists";

describe("asTranslationList", () => {
  it("returns arrays unchanged", () => {
    expect(asTranslationList(["a", "b"])).toEqual(["a", "b"]);
  });

  it("returns an empty array when i18n falls back to a string key", () => {
    expect(asTranslationList("terms.section1.items")).toEqual([]);
  });
});
