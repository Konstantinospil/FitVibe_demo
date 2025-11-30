#!/usr/bin/env node

/**
 * Script to update import paths in test files moved to tests/backend/
 * Converts relative imports to point to apps/backend/src/
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
  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      getAllTestFiles(filePath, fileList);
    } else if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function updateImportsInFile(filePath) {
  let content = readFileSync(filePath, "utf-8");
  const originalContent = content;
  
  // Calculate relative path from test file to source directory
  const testDir = dirname(filePath);
  const relativeToSource = relative(testDir, sourceDir).replace(/\\/g, "/");
  
  // Pattern to match: from "../something" or from "../../something" etc.
  // We need to resolve these relative to the test file location and convert to absolute path from source
  
  // Match import/require statements with relative paths
  content = content.replace(
    /from\s+["']((?:\.\.\/)+)([^"']+)["']/g,
    (match, dots, importPath) => {
      // Calculate the depth (number of ../)
      const depth = (dots.match(/\.\.\//g) || []).length;
      
      // Get the directory of the test file
      const testFileDir = dirname(filePath);
      
      // Resolve the import path relative to the test file
      const resolvedPath = resolve(testFileDir, dots + importPath);
      
      // Calculate relative path from resolved path to source directory
      let newRelative = relative(sourceDir, resolvedPath).replace(/\\/g, "/");
      
      // If the path is outside source, we need to go up first
      if (!newRelative.startsWith("..")) {
        newRelative = join(relativeToSource, newRelative).replace(/\\/g, "/");
      }
      
      // Ensure it starts with ./
      if (!newRelative.startsWith(".")) {
        newRelative = "./" + newRelative;
      }
      
      return `from "${newRelative}"`;
    }
  );
  
  // Also handle jest.mock() calls
  content = content.replace(
    /jest\.mock\(["']((?:\.\.\/)+)([^"']+)["']/g,
    (match, dots, importPath) => {
      const depth = (dots.match(/\.\.\//g) || []).length;
      const testFileDir = dirname(filePath);
      const resolvedPath = resolve(testFileDir, dots + importPath);
      let newRelative = relative(sourceDir, resolvedPath).replace(/\\/g, "/");
      
      if (!newRelative.startsWith("..")) {
        newRelative = join(relativeToSource, newRelative).replace(/\\/g, "/");
      }
      
      if (!newRelative.startsWith(".")) {
        newRelative = "./" + newRelative;
      }
      
      return `jest.mock("${newRelative}"`;
    }
  );
  
  if (content !== originalContent) {
    writeFileSync(filePath, content, "utf-8");
    console.log(`Updated imports in ${relative(rootDir, filePath)}`);
    return true;
  }
  return false;
}

// Get all test files
const testFiles = getAllTestFiles(testsDir);
console.log(`Found ${testFiles.length} test files to update`);

let updatedCount = 0;
for (const file of testFiles) {
  if (updateImportsInFile(file)) {
    updatedCount++;
  }
}

console.log(`\nUpdated ${updatedCount} files`);

