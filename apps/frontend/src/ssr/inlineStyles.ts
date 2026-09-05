import { existsSync, readFileSync } from "node:fs";
import { relative as pathRelative, resolve } from "node:path";

export type StyleFs = {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: "utf-8") => string;
};

const defaultFs: StyleFs = {
  existsSync,
  readFileSync: (path, encoding) => readFileSync(path, encoding),
};

export function escapeCssForStyleTag(css: string): string {
  return css.replace(/<\/style/gi, "<\\/style");
}

/**
 * Inline built CSS so login LCP is not blocked on a second Slow-4G stylesheet
 * request. Express serves HTTP/1.1, so a render-blocking <link> is a full RTT
 * plus download before the SSR heading can paint.
 */
export function styleTagsFor(hrefs: string[], clientRoot: string, fs: StyleFs = defaultFs): string {
  return hrefs
    .map((href) => {
      const relative = href.replace(/^\//, "");
      if (
        !relative.startsWith("assets/") ||
        !relative.endsWith(".css") ||
        relative.includes("..")
      ) {
        return `<link rel="stylesheet" href="${href}" fetchpriority="high" />`;
      }
      const filePath = resolve(clientRoot, relative);
      const relFromClient = pathRelative(clientRoot, filePath);
      if (
        relFromClient.startsWith("..") ||
        relFromClient.includes("..") ||
        !fs.existsSync(filePath)
      ) {
        return `<link rel="stylesheet" href="${href}" fetchpriority="high" />`;
      }
      const css = escapeCssForStyleTag(fs.readFileSync(filePath, "utf-8"));
      return `<style data-href="${href}">${css}</style>`;
    })
    .join("");
}
