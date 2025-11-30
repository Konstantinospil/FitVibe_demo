#!/usr/bin/env node

/**
 * Script to update import paths in test files moved to tests/backend/
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, dirname, relative, resolve, normalize } from "path";
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
  
  // Get the directory of the test file
  const testFileDir = dirname(filePath);
  
  // Calculate relative path from test file directory to apps/backend/src
  // From tests/backend/modules/users/ to apps/backend/src/ is ../../../apps/backend/src/
  const relToSource = relative(testFileDir, sourceDir).replace(/\\/g, "/");
  const sourcePrefix = relToSource.startsWith("..") ? relToSource : `../${relToSource}`;
  
  // Function to resolve a relative import path
  function resolveImport(dots, importPath) {
    // The original import was relative to the old location (apps/backend/src/.../__tests__/)
    // Example: from apps/backend/src/modules/users/__tests__/users.service.test.ts
    // Import: ../users.service.js
    // Resolves to: apps/backend/src/modules/users/users.service.js
    
    // Calculate the old test file directory
    // New: tests/backend/modules/users/users.service.test.ts
    // Old: apps/backend/src/modules/users/__tests__/users.service.test.ts
    const relFromTestsBackend = relative(testsDir, testFileDir);
    const oldTestDir = join(sourceDir, relFromTestsBackend, "__tests__");
    
    // Resolve the import from the old location to get the absolute target path
    const targetPath = resolve(oldTestDir, dots + importPath);
    
    // Now calculate relative path from new test file location to the target
    let newRelPath = relative(testFileDir, targetPath).replace(/\\/g, "/");
    
    // Ensure it starts with ./
    if (!newRelPath.startsWith(".")) {
      newRelPath = "./" + newRelPath;
    }
    
    return newRelPath;
  }
  
  // Update import statements: from "../../something" -> from "../../../apps/backend/src/something"
  content = content.replace(
    /from\s+["']((?:\.\.\/)+)([^"']+)["']/g,
    (match, dots, importPath) => {
      const newPath = resolveImport(dots, importPath);
      return `from "${newPath}"`;
    }
  );
  
  // Update jest.mock() calls
  content = content.replace(
    /jest\.mock\(["']((?:\.\.\/)+)([^"']+)["']/g,
    (match, dots, importPath) => {
      const newPath = resolveImport(dots, importPath);
      return `jest.mock("${newPath}"`;
    }
  );
  
  // Update require() calls
  content = content.replace(
    /require\(["']((?:\.\.\/)+)([^"']+)["']\)/g,
    (match, dots, importPath) => {
      const newPath = resolveImport(dots, importPath);
      return `require("${newPath}")`;
    }
  );
  
  if (content !== originalContent) {
    writeFileSync(filePath, content, "utf-8");
    const relPath = relative(rootDir, filePath);
    console.log(`Updated: ${relPath}`);
    return true;
  }
  return false;
}

// Get all test files
const testFiles = getAllTestFiles(testsDir);
console.log(`Found ${testFiles.length} test files to update\n`);

let updatedCount = 0;
for (const file of testFiles) {
  if (updateImportsInFile(file)) {
    updatedCount++;
  }
}

console.log(`\nUpdated ${updatedCount} of ${testFiles.length} files`);

