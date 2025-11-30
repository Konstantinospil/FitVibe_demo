#!/usr/bin/env node

/**
 * Simple script to fix import paths: replace relative imports with paths to apps/backend/src/
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
  
  // Calculate path from test file to apps/backend/src
  // From tests/backend/modules/users/ to apps/backend/src/ is ../../../apps/backend/src/
  const pathToSource = relative(testFileDir, sourceDir).replace(/\\/g, "/");
  const sourcePrefix = pathToSource.startsWith("..") ? pathToSource : `../${pathToSource}`;
  
  function resolveImport(dots, importPath) {
    // Count how many ../ in dots
    const dotCount = (dots.match(/\.\.\//g) || []).length;
    
    // The old test file was in apps/backend/src/{path}/__tests__/
    // So if new test is at tests/backend/modules/users/, 
    // old was at apps/backend/src/modules/users/__tests__/
    const relFromTestsBackend = relative(testsDir, testFileDir);
    
    // Old test dir: apps/backend/src/{relFromTestsBackend}/__tests__/
    const oldTestDir = resolve(sourceDir, relFromTestsBackend, "__tests__");
    
    // Resolve import from old location
    const targetAbsolute = resolve(oldTestDir, dots + importPath);
    
    // Calculate relative from new location
    let newPath = relative(testFileDir, targetAbsolute).replace(/\\/g, "/");
    
    if (!newPath.startsWith(".")) {
      newPath = "./" + newPath;
    }
    
    return newPath;
  }
  
  // Update imports
  content = content.replace(
    /from\s+["']((?:\.\.\/)+)([^"']+)["']/g,
    (match, dots, importPath) => {
      const newPath = resolveImport(dots, importPath);
      return `from "${newPath}"`;
    }
  );
  
  // Update jest.mock
  content = content.replace(
    /jest\.mock\(["']((?:\.\.\/)+)([^"']+)["']/g,
    (match, dots, importPath) => {
      const newPath = resolveImport(dots, importPath);
      return `jest.mock("${newPath}"`;
    }
  );
  
  // Update require
  content = content.replace(
    /require\(["']((?:\.\.\/)+)([^"']+)["']\)/g,
    (match, dots, importPath) => {
      const newPath = resolveImport(dots, importPath);
      return `require("${newPath}")`;
    }
  );
  
  if (content !== originalContent) {
    writeFileSync(filePath, content, "utf-8");
    return true;
  }
  return false;
}

const testFiles = getAllTestFiles(testsDir);
console.log(`Updating ${testFiles.length} files...\n`);

let count = 0;
for (const file of testFiles) {
  if (updateImportsInFile(file)) {
    count++;
    if (count % 10 === 0) {
      process.stdout.write(".");
    }
  }
}

console.log(`\n\nUpdated ${count} files`);

