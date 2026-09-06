import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendDir = path.resolve(__dirname, "..");
const sourceDbDir = path.join(backendDir, "src", "db");
const distDbDir = path.join(backendDir, "dist", "db");

const runtimeDirectories = ["functions", "fixtures", "views", "triggers"];

for (const directory of runtimeDirectories) {
  const source = path.join(sourceDbDir, directory);
  const destination = path.join(distDbDir, directory);

  if (!fs.existsSync(source)) {
    continue;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, {
    recursive: true,
    force: true,
  });

  console.log(`Copied runtime DB assets: ${source} -> ${destination}`);
}

const frontendLocales = path.resolve(backendDir, "..", "frontend", "src", "i18n", "locales");
const runtimeLocales = path.join(distDbDir, "i18n-locales");

if (fs.existsSync(frontendLocales)) {
  fs.mkdirSync(path.dirname(runtimeLocales), { recursive: true });
  fs.cpSync(frontendLocales, runtimeLocales, {
    recursive: true,
    force: true,
  });
  console.log(`Copied runtime i18n assets: ${frontendLocales} -> ${runtimeLocales}`);
}
