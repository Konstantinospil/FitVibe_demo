#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = join(__dirname, "..");
const testsDir = join(rootDir, "tests", "backend");

const fixes = [
  // Fix services imports (missing /services/)
  [/(from\s+["']\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(tokens\.js["'])/g, "$1services/$2"],
  [
    /(from\s+["']\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(mailer\.service\.js["'])/g,
    "$1services/$2",
  ],
  [/(from\s+["']\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(vault\.client\.js["'])/g, "$1services/$2"],
  [/(from\s+["']\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(retention\.service["'])/g, "$1services/$2"],
  [/(from\s+["']\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(crypto\.service["'])/g, "$1services/$2"],
  [/(from\s+["']\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(antivirus\.service["'])/g, "$1services/$2"],

  // Fix jobs/services imports
  [
    /(from\s+["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/jobs\/)(queue\.factory\.js["'])/g,
    "$1services/$2",
  ],
  [
    /(from\s+["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/jobs\/)(queue\.service\.js["'])/g,
    "$1services/$2",
  ],
  [
    /(from\s+["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/jobs\/)(bullmq\.queue\.service\.js["'])/g,
    "$1services/$2",
  ],

  // Fix jest.mock for services
  [/(jest\.mock\(["']\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(tokens\.js["'])/g, "$1services/$2"],
  [
    /(jest\.mock\(["']\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(mailer\.service\.js["'])/g,
    "$1services/$2",
  ],
  [
    /(jest\.mock\(["']\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(vault\.client\.js["'])/g,
    "$1services/$2",
  ],
  [
    /(jest\.mock\(["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/jobs\/)(queue\.factory\.js["'])/g,
    "$1services/$2",
  ],
  [
    /(jest\.mock\(["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/jobs\/)(queue\.service\.js["'])/g,
    "$1services/$2",
  ],
  [
    /(jest\.mock\(["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/jobs\/)(bullmq\.queue\.service\.js["'])/g,
    "$1services/$2",
  ],

  // Fix db imports
  [/(from\s+["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(index\.js["'])/g, "$1db/$2"],
  [/(from\s+["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(db\.config\.js["'])/g, "$1db/$2"],
  [/(jest\.mock\(["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(index\.js["'])/g, "$1db/$2"],
  [
    /(jest\.mock\(["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(db\.config\.js["'])/g,
    "$1db/$2",
  ],

  // Fix seeds imports
  [
    /(from\s+["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/db\/)(001_roles\.js["'])/g,
    "$1seeds/$2",
  ],
  [
    /(from\s+["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/db\/)(002_genders\.js["'])/g,
    "$1seeds/$2",
  ],
  [
    /(from\s+["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/db\/)(003_fitness_levels\.js["'])/g,
    "$1seeds/$2",
  ],
  [
    /(from\s+["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/db\/)(004_exercise_types\.js["'])/g,
    "$1seeds/$2",
  ],

  // Fix config imports
  [/(from\s+["']\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(env\.js["'])/g, "$1config/$2"],
  [/(jest\.mock\(["']\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(env\.js["'])/g, "$1config/$2"],

  // Fix middlewares imports
  [/(from\s+["']\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(csrf\.js["'])/g, "$1middlewares/$2"],
  [/(from\s+["']\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(rate-limit\.js["'])/g, "$1middlewares/$2"],
  [/(jest\.mock\(["']\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(csrf\.js["'])/g, "$1middlewares/$2"],
  [
    /(jest\.mock\(["']\.\.\/\.\.\/\.\.\/apps\/backend\/src\/)(rate-limit\.js["'])/g,
    "$1middlewares/$2",
  ],

  // Fix modules paths
  [
    /(from\s+["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/modules\/)(admin\.service\.js["'])/g,
    "$1admin/$2",
  ],
  [
    /(from\s+["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/modules\/)(admin\.repository\.js["'])/g,
    "$1admin/$2",
  ],
  [
    /(jest\.mock\(["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/modules\/)(admin\.service\.js["'])/g,
    "$1admin/$2",
  ],
  [
    /(jest\.mock\(["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/modules\/)(admin\.repository\.js["'])/g,
    "$1admin/$2",
  ],

  // Fix verification-policy test requireActual path
  [
    /(jest\.requireActual<[^>]+>\(["'])(\.\.\/auth\.repository\.js["'])/g,
    "$1../../../../apps/backend/src/modules/auth/auth.repository.js$2",
  ],

  // Fix pending-2fa.repository import
  [
    /(from\s+["']\.\.\/\.\.\/\.\.\/\.\.\/apps\/backend\/src\/modules\/)(pending-2fa\.repository["'])/g,
    "$1auth/$2",
  ],
];

function getAllTestFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      getAllTestFiles(filePath, fileList);
    } else if (file.endsWith(".test.ts")) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const testFiles = getAllTestFiles(testsDir);
let fixed = 0;

for (const file of testFiles) {
  let content = readFileSync(file, "utf-8");
  let modified = false;

  for (const [pattern, replacement] of fixes) {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }

  if (modified) {
    writeFileSync(file, content, "utf-8");
    fixed++;
    console.log(`Fixed: ${file.replace(rootDir + "/", "")}`);
  }
}

console.log(`\nFixed ${fixed} test files`);
