export default {
  "*.{ts,tsx,js,jsx,cjs,mjs}": (filenames) => {
    // Filter out dist files and node_modules
    const filtered = filenames.filter(
      (f) =>
        !f.includes("/dist/") &&
        !f.includes("\\dist\\") &&
        !f.includes("node_modules") &&
        !f.endsWith(".cjs") &&
        !f.endsWith(".mjs"),
    );
    if (filtered.length === 0) return [];
    const quoted = filtered.map((f) => `"${f}"`).join(" ");
    return [`eslint --fix --no-warn-ignored ${quoted}`, `prettier --write ${quoted}`];
  },
  "*.{json,md,yml,yaml}": (filenames) => {
    const filtered = filenames.filter(
      (f) => !f.endsWith("pnpm-lock.yaml") && !f.endsWith("package-lock.json"),
    );
    if (filtered.length === 0) return [];
    const quoted = filtered.map((f) => `"${f}"`).join(" ");
    return [`prettier --write ${quoted}`];
  },
};
