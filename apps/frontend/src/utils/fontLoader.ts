/**
 * Deferred, subsetted font loading.
 * Public routes (login) load Inter woff2 subsets only. Authenticated routes add Roboto Flex.
 * unicode-range keeps English login on the latin file (~48KB) instead of full variable TTFs.
 * font-display: optional prevents a late Inter swap from becoming the LCP timestamp.
 */

import interLatin from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import interLatinExt from "@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2?url";
import interGreek from "@fontsource-variable/inter/files/inter-greek-wght-normal.woff2?url";

const LATIN_RANGE =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT_RANGE =
  "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";
const GREEK_RANGE = "U+0370-0377,U+037A-037F,U+0384-038A,U+038C,U+038E-03A1,U+03A3-03FF";

const PUBLIC_FONT_STYLE_ID = "async-fonts";
const APP_FONT_STYLE_ID = "async-fonts-app";

const fontFace = (family: string, url: string, unicodeRange: string, weight: string): string => `
@font-face {
  font-family: "${family}";
  font-style: normal;
  font-weight: ${weight};
  font-display: optional;
  src: url("${url}") format("woff2-variations");
  unicode-range: ${unicodeRange};
}
`;

const PUBLIC_FONT_FACES = [
  fontFace("Inter", interLatin, LATIN_RANGE, "100 900"),
  fontFace("Inter", interLatinExt, LATIN_EXT_RANGE, "100 900"),
  fontFace("Inter", interGreek, GREEK_RANGE, "100 900"),
].join("");

const injectStyle = (id: string, css: string): void => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  if (document.getElementById(id)) {
    return;
  }
  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
  requestAnimationFrame(() => {
    document.body.classList.add("fonts-loaded");
  });
};

const runWhenIdle = (task: () => void): void => {
  if (typeof window === "undefined") {
    return;
  }
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => task(), { timeout: 3000 });
    return;
  }
  setTimeout(task, 2000);
};

/**
 * Inter subsets for login and other public pages. Does not load Roboto Flex.
 */
export const loadPublicFonts = (): void => {
  runWhenIdle(() => injectStyle(PUBLIC_FONT_STYLE_ID, PUBLIC_FONT_FACES));
};

/**
 * Roboto Flex heading font for authenticated chrome. Loaded in a separate chunk.
 */
export const loadAppFonts = (): void => {
  runWhenIdle(() => {
    void import("./appFontLoader.js").then(({ APP_FONT_FACES }) => {
      injectStyle(APP_FONT_STYLE_ID, APP_FONT_FACES);
    });
  });
};

/** @deprecated Use loadPublicFonts — kept as the bootstrap entry alias. */
export const loadFontsAsync = loadPublicFonts;
