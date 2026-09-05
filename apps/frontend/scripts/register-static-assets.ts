/**
 * Lets tsx/Node treat binary Vite assets as modules.
 * Without this, `import logo from "./logo.png"` executes the PNG as JS.
 */
import Module from "node:module";

const IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".svg",
  ".webp",
  ".woff",
  ".woff2",
] as const;

type NodeModuleLoader = {
  _extensions: Record<string, (module: { exports: unknown }, filename: string) => void>;
};

const nodeModule = Module as unknown as NodeModuleLoader;

for (const ext of IMAGE_EXTENSIONS) {
  nodeModule._extensions[ext] = (_module, filename) => {
    _module.exports = filename;
  };
}
