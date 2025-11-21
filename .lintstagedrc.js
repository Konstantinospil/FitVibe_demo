export default {
  "*.{ts,tsx,js,jsx,cjs,mjs}": (filenames) => {
    // Filter out dist files and node_modules
    const filtered = filenames.filter(
      (f) => !f.includes("/dist/") && !f.includes("\\dist\\") && !f.includes("node_modules")
    );
    if (filtered.length === 0) return [];
    return [`eslint --fix ${filtered.join(" ")}`, `prettier --write ${filtered.join(" ")}`];
  },
  "*.{json,md,yml,yaml}": ["prettier --write"],
};

