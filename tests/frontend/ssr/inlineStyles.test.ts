import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { escapeCssForStyleTag, styleTagsFor, type StyleFs } from "../../src/ssr/inlineStyles";

const clientRoot = resolve("/tmp/fitvibe-client");
const cssHref = "/assets/css/index-def456.css";
const cssPath = resolve(clientRoot, "assets/css/index-def456.css");

const fsWithCss = (css: string): StyleFs => ({
  existsSync: (path) => path === cssPath,
  readFileSync: (path) => {
    if (path !== cssPath) {
      throw new Error(`unexpected read: ${path}`);
    }
    return css;
  },
});

const missingCssFs: StyleFs = {
  existsSync: () => false,
  readFileSync: () => {
    throw new Error("should not read missing CSS");
  },
};

describe("styleTagsFor", () => {
  it("inlines CSS from the client build so LCP is not stylesheet-blocked", () => {
    const html = styleTagsFor([cssHref], clientRoot, fsWithCss("h3{color:#fff}"));

    expect(html).toBe(`<style data-href="${cssHref}">h3{color:#fff}</style>`);
  });

  it("escapes closing style tags in CSS", () => {
    const html = styleTagsFor(
      [cssHref],
      clientRoot,
      fsWithCss("/* </style><script>alert(1)</script> */"),
    );

    expect(html).toContain("<\\/style");
    expect(html).not.toContain("</style><script>");
  });

  it("falls back to a stylesheet link when the CSS file is missing", () => {
    const html = styleTagsFor([cssHref], clientRoot, missingCssFs);

    expect(html).toBe(`<link rel="stylesheet" href="${cssHref}" fetchpriority="high" />`);
  });

  it("rejects hrefs that escape the assets directory", () => {
    const html = styleTagsFor(["/assets/../secret.css"], clientRoot, missingCssFs);

    expect(html).toContain('rel="stylesheet" href="/assets/../secret.css"');
    expect(html).not.toContain("<style");
  });
});

describe("escapeCssForStyleTag", () => {
  it("neutralizes a closing style tag regardless of case", () => {
    expect(escapeCssForStyleTag("a{}</STYLE>")).toBe("a{}<\\/style>");
  });
});
