#!/usr/bin/env node

/**
 * Script to move test files and fix imports
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, copyFileSync } from "fs";
import { join, dirname, relative, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const sourceTestsDir = join(rootDir, "apps", "backend", "src");
const targetTestsDir = join(rootDir, "tests", "backend");

function getAllTestFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory() && file !== "node_modules" && file !== ".git") {
      getAllTestFiles(filePath, fileList);
    } else if (file.endsWith(".test.ts") && filePath.includes("__tests__")) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function fixImports(content, testFileDir, relFromTestsBackend) {
  const sourceDir = join(rootDir, "apps", "backend", "src");
  const oldTestDir = join(sourceDir, relFromTestsBackend, "__tests__");

  function resolveImport(dots, importPath) {
    // Resolve from old test location
    const targetAbsolute = resolve(oldTestDir, dots + importPath);

    // Calculate relative from new test location
    let newPath = relative(testFileDir, targetAbsolute).replace(/\\/g, "/");

    // Normalize the path (remove any ..// or similar issues)
    const parts = newPath.split("/");
    const normalized = [];
    for (const part of parts) {
      if (part === "..") {
        normalized.pop();
      } else if (part !== "." && part !== "") {
        normalized.push(part);
      }
    }
    newPath =
      normalized.length > 0 && !normalized[0].startsWith(".")
        ? "../".repeat(parts.filter((p) => p === "..").length) + normalized.join("/")
        : normalized.join("/");

    return newPath.startsWith(".") ? newPath : "./" + newPath;
  }

  // Update imports
  content = content.replace(
    /from\s+["']((?:\.\.\/)+)([^"']+)["']/g,
    (match, dots, importPath) => `from "${resolveImport(dots, importPath)}"`,
  );

  // Update jest.mock
  content = content.replace(
    /jest\.mock\(["']((?:\.\.\/)+)([^"']+)["']/g,
    (match, dots, importPath) => `jest.mock("${resolveImport(dots, importPath)}"`,
  );

  // Update require
  content = content.replace(
    /require\(["']((?:\.\.\/)+)([^"']+)["']\)/g,
    (match, dots, importPath) => `require("${resolveImport(dots, importPath)}")`,
  );

  return content;
}

// Find all test files in apps/backend/src
const testFiles = getAllTestFiles(sourceTestsDir);
console.log(`Found ${testFiles.length} test files to move\n`);

let moved = 0;
for (const oldPath of testFiles) {
  // Calculate new path: remove __tests__ from path
  const relFromSrc = relative(sourceTestsDir, oldPath);
  const newRelPath = relFromSrc.replace(/__tests__\//g, "");
  const newPath = join(targetTestsDir, newRelPath);

  // Create directory
  mkdirSync(dirname(newPath), { recursive: true });

  // Copy and fix imports
  let content = readFileSync(oldPath, "utf-8");
  const relFromTestsBackend = relative(targetTestsDir, dirname(newPath));
  content = fixImports(content, dirname(newPath), relFromTestsBackend);
  writeFileSync(newPath, content, "utf-8");

  moved++;
  if (moved % 10 === 0) {
    process.stdout.write(".");
  }
}

console.log(`\n\nMoved and fixed ${moved} test files`);
