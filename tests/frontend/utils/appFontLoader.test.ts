import { describe, expect, it } from "vitest";
import { APP_FONT_FACES } from "../../src/utils/appFontLoader";

describe("appFontLoader", () => {
  it("exports Roboto Flex faces for latin, latin-ext, and greek", () => {
    expect(APP_FONT_FACES).toContain('font-family: "Roboto Flex"');
    expect(APP_FONT_FACES).toContain("font-display: swap");
    expect(APP_FONT_FACES).toContain("U+0000-00FF");
    expect(APP_FONT_FACES).toContain("U+0100-02BA");
    expect(APP_FONT_FACES).toContain("U+0370-0377");
    expect(APP_FONT_FACES).toContain("woff2-variations");
  });
});
