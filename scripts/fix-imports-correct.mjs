#!/usr/bin/env node

/**
 * Correct script to fix import paths in moved test files
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, dirname, relative, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const testsDir = join(rootDir, "tests", "backend");
const sourceDir = join(rootDir, "apps", "backend", "src");

function getAllTestFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      getAllTestFiles(filePath, fileList);
    } else if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function updateImportsInFile(filePath) {
  let content = readFileSync(filePath, "utf-8");
  const originalContent = content;

  const testFileDir = dirname(filePath);

  // Get relative path from tests/backend/ to this test file's directory
  // e.g., "modules/users" for tests/backend/modules/users/users.service.test.ts
  const relFromTestsBackend = relative(testsDir, testFileDir);

  // The old test file was at: apps/backend/src/{relFromTestsBackend}/__tests__/
  const oldTestDir = join(sourceDir, relFromTestsBackend, "__tests__");

  function resolveImport(dots, importPath) {
    // Resolve the import from the OLD test file location
    const targetAbsolute = resolve(oldTestDir, dots + importPath);

    // Now calculate relative path from NEW test file location to the target
    const newRelPath = relative(testFileDir, targetAbsolute).replace(/\\/g, "/");

    // Ensure it starts with ./
    return newRelPath.startsWith(".") ? newRelPath : "./" + newRelPath;
  }

  // Update import statements
  content = content.replace(/from\s+["']((?:\.\.\/)+)([^"']+)["']/g, (match, dots, importPath) => {
    return `from "${resolveImport(dots, importPath)}"`;
  });

  // Update jest.mock() calls
  content = content.replace(
    /jest\.mock\(["']((?:\.\.\/)+)([^"']+)["']/g,
    (match, dots, importPath) => {
      return `jest.mock("${resolveImport(dots, importPath)}"`;
    },
  );

  // Update require() calls
  content = content.replace(
    /require\(["']((?:\.\.\/)+)([^"']+)["']\)/g,
    (match, dots, importPath) => {
      return `require("${resolveImport(dots, importPath)}")`;
    },
  );

  if (content !== originalContent) {
    writeFileSync(filePath, content, "utf-8");
    return true;
  }
  return false;
}

const testFiles = getAllTestFiles(testsDir);
console.log(`Updating imports in ${testFiles.length} test files...\n`);

let count = 0;
for (const file of testFiles) {
  // Skip integration tests and contract tests (they already have correct paths)
  if (
    file.includes("integration") ||
    file.includes("contract") ||
    file.includes("migrations") ||
    file.includes("seeds")
  ) {
    continue;
  }

  if (updateImportsInFile(file)) {
    count++;
  }
}

console.log(`Updated ${count} files`);
