export default {
  "*.{ts,tsx,js,jsx,cjs,mjs}": (filenames) => {
    // Filter out dist files and node_modules
    const filtered = filenames.filter(
      (f) => !f.includes("/dist/") && !f.includes("\\dist\\") && !f.includes("node_modules"),
    );
    if (filtered.length === 0) return [];
    // Quote filenames to handle spaces in paths
    const quoted = filtered.map((f) => `"${f}"`).join(" ");
    return [`eslint --fix ${quoted}`, `prettier --write ${quoted}`];
  },
  "*.{json,md,yml,yaml}": ["prettier --write"],
};
