/**
 * pnpm install hook used to trim native dependencies that are not needed in CI/local dev.
 * jsdom declares an optional peer on the `canvas` package which has no prebuilt
 * binaries for modern Node versions on Windows. When pnpm auto-installs peers it
 * ends up trying to compile node-canvas, so we strip that peer at resolution time.
 */
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === "jsdom" && pkg.peerDependencies?.canvas) {
        delete pkg.peerDependencies.canvas;
      }
      if (pkg.name === "jsdom" && pkg.peerDependenciesMeta?.canvas) {
        delete pkg.peerDependenciesMeta.canvas;
      }

      return pkg;
    },
  },
};
