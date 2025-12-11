export default {
  "*.{ts,tsx,js,jsx,cjs,mjs}": (filenames) => {
    // Filter out dist files, node_modules, and .cursor directory
    const filtered = filenames.filter(
      (f) =>
        !f.includes("/dist/") &&
        !f.includes("\\dist\\") &&
        !f.includes("node_modules") &&
        !f.includes(".cursor/"),
    );
    if (filtered.length === 0) return [];
    return [`eslint --fix ${filtered.join(" ")}`, `prettier --write ${filtered.join(" ")}`];
  },
  "*.{json,md,yml,yaml}": (filenames) => {
    // Filter out .cursor directory files from prettier
    const filtered = filenames.filter((f) => !f.includes(".cursor/"));
    if (filtered.length === 0) return [];
    return [`prettier --write ${filtered.join(" ")}`];
  },
};
